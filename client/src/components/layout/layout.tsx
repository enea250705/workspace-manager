import { PropsWithChildren, useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBar } from "@/components/layout/notification-bar";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function Layout({ children }: PropsWithChildren) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  
  // Close mobile menu on location change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      
      <div className={cn(
        "flex-1 overflow-x-hidden",
        mobileMenuOpen && "hidden md:block"
      )}>
        <NotificationBar />
        
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
