import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useHealthCheck } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  CarFront, 
  Users, 
  Briefcase, 
  Wallet, 
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
    title: "Overview",
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
    title: "Messages",
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
          "flex items-center gap-3 px-3 py-2 text-[13px] transition-colors cursor-pointer group rounded-sm",
          isActive 
            ? "text-sidebar-primary font-medium" 
            : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        )}>
          <item.icon className={cn("w-4 h-4", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")} />
          {item.title}
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-3 py-2 text-[13px] transition-colors cursor-pointer group rounded-sm",
          isActive && !isOpen
            ? "text-sidebar-foreground font-medium" 
            : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        )}
      >
        <div className="flex items-center gap-3">
          <item.icon className={cn("w-4 h-4", (isActive && !isOpen) ? "text-sidebar-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")} />
          {item.title}
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground/40" /> : <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground/40" />}
      </button>
      
      {isOpen && (
        <div className="pl-9 pr-2 py-0.5 space-y-0.5">
          {item.children.map((child) => {
            const isChildItemActive = currentPath === child.href || (child.href !== "/" && currentPath.startsWith(child.href));
            return (
              <Link key={child.href} href={child.href}>
                <div className={cn(
                  "block px-3 py-1.5 text-[13px] transition-colors cursor-pointer rounded-sm border-l-2 -ml-[13px] pl-[11px]",
                  isChildItemActive
                    ? "text-sidebar-primary font-medium border-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground border-transparent hover:border-sidebar-foreground/20"
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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col md:flex-row w-full overflow-hidden font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-medium text-sm tracking-tight">
          <div className="w-6 h-6 rounded-sm bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
            W
          </div>
          UK On Wheels
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2">
          <Menu className="w-5 h-5 text-sidebar-foreground/80" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "bg-sidebar border-r border-sidebar-border w-full md:w-56 flex-shrink-0 transition-transform flex flex-col",
        isMobileMenuOpen ? "block" : "hidden md:flex",
        "fixed md:static inset-0 z-50 md:z-auto h-full"
      )}>
        <div className="h-14 flex items-center gap-2.5 px-4 font-medium text-sm tracking-tight text-white border-b border-sidebar-border">
          <div className="w-6 h-6 rounded-sm bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
            W
          </div>
          UK On Wheels
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map((item, index) => (
            <NavGroup key={index} item={item} currentPath={location} />
          ))}
        </div>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-sidebar-accent cursor-pointer transition-colors group">
            <div className="w-7 h-7 rounded-sm bg-sidebar-accent flex items-center justify-center border border-sidebar-border group-hover:border-sidebar-foreground/20">
              <span className="text-xs font-medium text-sidebar-foreground">JS</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[13px] font-medium text-white truncate">John Smith</p>
              <p className="text-[11px] text-sidebar-foreground/60 truncate">Ops Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Topbar */}
        <header className="h-14 bg-background border-b border-border flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex-1 flex items-center">
            <div className="relative w-full max-w-sm hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-9 pr-4 py-1.5 bg-muted/30 border-transparent focus:bg-background focus:border-border focus:ring-0 rounded-sm text-[13px] transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {health?.status === "ok" ? (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
                System OK
              </div>
            ) : null}
            <div className="h-4 w-px bg-border mx-1"></div>
            <button className="text-muted-foreground hover:text-foreground transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-destructive rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
