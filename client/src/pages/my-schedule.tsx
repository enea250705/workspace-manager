import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { ScheduleViewer } from "@/components/schedule/schedule-viewer";
import { TimeOffRequest } from "@/components/requests/time-off-request";
import { useToast } from "@/hooks/use-toast";

export default function MySchedule() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Fetch the published schedule
  const { data: schedule, isLoading: isScheduleLoading } = useQuery({
    queryKey: ["/api/schedules"],
  });

  // Fetch shifts for the current user if schedule exists
  const { data: shifts = [], isLoading: isShiftsLoading } = useQuery({
    queryKey: [`/api/schedules/${schedule?.id}/shifts`],
    enabled: !!schedule?.id,
  });

  // Handle PDF download
  const handleDownloadPdf = () => {
    toast({
      title: "Download PDF",
      description: "Funzionalità in sviluppo. Sarà disponibile presto.",
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
        {isScheduleLoading || isShiftsLoading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <span className="material-icons text-primary animate-spin text-4xl">sync</span>
              <p className="mt-4 text-gray-600">Caricamento turni...</p>
            </div>
          </div>
        ) : (
          <ScheduleViewer 
            schedule={schedule} 
            shifts={shifts} 
            onDownloadPdf={handleDownloadPdf} 
          />
        )}
        
        <TimeOffRequest />
      </div>
    </Layout>
  );
}
