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
    toast({
      title: "Esportazione PDF",
      description: "Funzionalità in sviluppo. Sarà disponibile presto.",
    });
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
