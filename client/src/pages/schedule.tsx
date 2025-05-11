import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { ScheduleBuilder } from "@/components/schedule/schedule-builder";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Date utilities
import { format, startOfWeek, addDays } from "date-fns";
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

  // Calculate end of week (Sunday)
  const endOfWeek = addDays(selectedWeek, 6);

  // Format date range for display
  const dateRangeText = `${format(selectedWeek, "d MMMM", { locale: it })} - ${format(
    endOfWeek,
    "d MMMM yyyy",
    { locale: it }
  )}`;

  // Fetch existing schedule data for the selected week
  const { data: existingSchedule, isLoading: isScheduleLoading } = useQuery({
    queryKey: ["/api/schedules", { startDate: format(selectedWeek, "yyyy-MM-dd") }],
  });

  // Fetch users for populating the schedule
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch shifts for the schedule if it exists
  const { data: shifts = [], isLoading: isShiftsLoading } = useQuery({
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
      toast({
        title: "Turni pubblicati",
        description: "La pianificazione è stata pubblicata con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la pubblicazione della pianificazione.",
        variant: "destructive",
      });
    },
  });

  // Handle auto-generate schedule
  const handleAutoGenerate = () => {
    toast({
      title: "Auto-generazione",
      description: "Funzionalità in sviluppo. Sarà disponibile presto.",
    });
  };

  // Handle publish schedule
  const handlePublish = () => {
    if (existingSchedule?.id) {
      publishScheduleMutation.mutate(existingSchedule.id);
    }
  };

  // Handle export PDF
  const handleExportPdf = () => {
    if (!existingSchedule) {
      toast({
        title: "Nessuna pianificazione",
        description: "Crea prima una pianificazione per poterla esportare in PDF.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Create content for PDF
      let pdfContent = `
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            h2 { font-size: 14px; margin-bottom: 5px; color: #666; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            th, td { border: 1px solid #ccc; padding: 5px; text-align: center; }
            .name-cell { text-align: left; font-weight: bold; width: 150px; }
            .notes-cell { width: 120px; }
            .total-cell { width: 60px; }
            .working { background-color: #e6f0ff; }
            .vacation { background-color: #ffe6e6; }
            .leave { background-color: #fff9e6; }
            .page-break { page-break-after: always; }
            .legend { margin: 10px 0; display: flex; }
            .legend-item { margin-right: 15px; display: flex; align-items: center; }
            .legend-color { width: 15px; height: 15px; display: inline-block; margin-right: 5px; border: 1px solid #ccc; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Pianificazione Turni</h1>
              <h2>Settimana: ${format(new Date(existingSchedule.startDate), "d MMMM", { locale: it })} - 
              ${format(new Date(existingSchedule.endDate), "d MMMM yyyy", { locale: it })}</h2>
            </div>
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
              
              // Create summary of shifts
              daySummary = userShifts.map((shift: any) => {
                const hours = calculateHoursFromShift(shift);
                userTotalHours += hours;
                
                if (shift.type === 'work') {
                  cellClass = 'working';
                  return `${shift.startTime}-${shift.endTime}`;
                } else if (shift.type === 'vacation') {
                  cellClass = 'vacation';
                  return 'Ferie';
                } else if (shift.type === 'leave') {
                  cellClass = 'leave';
                  return 'Permesso';
                }
                return '-';
              }).join('<br>');
            }
            
            pdfContent += `<td class="${cellClass}">${daySummary}</td>`;
          });
          
          // Add total hours
          pdfContent += `
            <td class="total-cell">${userTotalHours.toFixed(1)}</td>
          </tr>`;
        });
      
      pdfContent += `
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      // Open in a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Errore",
          description: "Impossibile aprire la finestra di stampa. Controlla che i popup siano abilitati.",
          variant: "destructive",
        });
        return;
      }
      
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // Give time for the page to load then print
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
      toast({
        title: "Esportazione PDF",
        description: "Il documento è stato generato per la stampa.",
      });
      
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'esportazione del PDF.",
        variant: "destructive",
      });
    }
  };
  
  // Calculate hours from a shift
  const calculateHoursFromShift = (shift: any) => {
    const startTimeParts = shift.startTime.split(':').map(Number);
    const endTimeParts = shift.endTime.split(':').map(Number);
    
    let hours = endTimeParts[0] - startTimeParts[0];
    let minutes = endTimeParts[1] - startTimeParts[1];
    
    if (minutes < 0) {
      hours -= 1;
      minutes += 60;
    }
    
    return hours + (minutes / 60);
  };

  // Create new schedule if none exists for the selected week
  const handleCreateSchedule = () => {
    createScheduleMutation.mutate({
      startDate: format(selectedWeek, "yyyy-MM-dd"),
      endDate: format(endOfWeek, "yyyy-MM-dd"),
      isPublished: false,
      createdBy: user?.id,
    });
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
        {isScheduleLoading || isUsersLoading || isShiftsLoading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <span className="material-icons text-primary animate-spin text-4xl">sync</span>
              <p className="mt-4 text-gray-600">Caricamento pianificazione...</p>
            </div>
          </div>
        ) : !existingSchedule ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <span className="material-icons text-gray-400 text-5xl mb-4">event_busy</span>
              <h3 className="text-lg font-medium mb-2">
                Nessuna pianificazione per la settimana {dateRangeText}
              </h3>
              <p className="text-gray-500 mb-6">
                Crea una nuova pianificazione per questa settimana per iniziare a gestire i turni.
              </p>
              <Button onClick={handleCreateSchedule} disabled={createScheduleMutation.isPending}>
                {createScheduleMutation.isPending ? (
                  <>
                    <span className="material-icons animate-spin mr-2">sync</span>
                    Creazione in corso...
                  </>
                ) : (
                  <>
                    <span className="material-icons mr-2">add</span>
                    Crea Pianificazione
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <ScheduleBuilder
            scheduleId={existingSchedule.id}
            users={users}
            startDate={new Date(existingSchedule.startDate)}
            endDate={new Date(existingSchedule.endDate)}
            shifts={shifts}
            isPublished={existingSchedule.isPublished}
            onPublish={handlePublish}
            onAutoGenerate={handleAutoGenerate}
            onExportPdf={handleExportPdf}
          />
        )}
      </div>
    </Layout>
  );
}
