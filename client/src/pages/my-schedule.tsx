import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmployeeScheduleViewer } from "@/components/schedule/employee-schedule-viewer";
import { format, parseISO, addDays } from "date-fns";
import { it } from "date-fns/locale";

export default function MySchedule() {
  const { user } = useAuth();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  
  // Fetch all published schedules
  const { data: schedules = [], isLoading: isSchedulesLoading } = useQuery<any[]>({
    queryKey: ["/api/schedules/all"],
    select: (data) => {
      // Filtra solo pianificazioni pubblicate
      return data.filter((s) => s.isPublished).sort((a, b) => {
        // Ordina per data, i più recenti prima
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });
    },
  });
  
  // Trova l'ID della pianificazione più recente (se presente)
  const findLatestScheduleId = () => {
    if (schedules.length > 0 && !selectedScheduleId) {
      return schedules[0].id;
    }
    return selectedScheduleId;
  };
  
  // Aggiorna il selettore quando arrivano i dati
  useEffect(() => {
    if (schedules.length > 0 && !selectedScheduleId) {
      setSelectedScheduleId(schedules[0].id);
    }
  }, [schedules, selectedScheduleId]);
  
  // Seleziona la pianificazione attuale
  const currentScheduleId = findLatestScheduleId();
  
  // Trova la pianificazione selezionata
  const selectedSchedule = schedules.find(s => s.id === currentScheduleId);
  
  // Fetch dei turni per la pianificazione selezionata
  const { data: allShifts = [], isLoading: isShiftsLoading } = useQuery<any[]>({
    queryKey: [`/api/schedules/${currentScheduleId}/shifts`],
    enabled: !!currentScheduleId,
  });
  
  // Filtra solo i turni dell'utente corrente
  const userShifts = allShifts.filter(shift => shift.userId === user?.id);
  
  // Loading state
  if (isSchedulesLoading) {
    return (
      <Layout>
        <div className="py-6">
          <div className="container max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">I Miei Turni</h1>
            <Card>
              <CardContent className="p-8 flex justify-center items-center">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="mt-4 text-sm text-gray-600">Caricamento pianificazioni...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }
  
  // No published schedules
  if (schedules.length === 0) {
    return (
      <Layout>
        <div className="py-6">
          <div className="container max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">I Miei Turni</h1>
            <Card>
              <CardContent className="p-8">
                <div className="text-center py-8">
                  <span className="material-icons text-gray-400 text-5xl mb-4">event_busy</span>
                  <h3 className="text-lg font-medium mb-2">Nessun turno pubblicato</h3>
                  <p className="text-gray-500 mb-6">
                    Non ci sono turni pubblicati al momento. Controlla più tardi.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                  >
                    <span className="material-icons text-sm mr-1">refresh</span>
                    Aggiorna
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="py-6">
        <div className="container max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">I Miei Turni</h1>
            <div className="flex items-center space-x-2">
              <Label htmlFor="schedule-select" className="mr-2">
                Seleziona periodo:
              </Label>
              <Select
                value={currentScheduleId?.toString() || ""}
                onValueChange={(value) => setSelectedScheduleId(Number(value))}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Seleziona periodo" />
                </SelectTrigger>
                <SelectContent>
                  {schedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id.toString()}>
                      {format(new Date(schedule.startDate), "d MMM", { locale: it })} - {format(new Date(schedule.endDate), "d MMM yyyy", { locale: it })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isShiftsLoading ? (
            <Card>
              <CardContent className="p-8 flex justify-center items-center">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="mt-4 text-sm text-gray-600">Caricamento turni...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmployeeScheduleViewer
              schedule={selectedSchedule}
              shifts={allShifts}
              userShifts={userShifts}
            />
          )}
          
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Legenda turni</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-100 mr-2 border border-blue-300"></div>
                  <span>In servizio (X)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-100 mr-2 border border-red-300"></div>
                  <span>Ferie (F)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-100 mr-2 border border-yellow-300"></div>
                  <span>Permesso (P)</span>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="text-sm text-gray-500">
                <p>
                  <span className="font-medium text-gray-700">Nota:</span> I turni pubblicati sono visibili solo quando l'amministratore li rende disponibili.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}