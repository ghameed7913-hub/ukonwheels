import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useHealthCheck } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  CarFront, 
  Users, 
  Briefcase, 
  Wallet, 
  BarChart3, 
  UserCircle, 
  MessageSquare, 
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  Bell,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  icon: React.ElementType;
  href?: string;
  children?: { title: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Overview Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "Operations",
    icon: CarFront,
    children: [
      { title: "Bookings", href: "/bookings" },
      { title: "Drivers", href: "/drivers" },
    ]
  },
  {
    title: "Customers",
    icon: Briefcase,
    href: "/businesses"
  },
  {
    title: "Finance",
    icon: Wallet,
    href: "/accounts"
  },
  {
    title: "Company",
    icon: Users,
    children: [
      { title: "HR Records", href: "/hr" },
      { title: "Reports", href: "/reports" },
    ]
  },
  {
    title: "Communications",
    icon: MessageSquare,
    href: "/messages"
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings"
  }
];

function NavGroup({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const isChildActive = item.children?.some(child => currentPath.startsWith(child.href));
  const isActive = item.href ? currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href)) : isChildActive;
  const [isOpen, setIsOpen] = useState(isChildActive || false);

  if (!item.children) {
    return (
      <Link href={item.href || "#"}>
        <div className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer group",
          isActive 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}>
          <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground")} />
          {item.title}
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer group",
          isActive && !isOpen
            ? "text-sidebar-foreground" 
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          <item.icon className={cn("w-5 h-5", "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground")} />
          {item.title}
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-sidebar-foreground/50" /> : <ChevronRight className="w-4 h-4 text-sidebar-foreground/50" />}
      </button>
      
      {isOpen && (
        <div className="pl-11 pr-2 py-1 space-y-1">
          {item.children.map((child) => {
            const isChildItemActive = currentPath === child.href || (child.href !== "/" && currentPath.startsWith(child.href));
            return (
              <Link key={child.href} href={child.href}>
                <div className={cn(
                  "block px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isChildItemActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
                )}>
                  {child.title}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: health } = useHealthCheck();

  // Close mobile menu on navigate
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            W
          </div>
          UK On Wheels
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "bg-sidebar border-r border-sidebar-border w-full md:w-64 lg:w-72 flex-shrink-0 transition-transform flex flex-col",
        isMobileMenuOpen ? "block" : "hidden md:flex",
        "fixed md:static inset-0 z-50 md:z-auto h-full"
      )}>
        <div className="p-5 flex items-center gap-3 font-bold text-xl tracking-tight text-white border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            W
          </div>
          UK On Wheels
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item, index) => (
            <NavGroup key={index} item={item} currentPath={location} />
          ))}
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center border border-sidebar-border">
              <span className="text-sm font-semibold text-sidebar-foreground">JS</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">John Smith</p>
              <p className="text-xs text-sidebar-foreground/70 truncate">Operations Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex-1 flex items-center">
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search bookings, customers, or drivers..." 
                className="w-full pl-9 pr-4 py-2 bg-muted/50 border-transparent focus:bg-white focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-lg text-sm transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {health?.status === "ok" ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                System OK
              </div>
            ) : null}
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-white"></span>
            </button>
            <div className="h-8 w-px bg-border"></div>
            <button className="text-sm font-medium text-foreground hover:text-primary transition-colors hidden sm:block">
              Help & Support
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
