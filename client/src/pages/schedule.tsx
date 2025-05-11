import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { ScheduleBuilder } from "@/components/schedule/schedule-builder";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WeekSelectorDialog } from "@/components/schedule/week-selector-dialog";
import { ScheduleAutoGenerator } from "@/components/schedule/auto-generator/auto-generator";

// Date utilities
import { format, startOfWeek, addDays, isBefore } from "date-fns";
import { it } from "date-fns/locale";

export default function Schedule() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    return startOfWeek(now, { weekStartsOn: 1 }); // Start week on Monday
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
    
    if (!isLoading && isAuthenticated && user?.role !== "admin") {
      navigate("/my-schedule");
    }
  }, [isLoading, isAuthenticated, navigate, user]);

  // State for custom date selection
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Calculate end of week (Sunday) - use custom dates if selected
  const startDateToUse = customStartDate || selectedWeek;
  const endOfWeek = customEndDate || addDays(selectedWeek, 6);

  // Format date range for display
  const dateRangeText = `${format(startDateToUse, "d MMMM", { locale: it })} - ${format(
    endOfWeek,
    "d MMMM yyyy",
    { locale: it }
  )}`;

  // Fetch existing schedule data for the selected week
  const { data: existingSchedule = {}, isLoading: isScheduleLoading } = useQuery<any>({
    queryKey: ["/api/schedules", { startDate: format(selectedWeek, "yyyy-MM-dd") }],
  });

  // Fetch users for populating the schedule
  const { data: users = [], isLoading: isUsersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch shifts for the schedule if it exists
  const { data: shifts = [], isLoading: isShiftsLoading } = useQuery<any[]>({
    queryKey: [`/api/schedules/${existingSchedule?.id}/shifts`],
    enabled: !!existingSchedule?.id,
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: (scheduleData: any) => apiRequest("POST", "/api/schedules", scheduleData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Turni creati",
        description: "La pianificazione è stata creata con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione della pianificazione.",
        variant: "destructive",
      });
    },
  });

  // Publish schedule mutation
  const publishScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) =>
      apiRequest("POST", `/api/schedules/${scheduleId}/publish`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/1/shifts"] });
    },
    onError: () => {
      toast({
        title: "Errore di pubblicazione",
        description: "Si è verificato un errore durante la pubblicazione della pianificazione.",
        variant: "destructive",
      });
    },
  });

  // State for showing auto-generate modal
  const [showAutoGenerator, setShowAutoGenerator] = useState(false);
  
  // State for showing schedule builder
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  
  // State for creating a new schedule
  const [creatingNewSchedule, setCreatingNewSchedule] = useState(false);
  
  // State for week selector dialog
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  
  // State for available schedules
  const { data: allSchedules = [] } = useQuery<any[]>({
    queryKey: ["/api/schedules/all"],
    enabled: user?.role === "admin",
  });
  
  // Handler per aprire il selettore settimane
  const handleChangeWeek = () => {
    setShowWeekSelector(true);
  };
  
  // Handler per selezionare una settimana specifica
  const handleSelectSchedule = (scheduleId: number) => {
    setShowWeekSelector(false);
    
    // Ottieni i dettagli della programmazione selezionata
    const selectedSchedule = allSchedules.find((s: any) => s.id === scheduleId);
    if (selectedSchedule) {
      // Aggiorna lo stato per mostrare la settimana selezionata
      setSelectedWeek(new Date(selectedSchedule.startDate));
      
      // Forza il ricaricamento dei dati
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}/shifts`] });
    }
  };
  
  // Handle publish schedule
  const handlePublish = () => {
    if (existingSchedule?.id) {
      // Pubblica immediatamente lo schedule
      publishScheduleMutation.mutate(existingSchedule.id);
      
      // Mostra un toast di successo solo all'amministratore
      toast({
        title: "Turni pubblicati con successo!",
        description: "La pianificazione è stata registrata nel sistema.",
        variant: "default",
      });
    }
  };
  
  // Handle new weekly schedule
  const handleNewWeeklySchedule = () => {
    // Imposta lo stato per la creazione di una nuova pianificazione
    setCreatingNewSchedule(true);
    
    // Imposta date predefinite per il nuovo calendario (a partire dalla prossima settimana)
    const nextWeekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7);
    setCustomStartDate(nextWeekStart);
    setCustomEndDate(addDays(nextWeekStart, 6));
    
    // Mostra il selettore di date per consentire all'utente di modificarle
    setShowDatePicker(true);
    
    // Forza il reset dello schedule esistente
    queryClient.removeQueries({ queryKey: ["/api/schedules"] });
  };

  // Handle auto-generate schedule
  const handleAutoGenerate = () => {
    // Se non ci sono date personalizzate, chiediamo di selezionarle
    if (!customStartDate || !customEndDate) {
      setShowDatePicker(true);
      return;
    }
    
    setShowAutoGenerator(true);
  };
  
  // Handle date change
  const handleDateChange = (type: 'start' | 'end', date: Date | null) => {
    if (type === 'start') {
      setCustomStartDate(date);
      // Se la data di fine non è impostata o è prima della nuova data di inizio,
      // impostiamo la data di fine a 6 giorni dopo la data di inizio
      if (!customEndDate || (date && isBefore(customEndDate, date))) {
        setCustomEndDate(date ? addDays(date, 6) : null);
      }
    } else {
      setCustomEndDate(date);
    }
  };
  
  // Create a new schedule
  const handleCreateSchedule = () => {
    if (!customStartDate || !customEndDate) {
      toast({
        title: "Date mancanti",
        description: "Seleziona una data di inizio e di fine per creare una pianificazione.",
        variant: "destructive",
      });
      return;
    }
    
    setShowDatePicker(false);
    
    // Show the schedule builder immediately
    setShowScheduleBuilder(true);
    
    // Se stiamo creando un nuovo schedule, rimuoviamo le query esistenti per evitare conflitti
    if (creatingNewSchedule) {
      queryClient.removeQueries({ queryKey: ["/api/schedules"] });
    }
    
    // Crea un nuovo schedule con date personalizzate
    const newScheduleData = {
      startDate: format(customStartDate, "yyyy-MM-dd"),
      endDate: format(customEndDate, "yyyy-MM-dd"),
      isPublished: false,
      createdBy: user?.id,
    };
    
    console.log("Creando nuovo schedule:", newScheduleData);
    
    // Create the schedule in the background
    createScheduleMutation.mutate(newScheduleData, {
      onSuccess: (response) => {
        console.log("Schedule creato con successo:", response);
        
        // Reset the creating new schedule flag
        setCreatingNewSchedule(false);
        
        // Refresh data
        if (customStartDate) {
          setSelectedWeek(customStartDate);
        }
        
        // Forza il refresh dei dati
        queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
        queryClient.invalidateQueries({ queryKey: ["/api/schedules/all"] });
        
        // Mostra messaggio di successo
        toast({
          title: "Pianificazione creata",
          description: "La nuova pianificazione è stata creata con successo",
        });
      },
      onError: (error) => {
        console.error("Errore nella creazione dello schedule:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante la creazione della pianificazione",
          variant: "destructive",
        });
      }
    });
  };

  // Handle PDF export
  const handleExportPdf = () => {
    if (!existingSchedule || !users || !shifts) return;
    
    // Create PDF content
    let pdfContent = `
      <html>
      <head>
        <title>Pianificazione Turni</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { display: flex; justify-content: space-between; }
          .working { background-color: #e6f7ff; }
          .vacation { background-color: #f6ffed; }
          .leave { background-color: #fff2e8; }
          .legend { margin: 10px 0; display: flex; gap: 15px; }
          .legend-item { display: flex; align-items: center; font-size: 12px; }
          .legend-color { display: inline-block; width: 16px; height: 16px; margin-right: 5px; border: 1px solid #ccc; }
          .name-cell { width: 150px; }
          .total-cell { width: 80px; }
        </style>
      </head>
      <body>
        <h1>Pianificazione Turni: ${format(new Date(existingSchedule.startDate), "d MMMM", { locale: it })} - ${format(new Date(existingSchedule.endDate), "d MMMM yyyy", { locale: it })}</h1>
        
        <div class="header">
          <div>
            <p>Data: ${format(new Date(), "dd/MM/yyyy")}</p>
            <p>Stato: ${existingSchedule.isPublished ? 'Pubblicato' : 'Bozza'}</p>
          </div>
        </div>
        
        <div class="legend">
          <div class="legend-item"><span class="legend-color working"></span> In servizio (X)</div>
          <div class="legend-item"><span class="legend-color vacation"></span> Ferie (F)</div>
          <div class="legend-item"><span class="legend-color leave"></span> Permesso (P)</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="name-cell">Dipendente</th>
              <th>Lunedì</th>
              <th>Martedì</th>
              <th>Mercoledì</th>
              <th>Giovedì</th>
              <th>Venerdì</th>
              <th>Sabato</th>
              <th>Domenica</th>
              <th class="total-cell">Totale Ore</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Add employee rows with shift summary
    users
      .filter((user: any) => user.role === "employee" && user.isActive)
      .forEach((user: any) => {
        let userTotalHours = 0;
        
        pdfContent += `
          <tr>
            <td class="name-cell">${user.name}</td>
        `;
        
        // Add days of week
        ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].forEach(day => {
          const userShifts = shifts.filter((s: any) => s.userId === user.id && s.day === day);
          let daySummary = '-';
          let cellClass = '';
          
          if (userShifts.length > 0) {
            // Sort shifts by start time
            userShifts.sort((a: any, b: any) => {
              return a.startTime.localeCompare(b.startTime);
            });
            
            // Get first and last shift
            const firstShift = userShifts[0];
            const lastShift = userShifts[userShifts.length - 1];
            
            // Determine shift type for cell color
            if (firstShift.type === 'work') {
              cellClass = 'working';
              daySummary = `${firstShift.startTime} - ${lastShift.endTime}`;
              
              // Calculate hours for this day
              let dayHours = 0;
              userShifts.forEach(shift => {
                const [startHour, startMin] = shift.startTime.split(":").map(Number);
                const [endHour, endMin] = shift.endTime.split(":").map(Number);
                
                let hours = endHour - startHour;
                let minutes = endMin - startMin;
                
                if (minutes < 0) {
                  hours -= 1;
                  minutes += 60;
                }
                
                dayHours += hours + (minutes / 60);
              });
              
              // Add to total
              userTotalHours += dayHours;
            } else if (firstShift.type === 'vacation') {
              cellClass = 'vacation';
              daySummary = 'Ferie';
            } else if (firstShift.type === 'leave') {
              cellClass = 'leave';
              daySummary = 'Permesso';
            }
          }
          
          pdfContent += `<td class="${cellClass}">${daySummary}</td>`;
        });
        
        // Add total hours
        pdfContent += `<td class="total-cell">${userTotalHours.toFixed(1)}</td></tr>`;
      });
    
    pdfContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    // Create a blob and download
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pianificazione_${format(new Date(existingSchedule.startDate), "yyyy-MM-dd")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <span className="material-icons text-primary animate-spin text-4xl">sync</span>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <WeekSelectorDialog 
          open={showWeekSelector}
          onOpenChange={setShowWeekSelector}
          schedules={allSchedules || []}
          onSelectSchedule={handleSelectSchedule}
        />
        
        {isScheduleLoading || isUsersLoading || isShiftsLoading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <span className="material-icons text-primary animate-spin text-4xl">sync</span>
              <p className="mt-4 text-gray-600">Caricamento pianificazione...</p>
            </div>
          </div>
        ) : showScheduleBuilder && !existingSchedule ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Pianificazione Turni: {dateRangeText}
              </h3>
              <div className="text-sm text-gray-500">
                In attesa di salvataggio...
              </div>
            </div>
            <ScheduleBuilder
              scheduleId={null}
              users={users || []}
              startDate={selectedWeek}
              endDate={endOfWeek}
              shifts={[]}
              isPublished={false}
              onPublish={() => {}}
              onAutoGenerate={() => {}}
              onExportPdf={handleExportPdf}
              onChangeWeek={handleChangeWeek}
            />
          </div>
        ) : existingSchedule ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Pianificazione Turni: {dateRangeText}
              </h3>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mr-2"
                  onClick={handleNewWeeklySchedule}
                >
                  <span className="material-icons text-sm mr-1">add</span>
                  Nuovo turno settimanale
                </Button>
              </div>
            </div>
            <ScheduleBuilder
              scheduleId={existingSchedule?.id || null}
              users={users || []}
              startDate={existingSchedule?.startDate ? new Date(existingSchedule.startDate) : selectedWeek}
              endDate={existingSchedule?.endDate ? new Date(existingSchedule.endDate) : endOfWeek}
              shifts={shifts || []}
              isPublished={existingSchedule?.isPublished || false}
              onPublish={handlePublish}
              onAutoGenerate={handleAutoGenerate}
              onExportPdf={handleExportPdf}
              onChangeWeek={handleChangeWeek}
            />
          </div>
        ) : (
          <div>
            {showDatePicker ? (
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle>Seleziona il periodo della pianificazione</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <Label className="mb-2 block">Data di inizio</Label>
                      <Calendar
                        mode="single"
                        selected={customStartDate || undefined}
                        onSelect={(date) => handleDateChange('start', date)}
                        disabled={(date) => 
                          date < new Date()
                        }
                        className="border border-gray-200 rounded-md"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        {customStartDate ? format(customStartDate, "EEEE d MMMM yyyy", { locale: it }) : "Seleziona una data"}
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Data di fine</Label>
                      <Calendar
                        mode="single"
                        selected={customEndDate || undefined}
                        onSelect={(date) => handleDateChange('end', date)}
                        disabled={(date) => 
                          !customStartDate || date < customStartDate
                        }
                        className="border border-gray-200 rounded-md"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        {customEndDate ? format(customEndDate, "EEEE d MMMM yyyy", { locale: it }) : "Seleziona una data"}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t px-6 py-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    onClick={handleCreateSchedule}
                    disabled={!customStartDate || !customEndDate}
                  >
                    Crea Pianificazione
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle>Pianificazione Turni</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <div className="mb-6">
                    <span className="material-icons text-primary text-6xl mb-4">calendar_month</span>
                    <h3 className="text-lg font-medium mb-2">Nessuna pianificazione attiva</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-8">
                      Non esiste ancora una pianificazione per la settimana corrente. Crea una nuova pianificazione per gestire i turni del personale.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={() => setShowDatePicker(true)}
                      className="flex items-center gap-2"
                    >
                      <span className="material-icons">add</span>
                      Crea Nuova Pianificazione
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleAutoGenerate}
                      className="flex items-center gap-2"
                    >
                      <span className="material-icons">auto_fix_high</span>
                      Genera Automaticamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      
      {/* Automatic Schedule Generator Dialog */}
      <Dialog open={showAutoGenerator} onOpenChange={setShowAutoGenerator}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Generazione Automatica Turni</DialogTitle>
          </DialogHeader>
          <ScheduleAutoGenerator
            startDate={customStartDate!}
            endDate={customEndDate!}
            users={users}
            onGenerateSuccess={() => {
              setShowAutoGenerator(false);
              queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}