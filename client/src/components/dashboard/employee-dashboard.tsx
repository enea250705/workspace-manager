import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatHours, calculateTotalWorkHours } from "@/lib/utils";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { CardHoverEffect } from "@/components/ui/card-hover-effect";
import { AnimatedContainer } from "@/components/ui/animated-container";

export function EmployeeDashboard() {
  const { user } = useAuth();
  
  const { data: mySchedule } = useQuery({
    queryKey: ["/api/schedules"],
  });
  
  const { data: myShifts = [] } = useQuery({
    queryKey: [`/api/schedules/${mySchedule?.id}/shifts`],
    enabled: !!mySchedule?.id,
  });
  
  const { data: myTimeOffRequests = [] } = useQuery({
    queryKey: ["/api/time-off-requests"],
  });
  
  const { data: myDocuments = [] } = useQuery({
    queryKey: ["/api/documents"],
  });
  
  // Filter time off requests
  const pendingRequests = myTimeOffRequests.filter((req: any) => req.status === "pending");
  const approvedRequests = myTimeOffRequests.filter((req: any) => req.status === "approved");
  
  // Calcolo delle ore totali della settimana corrente utilizzando la funzione centralizzata
  const totalHoursThisWeek = calculateTotalWorkHours(
    myShifts.filter((shift: any) => shift.type === "work")
  );
  
  // Get day names for the week
  const getDayName = (date: string) => {
    const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    return days[new Date(date).getDay()];
  };
  
  // Group shifts by day
  const shiftsByDay = myShifts.reduce((acc: any, shift: any) => {
    if (!acc[shift.day]) {
      acc[shift.day] = [];
    }
    acc[shift.day].push(shift);
    return acc;
  }, {});
  
  const upcomingShifts = Object.entries(shiftsByDay)
    .slice(0, 2)
    .map(([day, shifts]) => ({ day, shifts }));
  
  // Get the number of working days
  const workingDays = Object.keys(shiftsByDay).length;
  
  // Get latest documents
  const latestPayslip = myDocuments
    .filter((doc: any) => doc.type === "payslip")
    .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
  
  const latestTaxDoc = myDocuments
    .filter((doc: any) => doc.type === "tax_document")
    .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
  
  // Varianti per le animazioni
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.1,
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  const statCardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: (custom: number) => ({ 
      scale: 1, 
      opacity: 1,
      transition: { 
        delay: custom * 0.1 + 0.2,
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    })
  };
  
  // Funzione per ottenere il colore di sfondo in base al tipo di turno
  const getShiftStyle = (type: string) => {
    switch (type) {
      case "work":
        return {
          bg: "bg-blue-50 border border-blue-100",
          icon: "work",
          iconColor: "text-blue-400"
        };
      case "vacation":
        return {
          bg: "bg-red-50 border border-red-100",
          icon: "beach_access",
          iconColor: "text-red-400"
        };
      case "leave":
        return {
          bg: "bg-yellow-50 border border-yellow-100",
          icon: "time_to_leave",
          iconColor: "text-yellow-500"
        };
      default:
        return {
          bg: "bg-gray-50 border border-gray-100",
          icon: "event_note",
          iconColor: "text-gray-400"
        };
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Banner */}
      <AnimatedContainer type="slide-up">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-blue-600 text-white">
            <CardContent className="p-6 relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold mb-2">Benvenuto, {user?.name}!</h2>
                <p className="opacity-90">Ecco un riepilogo dei tuoi turni e richieste.</p>
              </motion.div>
              
              {/* Elementi decorativi animati */}
              <motion.div 
                className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full"
                style={{ x: "30%", y: "-50%" }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, 0],
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity,
                  repeatType: "reverse" 
                }}
              />
              <motion.div 
                className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full"
                style={{ x: "-15%", y: "40%" }}
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -3, 0],
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: 1
                }}
              />
            </CardContent>
          </div>
        </Card>
      </AnimatedContainer>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          custom={0}
          variants={statCardVariants}
          initial="hidden"
          animate="visible"
        >
          <CardHoverEffect elevation="sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Ore Programmate</p>
                  <motion.p 
                    className="text-2xl font-medium bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                  >
                    {formatHours(totalHoursThisWeek)}
                  </motion.p>
                </div>
                <motion.div 
                  className="bg-blue-100 p-3 rounded-full shadow-md"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="material-icons text-primary">schedule</span>
                </motion.div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Questa settimana
              </div>
            </CardContent>
          </CardHoverEffect>
        </motion.div>
        
        <motion.div 
          custom={1}
          variants={statCardVariants}
          initial="hidden"
          animate="visible"
        >
          <CardHoverEffect elevation="sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Giorni Lavorativi</p>
                  <motion.p 
                    className="text-2xl font-medium bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                  >
                    {workingDays}
                  </motion.p>
                </div>
                <motion.div 
                  className="bg-green-100 p-3 rounded-full shadow-md"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="material-icons text-success">event_available</span>
                </motion.div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Su 7 giorni
              </div>
            </CardContent>
          </CardHoverEffect>
        </motion.div>
        
        <motion.div 
          custom={2}
          variants={statCardVariants}
          initial="hidden"
          animate="visible"
        >
          <CardHoverEffect elevation="sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Richieste Ferie</p>
                  <motion.p 
                    className="text-2xl font-medium bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7, duration: 0.4 }}
                  >
                    {pendingRequests.length}
                  </motion.p>
                </div>
                <motion.div 
                  className="bg-amber-100 p-3 rounded-full shadow-md"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="material-icons text-warning">pending_actions</span>
                </motion.div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                In attesa di approvazione
              </div>
            </CardContent>
          </CardHoverEffect>
        </motion.div>
      </div>
      
      {/* Upcoming Shifts */}
      <ScrollReveal>
        <Card className="shadow-md">
          <CardHeader className="border-b px-5 py-4 flex justify-between items-center bg-gray-50">
            <CardTitle className="text-base font-medium flex items-center">
              <span className="material-icons text-primary mr-2">today</span>
              Prossimi Turni
            </CardTitle>
            <Link href="/my-schedule">
              <Button variant="outline" size="sm" className="gap-1 shadow-sm">
                <span className="material-icons text-xs">visibility</span>
                Vedi tutti
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            {!mySchedule || upcomingShifts.length === 0 ? (
              <motion.div 
                className="text-center py-10 text-gray-500"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="material-icons text-gray-300 text-4xl mb-2">event_busy</span>
                <p>Nessun turno programmato</p>
              </motion.div>
            ) : (
              <motion.div 
                className="space-y-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {upcomingShifts.map(({ day, shifts }: any, index: number) => (
                  <motion.div 
                    key={day}
                    variants={itemVariants}
                    custom={index}
                    whileHover={{ scale: 1.01 }}
                  >
                    <Card className="border rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-primary/10 px-4 py-3 flex justify-between items-center">
                        <h3 className="font-medium flex items-center">
                          <span className="material-icons text-sm mr-2 text-primary">event</span>
                          {day}
                        </h3>
                        <div className="text-xs font-medium px-2 py-1 bg-white rounded-full shadow-sm">
                          {formatHours(calculateTotalWorkHours(shifts.filter((shift: any) => shift.type === "work")))}
                        </div>
                      </div>
                      
                      <div className="p-3 space-y-2">
                        {shifts.map((shift: any, shiftIndex: number) => {
                          const { bg, icon, iconColor } = getShiftStyle(shift.type);
                          return (
                            <motion.div 
                              key={shift.id}
                              className={`p-3 rounded-md ${bg} transition-all duration-200`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ 
                                opacity: 1, 
                                y: 0,
                                transition: { delay: 0.1 * shiftIndex + 0.2 }
                              }}
                              whileHover={{ 
                                scale: 1.02,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.05)" 
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium flex items-center">
                                    {shift.type === "work" 
                                      ? `${shift.startTime} - ${shift.endTime}` 
                                      : shift.type === "vacation"
                                      ? "Ferie"
                                      : "Permesso"}
                                  </p>
                                  {shift.area && (
                                    <p className="text-xs text-gray-600 mt-1">Area: {shift.area}</p>
                                  )}
                                </div>
                                <motion.span 
                                  className={`material-icons ${iconColor}`}
                                  whileHover={{ scale: 1.2, rotate: 10 }}
                                >
                                  {icon}
                                </motion.span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>
      
      {/* Two-column layout for Time Off and Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time Off Requests */}
        <ScrollReveal delay={0.2} direction="left">
          <Card className="shadow-md h-full">
            <CardHeader className="border-b px-5 py-4 flex justify-between items-center bg-gray-50">
              <CardTitle className="text-base font-medium flex items-center">
                <span className="material-icons text-amber-500 mr-2">beach_access</span>
                Le Mie Richieste
              </CardTitle>
              <Link href="/time-off">
                <Button variant="outline" size="sm" className="gap-1 shadow-sm">
                  <span className="material-icons text-xs">add</span>
                  Nuova
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {myTimeOffRequests.length === 0 ? (
                <motion.div 
                  className="text-center py-10 text-gray-500"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="material-icons text-gray-300 text-4xl mb-2">history_toggle_off</span>
                  <p>Nessuna richiesta effettuata</p>
                </motion.div>
              ) : (
                <motion.div 
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {myTimeOffRequests.slice(0, 3).map((request: any, index: number) => (
                    <motion.div 
                      key={request.id}
                      variants={itemVariants}
                      custom={index}
                    >
                      <CardHoverEffect className="border p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center">
                              <motion.span 
                                className={`material-icons text-sm mr-2 ${
                                  request.status === "approved" 
                                    ? "text-success" 
                                    : request.status === "rejected"
                                    ? "text-error"
                                    : "text-warning"
                                }`}
                                whileHover={{ scale: 1.2, rotate: 10 }}
                              >
                                {request.status === "approved" 
                                  ? "check_circle" 
                                  : request.status === "rejected"
                                  ? "cancel"
                                  : "pending"}
                              </motion.span>
                              <p className="text-sm font-medium">
                                {request.type === "vacation" 
                                  ? "Ferie" 
                                  : request.type === "personal"
                                  ? "Permesso Personale"
                                  : "Cambio Turno"}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(request.startDate)} - {formatDate(request.endDate)}
                            </p>
                          </div>
                          <motion.div 
                            className="text-xs"
                            whileHover={{ scale: 1.05 }}
                          >
                            <span className={`px-2 py-1 rounded-full shadow-sm ${
                              request.status === "approved" 
                                ? "bg-green-100 text-green-800" 
                                : request.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {request.status === "approved" 
                                ? "Approvata" 
                                : request.status === "rejected"
                                ? "Rifiutata"
                                : "In attesa"}
                            </span>
                          </motion.div>
                        </div>
                      </CardHoverEffect>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
        
        {/* Latest Documents */}
        <ScrollReveal delay={0.3} direction="right">
          <Card className="shadow-md h-full">
            <CardHeader className="border-b px-5 py-4 flex justify-between items-center bg-gray-50">
              <CardTitle className="text-base font-medium flex items-center">
                <span className="material-icons text-primary mr-2">description</span>
                Documenti Recenti
              </CardTitle>
              <Link href="/my-documents">
                <Button variant="outline" size="sm" className="gap-1 shadow-sm">
                  <span className="material-icons text-xs">visibility</span>
                  Vedi tutti
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {myDocuments.length === 0 ? (
                <motion.div 
                  className="text-center py-10 text-gray-500"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="material-icons text-gray-300 text-4xl mb-2">folder_off</span>
                  <p>Nessun documento disponibile</p>
                </motion.div>
              ) : (
                <motion.div 
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {latestPayslip && (
                    <motion.div variants={itemVariants}>
                      <CardHoverEffect 
                        className="border p-4"
                        glowColor="rgba(239, 68, 68, 0.5)"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <motion.div 
                              className="bg-red-100 p-2 rounded-full mr-3 shadow-sm"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                              <span className="material-icons text-error">description</span>
                            </motion.div>
                            <div>
                              <p className="text-sm font-medium">
                                Busta Paga - {latestPayslip.period}
                              </p>
                              <p className="text-xs text-gray-500">
                                Caricato il {formatDate(latestPayslip.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              className="flex items-center gap-1 shadow-sm"
                            >
                              <span className="material-icons text-xs">download</span>
                              PDF
                            </Button>
                          </motion.div>
                        </div>
                      </CardHoverEffect>
                    </motion.div>
                  )}
                  
                  {latestTaxDoc && (
                    <motion.div variants={itemVariants}>
                      <CardHoverEffect 
                        className="border p-4"
                        glowColor="rgba(59, 130, 246, 0.5)"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <motion.div 
                              className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                              <span className="material-icons text-primary">folder</span>
                            </motion.div>
                            <div>
                              <p className="text-sm font-medium">
                                CUD - {latestTaxDoc.period}
                              </p>
                              <p className="text-xs text-gray-500">
                                Caricato il {formatDate(latestTaxDoc.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              className="flex items-center gap-1 shadow-sm"
                            >
                              <span className="material-icons text-xs">download</span>
                              PDF
                            </Button>
                          </motion.div>
                        </div>
                      </CardHoverEffect>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
      
      {/* Schedule Overview Notification */}
      {mySchedule && mySchedule.isPublished && (
        <AnimatedContainer type="slide-up" delay={0.3}>
          <Card className="overflow-hidden border-none shadow-lg">
            <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-200">
              <CardContent className="p-4 relative overflow-hidden">
                <motion.div 
                  className="flex items-start relative z-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.span 
                    className="material-icons text-primary text-xl mr-3 mt-1"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 5, 0] 
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    notifications_active
                  </motion.span>
                  <div>
                    <h3 className="font-medium mb-1 text-lg text-primary">Orario Settimanale Pubblicato</h3>
                    <p className="text-sm text-gray-700">
                      Il tuo orario per la settimana {formatDate(mySchedule.startDate)} - {formatDate(mySchedule.endDate)} è stato pubblicato.
                      Visualizzalo nella sezione "I Miei Turni".
                    </p>
                  </div>
                </motion.div>
                
                {/* Background decorative elements */}
                <motion.div 
                  className="absolute right-0 top-0 w-32 h-32 rounded-full bg-blue-300/10"
                  style={{ x: "50%", y: "-50%" }}
                  animate={{
                    scale: [1, 1.1, 1],
                    x: ["50%", "45%", "50%"],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
              </CardContent>
            </div>
          </Card>
        </AnimatedContainer>
      )}
    </motion.div>
  );
}
