import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";

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
];

const employeeItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", role: "all" },
  { href: "/my-schedule", label: "I Miei Turni", icon: "calendar_today", role: "employee" },
  { href: "/time-off", label: "Ferie e Permessi", icon: "beach_access", role: "employee" },
  { href: "/my-documents", label: "Documenti", icon: "description", role: "employee" },
];

export function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}) {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
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
  
  // Ascolta l'evento custom per aggiornare lo stato del menu da altri componenti
  useEffect(() => {
    const handleToggleMobileMenu = () => {
      setMobileMenuOpen(!mobileMenuOpen);
    };
    
    window.addEventListener('toggle-mobile-menu', handleToggleMobileMenu);
    return () => {
      window.removeEventListener('toggle-mobile-menu', handleToggleMobileMenu);
    };
  }, [mobileMenuOpen]);
  
  if (!isAuthenticated) {
    return null; // Don't show sidebar if not logged in
  }
  
  // Animazioni sidebar - più veloci
  const sidebarVariants = {
    hidden: { x: -300, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        duration: 0.15,
        mass: 0.8
      }
    }
  };

  // Animazioni per i menu items - più veloci
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03, // Più veloce, prima era 0.08
        when: "beforeChildren",
        duration: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { x: -15, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        duration: 0.1,
        mass: 0.8
      }
    }
  };

  // Animazione per overlay mobile - più veloce
  const mobileOverlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.12 } }
  };

  const createMenuItem = (item: SidebarItem, index: number) => {
    // Utilizza l'hook InView per animare gli elementi quando diventano visibili
    const [ref, inView] = useInView({
      triggerOnce: true,
      threshold: 0.1,
    });

    return (
      <motion.div
        ref={ref}
        key={item.href}
        variants={itemVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        custom={index}
        whileHover={{ scale: 1.03, backgroundColor: "rgba(243, 244, 246, 1)" }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "sidebar-item rounded-md mb-1",
          location === item.href && "bg-blue-50"
        )}
      >
        <Link 
          href={item.href} 
          onClick={() => setMobileMenuOpen(false)}
          className={cn(
            "flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700",
            location === item.href && "text-primary font-medium"
          )}
        >
          <span className={cn(
            "material-icons text-base sm:text-lg",
            location === item.href ? "text-primary" : "text-gray-500"
          )}>
            {item.icon}
          </span>
          <span>{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <motion.span 
              className="ml-auto bg-primary text-white text-[10px] sm:text-xs rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 15,
                repeat: 3,
                repeatType: "reverse",
                repeatDelay: 8
              }}
            >
              {item.badge}
            </motion.span>
          )}
        </Link>
      </motion.div>
    );
  };

  return (
    <>
      {/* Overlay scuro su mobile quando il menu è aperto */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={mobileOverlayVariants}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <motion.div 
        id="sidebar" 
        className={cn(
          "bg-white shadow-md w-full md:w-72 md:min-h-screen transition-all duration-300 flex flex-col overflow-hidden",
          mobileMenuOpen 
            ? "fixed h-screen z-50 inset-0" 
            : "h-auto md:flex hidden",
        )}
        variants={sidebarVariants}
        initial="hidden"
        animate={mobileMenuOpen ? "visible" : "hidden"}
        key={mobileMenuOpen ? "open" : "closed"}
      >
        <div className="p-4 sm:p-5 border-b flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <span className="material-icons text-primary text-xl sm:text-2xl">schedule</span>
            <h1 className="font-condensed text-xl sm:text-2xl font-bold text-primary">StaffSync</h1>
          </motion.div>
          <motion.button 
            id="mobile-menu-toggle" 
            onClick={toggleMobileMenu}
            className="md:hidden p-1.5 rounded-full hover:bg-gray-100"
            aria-label={mobileMenuOpen ? "Chiudi menu" : "Apri menu"}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="material-icons">{mobileMenuOpen ? "close" : "menu"}</span>
          </motion.button>
        </div>
        
        <motion.div 
          id="user-profile" 
          className="p-4 sm:p-5 border-b flex items-center space-x-3 sm:space-x-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          <motion.div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center shadow-md"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="material-icons text-white text-base sm:text-lg">person</span>
          </motion.div>
          <div>
            <p className="font-medium text-sm sm:text-base">{user?.name || "Utente"}</p>
            <p className="text-xs sm:text-sm text-gray-600">{user?.role === "admin" ? "Amministratore" : "Dipendente"}</p>
          </div>
        </motion.div>
        
        <motion.nav 
          className="flex-1 overflow-y-auto py-4 sm:py-5 px-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {user.role === "admin" && (
            <motion.div 
              id="admin-menu" 
              data-role="admin"
              variants={containerVariants}
            >
              <motion.p 
                className="px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 sm:mb-3"
                variants={itemVariants}
              >
                Amministrazione
              </motion.p>
              {adminItems.map((item, index) => createMenuItem(item, index))}
            </motion.div>
          )}
          
          {user.role === "employee" && (
            <motion.div 
              id="employee-menu" 
              data-role="employee"
              variants={containerVariants}
            >
              <motion.p 
                className="px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 sm:mb-3"
                variants={itemVariants}
              >
                Il Mio Account
              </motion.p>
              {employeeItems.map((item, index) => createMenuItem(item, index))}
            </motion.div>
          )}
        </motion.nav>
        
        <motion.div 
          className="p-4 sm:p-5 border-t"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button 
            onClick={logout}
            className="flex items-center space-x-2 text-sm sm:text-base text-gray-700 hover:text-primary transition-colors w-full rounded-md py-2 px-3 hover:bg-gray-100"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="material-icons text-base sm:text-lg">logout</span>
            <span>Logout</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
}
