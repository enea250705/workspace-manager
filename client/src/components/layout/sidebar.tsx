import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type SidebarItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  role: "all" | "admin" | "employee";
};

const adminItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", role: "all" },
  { href: "/users", label: "Gestione Utenti", icon: "people", role: "admin" },
  { href: "/schedule", label: "Pianificazione Turni", icon: "event_note", role: "admin" },
  { href: "/requests", label: "Approvazioni", icon: "approval", badge: 0, role: "admin" },
  { href: "/documents", label: "Documenti", icon: "description", role: "admin" },
  { href: "/messages", label: "Messaggi", icon: "email", badge: 0, role: "admin" },
];

const employeeItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", role: "all" },
  { href: "/my-schedule", label: "I Miei Turni", icon: "calendar_today", role: "employee" },
  { href: "/time-off", label: "Ferie e Permessi", icon: "beach_access", role: "employee" },
  { href: "/my-documents", label: "Documenti", icon: "description", role: "employee" },
  { href: "/messages", label: "Messaggi", icon: "email", badge: 0, role: "employee" },
];

export function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [pendingRequests, setPendingRequests] = useState(0);
  
  // Update pending requests count
  useEffect(() => {
    if (user?.role === "admin") {
      // Fetch pending requests
      fetch("/api/time-off-requests", {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setPendingRequests(data.length);
            
            // Update badge for requests menu item
            adminItems.forEach(item => {
              if (item.href === "/requests") {
                item.badge = data.length;
              }
            });
          }
        })
        .catch((err) => console.error("Error fetching pending requests:", err));
    }
  }, [user]);
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  if (!user) {
    return null; // Don't show sidebar if not logged in
  }
  
  return (
    <div id="sidebar" className={cn(
      "bg-white shadow-md w-full md:w-64 md:min-h-screen transition-all flex flex-col",
      mobileMenuOpen ? "h-screen fixed z-50 inset-0" : "h-auto"
    )}>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="material-icons text-primary">schedule</span>
          <h1 className="font-condensed text-xl font-bold text-primary">StaffSync</h1>
        </div>
        <button 
          id="mobile-menu-toggle" 
          onClick={toggleMobileMenu}
          className="md:hidden"
          aria-label={mobileMenuOpen ? "Chiudi menu" : "Apri menu"}
        >
          <span className="material-icons">{mobileMenuOpen ? "close" : "menu"}</span>
        </button>
      </div>
      
      <div id="user-profile" className="p-4 border-b flex items-center space-x-3">
        <div className="bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center">
          <span className="material-icons text-gray-600">person</span>
        </div>
        <div>
          <p className="font-medium text-sm">{user.name}</p>
          <p className="text-xs text-gray-600">{user.role === "admin" ? "Amministratore" : "Dipendente"}</p>
        </div>
      </div>
      
      <nav className={cn(
        "flex-1 overflow-y-auto py-4",
        mobileMenuOpen ? "block" : "hidden md:block"
      )}>
        {user.role === "admin" && (
          <div id="admin-menu" data-role="admin">
            <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Amministrazione</p>
            {adminItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "sidebar-item flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100",
                  location === item.href && "active"
                )}
              >
                <span className="material-icons text-gray-500">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-primary text-white text-xs rounded-full px-2 py-1">{item.badge}</span>
                )}
              </Link>
            ))}
          </div>
        )}
        
        {user.role === "employee" && (
          <div id="employee-menu" data-role="employee">
            <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Il Mio Account</p>
            {employeeItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "sidebar-item flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100",
                  location === item.href && "active"
                )}
              >
                <span className="material-icons text-gray-500">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>
      
      <div className="p-4 border-t">
        <button 
          onClick={logout}
          className="flex items-center space-x-2 text-gray-700 hover:text-primary"
        >
          <span className="material-icons">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
