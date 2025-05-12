import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
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
import { ExcelGrid } from "@/components/schedule/excel-grid";

// Date utilities
import { format, startOfWeek, addDays, isBefore, parseISO } from "date-fns";
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

    // Controlla se c'è un parametro newSchedule nell'URL, indicando che è stato creato un nuovo schedule
    const urlParams = new URLSearchParams(window.location.search);
    const newScheduleId = urlParams.get('newSchedule');
    const refreshed = urlParams.get('refreshed');
    
    // Se c'è un newScheduleId, forza l'app a caricare esplicitamente questo schedule
    if (newScheduleId) {
      console.log("Caricamento nuovo schedule specifico:", newScheduleId);
      
      // Segnala che stiamo caricando un nuovo schedule
      setIsLoadingNewSchedule(true);
      setForceResetGrid(true);
      
      // Passo 1: Svuota completamente la cache di React Query
      queryClient.clear();
      
      // Passo 2: Forza il caricamento solo dello schedule specificato tramite fetch diretto
      fetch(`/api/schedules/${newScheduleId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Impossibile caricare il nuovo schedule');
          }
          return response.json();
        })
        .then(scheduleData => {
          console.log("Schedule caricato con successo:", scheduleData);
          // Imposta il nuovo schedule direttamente nella cache
          queryClient.setQueryData(["/api/schedules"], scheduleData);
          
          // Aggiorna la data selezionata in base allo schedule caricato
          try {
            const startDate = parseISO(scheduleData.startDate);
            setSelectedWeek(startDate);
          } catch (e) {
            console.error("Errore nell'impostare la data di inizio:", e);
          }

          // Carica i turni vuoti per il nuovo schedule
          // Inizialmente non ci sono turni, quindi impostiamo un array vuoto
          queryClient.setQueryData([`/api/schedules/${newScheduleId}/shifts`], []);
          
          // Aggiorniamo anche la lista completa degli schedule
          queryClient.invalidateQueries({ queryKey: ["/api/schedules/all"] });
          
          // Completa il caricamento
          setIsLoadingNewSchedule(false);
          
          // Mostra un toast di conferma solo se l'URL include il parametro refreshed
          if (refreshed === 'true') {
            toast({
              title: "Nuova pianificazione pronta",
              description: "Puoi iniziare a compilare la tabella per questa settimana",
            });
          }
        })
        .catch(error => {
          console.error("Errore caricando lo schedule:", error);
          setIsLoadingNewSchedule(false);
          toast({
            title: "Errore",
            description: "Impossibile caricare il nuovo turno",
            variant: "destructive"
          });
        });
      
      // Rimuovi i parametri dall'URL per evitare ricaricamenti continui
      if (window.history.replaceState) {
        const dateParam = urlParams.get('date');
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + 
                     (dateParam ? '?date=' + dateParam : '');
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    }
  }, [isLoading, isAuthenticated, navigate, user, queryClient, toast]);

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
    staleTime: 0, // Disabilita la cache per questa query
    refetchOnWindowFocus: true, // Ricarica quando la finestra torna in focus
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
  
  // Fetch time-off requests for displaying on the schedule
  const { data: timeOffRequests = [], isLoading: isTimeOffLoading } = useQuery<any[]>({
    queryKey: ["/api/time-off-requests"],
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
      apiRequest("POST", `/api/schedules/${scheduleId}/publish`, { 
        scheduleId 
      }),
    onSuccess: () => {
      toast({
        title: "Turni pubblicati",
        description: "La pianificazione è stata pubblicata con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${existingSchedule?.id}/shifts`] });
    },
    onError: (err) => {
      console.error("Errore pubblicazione:", err);
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
  // Flag per il reset completo della griglia (per mostrare una tabella vuota dopo la creazione)
  const [forceResetGrid, setForceResetGrid] = useState(false);
  // Flag per stabilire se stiamo caricando uno schedule nuovo o esistente
  const [isLoadingNewSchedule, setIsLoadingNewSchedule] = useState(false);
  
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
    console.log("Creazione nuovo turno settimanale");
    
    // Resetta completamente lo stato
    setCreatingNewSchedule(true);
    setForceResetGrid(true);
    
    // Imposta date predefinite per il nuovo calendario (a partire dalla prossima settimana)
    const nextWeekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7);
    setCustomStartDate(nextWeekStart);
    setCustomEndDate(addDays(nextWeekStart, 6));
    setSelectedWeek(nextWeekStart);
    
    // Mostra il selettore di date per consentire all'utente di modificarle
    setShowDatePicker(true);
    
    // Forza il reset dell'esistente schedule (evita conflitti)
    queryClient.removeQueries({ queryKey: ["/api/schedules"] });
    
    toast({
      title: "Seleziona settimana",
      description: "Seleziona le date di inizio e fine per il nuovo turno settimanale",
    });
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
      // Usa una versione tipizzata di date
      const typedDate = date as Date | null;
      setCustomStartDate(typedDate);
      
      // Se la data di fine non è impostata o è prima della nuova data di inizio,
      // impostiamo la data di fine a 6 giorni dopo la data di inizio
      if (!customEndDate || (typedDate && isBefore(customEndDate, typedDate))) {
        setCustomEndDate(typedDate ? addDays(typedDate, 6) : null);
      }
    } else {
      setCustomEndDate(date as Date | null);
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
    
    console.log("Date selezionate:", { 
      startDate: format(customStartDate, "yyyy-MM-dd"), 
      endDate: format(customEndDate, "yyyy-MM-dd") 
    });
    
    // Nascondi il selettore di date
    setShowDatePicker(false);
    
    // Mostra il costruttore di pianificazione immediatamente
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
      onSuccess: async (response) => {
        try {
          // Converti la risposta in JSON per ottenere i dati
          const data = await response.json();
          console.log("Schedule creato con successo:", data);
          
          // Forza un completo reset dello stato e cambia la data selezionata
          setForceResetGrid(true);
          
          // Mostra una conferma che lo schedule è stato creato
          toast({
            title: "Nuova pianificazione creata",
            description: "Caricamento della nuova pianificazione in corso...",
          });
          
          // Attendiamo la registrazione nel database e usiamo la nostra nuova API speciale
          setTimeout(async () => {
            try {
              console.log("Caricamento del nuovo schedule pulito ID:", data.id);
              
              // Cancella prima tutti i dati di cache
              queryClient.clear();
              
              // Utilizza la nuova API speciale per ottenere uno schedule completamente vuoto
              const cleanScheduleResponse = await fetch(`/api/schedules/${data.id}/new`);
              
              if (!cleanScheduleResponse.ok) {
                throw new Error('Errore nel caricamento del nuovo turno');
              }
              
              const cleanSchedule = await cleanScheduleResponse.json();
              console.log("Schedule pulito ottenuto:", cleanSchedule);
              
              // Forza un refresh completo per essere sicuri
              window.location.href = `/schedule?date=${format(customStartDate!, "yyyy-MM-dd")}`;
            } catch (error) {
              console.error("Errore nel reset dello schedule:", error);
              toast({
                title: "Errore",
                description: "Si è verificato un errore nel caricamento del nuovo turno.",
                variant: "destructive"
              });
            }
          }, 800);
        } catch (err) {
          console.error("Errore nella gestione dello schedule:", err);
        }
      },
      onError: (error) => {
        console.error("Errore nella creazione dello schedule:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante la creazione della pianificazione",
          variant: "destructive",
        });
        setCreatingNewSchedule(false);
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
            <ExcelGrid
              scheduleId={null}
              users={users || []}
              startDate={selectedWeek}
              endDate={endOfWeek}
              shifts={[]}
              timeOffRequests={timeOffRequests || []}
              isPublished={false}
              onPublish={() => {}}
            />
          </div>
        ) : existingSchedule && !showDatePicker && !creatingNewSchedule ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Pianificazione Turni: {dateRangeText}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleChangeWeek}
                >
                  <span className="material-icons text-sm mr-1">history</span>
                  Cronologia turni
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewWeeklySchedule}
                >
                  <span className="material-icons text-sm mr-1">add</span>
                  Nuovo turno settimanale
                </Button>
              </div>
            </div>
            <ExcelGrid
              scheduleId={existingSchedule?.id || null}
              users={users || []}
              startDate={existingSchedule?.startDate ? new Date(existingSchedule.startDate) : selectedWeek}
              endDate={existingSchedule?.endDate ? new Date(existingSchedule.endDate) : endOfWeek}
              shifts={shifts || []}
              timeOffRequests={timeOffRequests || []}
              isPublished={existingSchedule?.isPublished || false}
              onPublish={handlePublish}
              forceResetGrid={forceResetGrid || isLoadingNewSchedule}
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
                        selected={customStartDate ?? undefined}
                        onSelect={(date: Date | undefined) => handleDateChange('start', date || null)}
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
                        selected={customEndDate ?? undefined}
                        onSelect={(date: Date | undefined) => handleDateChange('end', date || null)}
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
      {/* Dialog per generazione automatica */}
      <Dialog open={showAutoGenerator} onOpenChange={setShowAutoGenerator}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Generazione Automatica Turni</DialogTitle>
          </DialogHeader>
          <ScheduleAutoGenerator
            onScheduleGenerated={(scheduleData) => {
              setShowAutoGenerator(false);
              queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Dialog per selezionare una settimana dallo storico */}
      <WeekSelectorDialog
        open={showWeekSelector}
        onOpenChange={setShowWeekSelector}
        schedules={allSchedules}
        onSelectSchedule={handleSelectSchedule}
      />
    </Layout>
  );
}