import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";

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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "Lead",
          email: firebaseUser.email || undefined,
          teamNumber: 955,
        };
        setUser(mappedUser);
        localStorage.setItem("frc-scout-user", JSON.stringify(mappedUser));
      } else {
        const saved = localStorage.getItem("frc-scout-user");
        if (saved) {
          setUser(JSON.parse(saved));
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (name: string, email?: string, password?: string) => {
    try {
      if (email && password) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const newUser: User = {
          id: Date.now().toString(),
          name,
          teamNumber: 955,
        };
        setUser(newUser);
        localStorage.setItem("frc-scout-user", JSON.stringify(newUser));
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (user?.email) {
        await signOut(auth);
      }
      setUser(null);
      localStorage.removeItem("frc-scout-user");
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
