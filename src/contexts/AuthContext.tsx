import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { signInWithEmailAndPassword, signInAnonymously, signOut, updateProfile, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { setUserPresence, clearUserPresence, allocateAId, getOrCreateLocalId, removeUserCompletely, leaveQueue, setSuppressPresenceOnUnload, shouldSuppressPresenceOnUnload, removeUserLastActive, isNameInUse } from "@/lib/queue";

// Suppress automatic local-user sign-in after an explicit logout.
const SUPPRESS_AUTO_SIGNIN_KEY = "frc-scout-suppress-auto-signin";
const SUPPRESS_AUTO_SIGNIN_MS = 5000; // short window to avoid races across tabs
let _suppressAutoSignIn = false;
const setSuppressAutoSignIn = (v: boolean) => {
  _suppressAutoSignIn = !!v;
  try {
    if (v) {
      localStorage.setItem(SUPPRESS_AUTO_SIGNIN_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(SUPPRESS_AUTO_SIGNIN_KEY);
    }
  } catch (err) {
    /* ignore */
  }
};
const isSuppressAutoSignInRecent = () => {
  if (_suppressAutoSignIn) return true;
  try {
    const t = Number(localStorage.getItem(SUPPRESS_AUTO_SIGNIN_KEY) || "0");
    if (!t) return false;
    return Date.now() - t < SUPPRESS_AUTO_SIGNIN_MS;
  } catch (err) {
    return false;
  }
};

interface User {
  id: string;
  name: string;
  teamNumber: number;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  login: (name: string, email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "Lead",
          email: firebaseUser.email || undefined,
          teamNumber: 955,
        };
        setUser(mappedUser);
        localStorage.setItem("frc-scout-user", JSON.stringify(mappedUser));
        // register presence in DB
        setUserPresence(mappedUser).catch(console.error);
      } else {
        // If a recent explicit logout happened in this or another tab, DO NOT auto-migrate — prevents immediate re-login race
        if (isSuppressAutoSignInRecent()) {
          setLoading(false);
          return;
        }

        // If there's a locally saved (name-only) user, try to migrate to an anonymous Firebase user
        const saved = localStorage.getItem("frc-scout-user");
        if (saved) {
          const parsed = JSON.parse(saved) as User;
          try {
            const cred = await signInAnonymously(auth);
            if (cred?.user) {
              // set display name on anonymous account so presence/queue use a real uid
              await updateProfile(cred.user, { displayName: parsed.name }).catch(() => undefined);
              const migrated: User = {
                id: cred.user.uid,
                name: parsed.name,
                email: cred.user.email || undefined,
                teamNumber: parsed.teamNumber ?? 955,
              };
              setUser(migrated);
              localStorage.setItem("frc-scout-user", JSON.stringify(migrated));
              await setUserPresence(migrated);
            } else {
              // fallback to the old local behavior
              setUser(parsed);
              setUserPresence(parsed).catch(console.error);
            }
          } catch (err) {
            // anonymous auth might be disabled or fail — fall back to local user
            console.warn("Anonymous sign-in failed, using local user:", err);

            // Ensure the stored user has a usable id. Prefer A1..A25 when available.
            try {
              if (!parsed.id || !/^A(?:[1-9]|1\d|2[0-5])$/.test(parsed.id)) {
                const allocated = await allocateAId(parsed.name).catch(() => null);
                if (allocated) {
                  parsed.id = allocated;
                } else {
                  parsed.id = await getOrCreateLocalId(parsed.name);
                }
                localStorage.setItem("frc-scout-user", JSON.stringify(parsed));
              }
            } catch (e) {
              console.warn("failed to allocate A# id for saved local user", e);
              if (!parsed.id) parsed.id = await getOrCreateLocalId(parsed.name);
            }

            setUser(parsed);
            setUserPresence(parsed).catch(console.error);
          }
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const handler = () => {
      // if we've explicitly suppressed unload-presence (for example during logout), skip writing
      if (shouldSuppressPresenceOnUnload()) return;
      if (user?.id) {
        // best-effort: mark offline on unload (do NOT create lastActive when we're intentionally removing the user)
        clearUserPresence(user.id).catch(console.error);
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [user]);

  const login = async (name: string, email?: string, password?: string) => {
    try {
      // Prevent duplicate-name logins: check if the name is already active (exclude current auth uid when available)
      const currentAuthUid = auth.currentUser?.uid;

      // For email/password flow we check after sign-in so we can exclude the authenticated uid.
      if (email && password) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const signed = cred.user || auth.currentUser;
        const displayName = signed?.displayName || name;
        const conflict = await isNameInUse(displayName, signed?.uid);
        if (conflict) {
          // sign out the just-signed-in user to avoid leaving an authenticated session
          await signOut(auth).catch(() => undefined);
          throw new Error("That name is already logged in elsewhere.");
        }

        // proceed with normal mapped user setup
        const mapped: User = { id: signed!.uid, name: displayName, email: signed!.email || undefined, teamNumber: 955 };
        setUser(mapped);
        localStorage.setItem("frc-scout-user", JSON.stringify(mapped));
        await setUserPresence(mapped);
        return;
      }

      // NAME-ONLY flow: check for existing active name first
      const conflictPre = await isNameInUse(name, currentAuthUid);
      if (conflictPre) {
        const STALE_MS = 12 * 60 * 60 * 1000; // 12 hours — treat older entries as stale
        if (conflictPre.lastActive && Date.now() - conflictPre.lastActive > STALE_MS) {
          // best-effort: remove stale user so the new login can proceed
          try {
            await removeUserCompletely(conflictPre.userId);
          } catch (err) {
            console.warn("Failed to remove stale user during login; blocking instead", err);
            throw new Error("That name is already logged in elsewhere.");
          }
        } else {
          throw new Error("That name is already logged in elsewhere.");
        }
      }

      // NAME-ONLY flow: use Firebase Anonymous Auth when available so RTDB rules can require auth
      const current = auth.currentUser;
      if (current && current.isAnonymous) {
        // already anonymous — just set displayName
        await updateProfile(current, { displayName: name }).catch(() => undefined);
        const mapped: User = { id: current.uid, name, teamNumber: 955 };
        setUser(mapped);
        localStorage.setItem("frc-scout-user", JSON.stringify(mapped));
        await setUserPresence(mapped);
        return;
      }

      try {
        const cred = await signInAnonymously(auth);
        const anon = cred.user;
        if (anon) {
          await updateProfile(anon, { displayName: name }).catch(() => undefined);
          const mapped: User = {
            id: anon.uid,
            name,
            email: anon.email || undefined,
            teamNumber: 955,
          };
          setUser(mapped);
          localStorage.setItem("frc-scout-user", JSON.stringify(mapped));
          await setUserPresence(mapped);
          return;
        }
      } catch (err) {
        // anonymous auth failed (possibly disabled). fall back to local-only user to avoid blocking users.
        console.warn("Anonymous auth failed, falling back to local user:", err);
        // allocate an A1..A25 id (best-effort). If none available, fall back to `local:slug`.
        let allocatedId: string | null = null;
        try {
          allocatedId = await allocateAId(name);
        } catch (e) {
          console.warn("allocateAId failed, falling back to local slug", e);
        }

        const fallbackId = allocatedId || (await getOrCreateLocalId(name));
        const newUser: User = {
          id: fallbackId,
          name,
          teamNumber: 955,
        };
        setUser(newUser);
        localStorage.setItem("frc-scout-user", JSON.stringify(newUser));
        await setUserPresence(newUser);
        return;
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (user?.id) {
        // suppress automatic re-signin (this tab and other tabs) and prevent the unload handler
        setSuppressAutoSignIn(true);
        setSuppressPresenceOnUnload(true);

        // remove saved user *immediately* so onAuthStateChanged won't see it
        try {
          localStorage.removeItem("frc-scout-user");
        } catch (err) {
          /* ignore */
        }

        try {
          await removeUserCompletely(user.id);
        } catch (err) {
          console.warn("removeUserCompletely failed on logout — attempting targeted cleanup", err);
          // Don't call clearUserPresence here (that writes lastActive). Instead try to
          // remove the lastActive field and any queue entries. These are best-effort.
          try {
            await removeUserLastActive(user.id);
          } catch (er) {
            console.debug("removeUserLastActive also failed", er);
          }
          try {
            await leaveQueue(user.id);
          } catch (er) {
            console.debug("leaveQueue failed during logout cleanup", er);
          }
        } finally {
          // small delay to reduce races where other presence writers might run
          await new Promise((r) => setTimeout(r, 50));
          setSuppressPresenceOnUnload(false);
        }
      }

      // sign out any authenticated user (anonymous or email)
      if (auth.currentUser) {
        await signOut(auth);
      }

      setUser(null);

      // keep the suppress flag for a short window to avoid onAuthStateChanged races across tabs
      setTimeout(() => setSuppressAutoSignIn(false), 5000);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
