import { 
  LayoutDashboard, 
  Users, 
  Trophy, 
  BarChart3, 
  Settings, 
  ClipboardList,
  Bot,
  Zap,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MobileSidebarContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "teams", label: "Teams", icon: Users },
  { id: "matches", label: "Matches", icon: Trophy },
  { id: "scouting", label: "Scouting", icon: ClipboardList },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const MobileSidebarContent = ({ activeTab, onTabChange }: MobileSidebarContentProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-foreground text-lg">FRC Scout</h1>
            <p className="text-xs text-muted-foreground">Dashboard v1.0</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search teams, matches, data..." className="pl-10" />
        </div>
      </div>

      <div
        className="flex-1 overflow-auto mt-2 px-4 pb-4 touch-pan-y"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <nav className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Main Menu
          </p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary/50",
                activeTab === item.id && "bg-secondary/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}

          <div className="mt-6 border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-foreground">System Status</span>
            </div>
            <div className="text-xs text-muted-foreground">All systems operational</div>
          </div>

          
        </nav>
      </div>

      
    </div>
  );
};

export default MobileSidebarContent;
