import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { CardHoverEffect } from "@/components/ui/card-hover-effect";

type Notification = {
  id: number;
  userId: number;
  type: string;
  message: string;
  isRead: boolean;
  data: any;
  createdAt: string;
};

export function NotificationBar() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });
  
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "Adesso";
    if (diffMins < 60) return `${diffMins} minuti fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays === 1) return "Ieri";
    return `${diffDays} giorni fa`;
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "schedule_update":
        return { icon: "schedule", bgColor: "bg-blue-100", textColor: "text-primary" };
      case "request_approved":
        return { icon: "check_circle", bgColor: "bg-green-100", textColor: "text-success" };
      case "request_rejected":
        return { icon: "cancel", bgColor: "bg-red-100", textColor: "text-error" };
      case "document_upload":
        return { icon: "description", bgColor: "bg-purple-100", textColor: "text-purple-600" };
      case "time_off_request":
        return { icon: "pending_actions", bgColor: "bg-amber-100", textColor: "text-amber-600" };
      case "shift_update":
        return { icon: "event_available", bgColor: "bg-blue-100", textColor: "text-primary" };
      default:
        return { icon: "notifications", bgColor: "bg-gray-100", textColor: "text-gray-600" };
    }
  };
  
  const handleNotificationClick = async (notification: Notification) => {
    // Mark notification as read
    if (!notification.isRead) {
      await apiRequest(
        "POST", 
        `/api/notifications/${notification.id}/mark-read`, 
        {}
      );
      
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
    
    // Navigate based on notification type
    if (notification.type === "schedule_update" || notification.type === "shift_update") {
      setLocation(user?.role === "admin" ? "/schedule" : "/my-schedule");
    } else if (notification.type === "time_off_request" || 
              notification.type === "request_approved" || 
              notification.type === "request_rejected") {
      setLocation(user?.role === "admin" ? "/requests" : "/time-off");
    } else if (notification.type === "document_upload") {
      setLocation(user?.role === "admin" ? "/documents" : "/my-documents");
    }
    
    setIsNotificationsOpen(false);
  };
  
  const markAllAsRead = async () => {
    await apiRequest("POST", "/api/notifications/mark-all-read", {});
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    setIsNotificationsOpen(false);
  };
  
  // Varianti di animazione per il titolo
  const titleVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: 10, transition: { duration: 0.2 } }
  };

  // Animazione per il contatore di notifiche
  const badgeVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    exit: { scale: 0, opacity: 0 }
  };

  // Animazione per le notifiche
  const notificationItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ 
      opacity: 1, 
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3
      }
    }),
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
  };

  // Determina il titolo della pagina corrente
  const getPageTitle = () => {
    if (location === "/" || location === "/dashboard") return "Dashboard";
    if (location === "/users") return "Gestione Utenti";
    if (location === "/schedule") return "Pianificazione Turni";
    if (location === "/requests") return "Approvazioni";
    if (location === "/documents") return "Documenti";
    if (location === "/my-schedule") return "I Miei Turni";
    if (location === "/time-off") return "Ferie e Permessi";
    if (location === "/my-documents") return "I Miei Documenti";
    return "StaffSync";
  };

  return (
    <motion.div 
      className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        <motion.h2 
          key={location} 
          className="font-condensed text-xl bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent"
          variants={titleVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {getPageTitle()}
        </motion.h2>
      </AnimatePresence>

      <div className="flex items-center space-x-4">
        <motion.div 
          className="relative"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.button 
            className="p-2 rounded-full hover:bg-gray-100 relative"
            onClick={() => setIsNotificationsOpen(true)}
            aria-label="Notifiche"
            whileTap={{ scale: 0.9 }}
          >
            <motion.span 
              className="material-icons text-gray-600"
              animate={{ 
                rotate: unreadCount > 0 ? [0, -10, 10, -10, 10, 0] : 0 
              }}
              transition={{ 
                duration: 0.5, 
                repeat: unreadCount > 0 ? Infinity : 0, 
                repeatDelay: 5 
              }}
            >
              notifications
            </motion.span>
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span 
                  className="absolute top-0 right-0 h-5 w-5 bg-primary text-white text-xs rounded-full flex items-center justify-center shadow-md"
                  variants={badgeVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
        
        <motion.button 
          className="p-2 rounded-full hover:bg-gray-100" 
          aria-label="Aiuto"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <span className="material-icons text-gray-600">help_outline</span>
        </motion.button>
      </div>
      
      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <DialogTitle>
                <span className="text-lg sm:text-xl flex items-center">
                  <span className="material-icons mr-2 text-primary">notifications</span>
                  Notifiche
                </span>
              </DialogTitle>
            </motion.div>
            <DialogClose />
          </DialogHeader>
          
          <motion.div 
            className="max-h-[60vh] overflow-y-auto pr-2 -mr-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatePresence>
              {notifications.length === 0 ? (
                <motion.div 
                  className="py-8 text-center text-gray-500 flex flex-col items-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="material-icons text-4xl mb-2 text-gray-300">notifications_off</span>
                  <p>Nessuna notifica</p>
                </motion.div>
              ) : (
                <div className="space-y-2 my-2">
                  {notifications.map((notification, index) => {
                    const { icon, bgColor, textColor } = getNotificationIcon(notification.type);
                    return (
                      <motion.div
                        key={notification.id}
                        custom={index}
                        variants={notificationItemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <CardHoverEffect
                          className={cn(
                            "border p-3 cursor-pointer", 
                            !notification.isRead && "border-primary-light"
                          )}
                          glowColor={!notification.isRead ? "rgba(59, 130, 246, 0.3)" : "rgba(209, 213, 219, 0.3)"}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start">
                            <div className={cn("p-2 rounded-full mr-3", bgColor)}>
                              <span className={cn("material-icons", textColor)}>{icon}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <p className={cn(
                                  "text-sm leading-snug", 
                                  !notification.isRead && "font-medium"
                                )}>
                                  {notification.message}
                                </p>
                                {!notification.isRead && (
                                  <span className="h-2 w-2 rounded-full bg-primary inline-block mr-1 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{getRelativeTime(notification.createdAt)}</p>
                            </div>
                          </div>
                        </CardHoverEffect>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {notifications.length > 0 && (
            <motion.div 
              className="mt-4 flex justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button 
                variant="outline" 
                onClick={markAllAsRead}
                className="text-primary font-medium shadow-sm border-primary/30 hover:bg-primary/5"
              >
                <span className="material-icons text-sm mr-1">done_all</span>
                Segna tutte come lette
              </Button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
