import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout/layout";
import { EmployeeScheduleViewer } from "@/components/schedule/employee-schedule-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { it } from "date-fns/locale";

export default function MySchedule() {
  const { user } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { locale: it }));
  
  // Fetch pubblicati per la settimana selezionata
  const { data: publishedSchedules = [], isLoading: isScheduleLoading } = useQuery<any[]>({
    queryKey: ["/api/schedules/published"],
    enabled: !!user,
  });
  
  // Trova lo schedule più recente che include la settimana selezionata
  const currentSchedule = publishedSchedules.find((schedule) => {
    const scheduleStart = new Date(schedule.startDate);
    const scheduleEnd = new Date(schedule.endDate);
    
    const selectedWeekEnd = addDays(selectedWeek, 6);
    
    // Verifica se c'è una sovrapposizione tra i periodi
    return (
      (selectedWeek >= scheduleStart && selectedWeek <= scheduleEnd) ||
      (selectedWeekEnd >= scheduleStart && selectedWeekEnd <= scheduleEnd) ||
      (selectedWeek <= scheduleStart && selectedWeekEnd >= scheduleEnd)
    );
  });
  
  // Fetch dei turni per lo schedule corrente
  const { data: allShifts = [], isLoading: isShiftsLoading } = useQuery<any[]>({
    queryKey: [`/api/schedules/${currentSchedule?.id}/shifts`],
    enabled: !!currentSchedule?.id,
  });
  
  // Filtra solo i turni dell'utente corrente
  const userShifts = allShifts.filter(shift => shift.userId === user?.id);
  
  // Gestisce il cambio settimana
  const handlePreviousWeek = () => {
    setSelectedWeek(subWeeks(selectedWeek, 1));
  };
  
  const handleNextWeek = () => {
    setSelectedWeek(addWeeks(selectedWeek, 1));
  };
  
  const handleCurrentWeek = () => {
    setSelectedWeek(startOfWeek(new Date(), { locale: it }));
  };
  
  if (isScheduleLoading || isShiftsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  // Formatta il range della settimana visualizzata
  const weekEnd = addDays(selectedWeek, 6);
  const weekRangeFormatted = `${format(selectedWeek, "d MMMM", { locale: it })} - ${format(weekEnd, "d MMMM yyyy", { locale: it })}`;
  
  return (
    <Layout>
      <div className="container py-6">
        <div className="flex flex-col space-y-6">
          {/* Intestazione della pagina */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">I Miei Turni</h1>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePreviousWeek}
              >
                <span className="material-icons text-sm">arrow_back</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCurrentWeek}
              >
                Oggi
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNextWeek}
              >
                <span className="material-icons text-sm">arrow_forward</span>
              </Button>
            </div>
          </div>
          
          {/* Visualizzazione della settimana corrente */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Settimana corrente</CardTitle>
              <div className="text-sm text-muted-foreground">
                {weekRangeFormatted}
              </div>
            </CardHeader>
            <CardContent>
              {publishedSchedules.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-icons text-gray-400 text-5xl mb-4">event_busy</span>
                  <h3 className="text-lg font-medium mb-2">Nessun turno pubblicato</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Non ci sono turni pubblicati per te in questo momento. 
                    L'amministratore pubblicherà presto i nuovi turni.
                  </p>
                </div>
              ) : !currentSchedule ? (
                <div className="text-center py-12">
                  <span className="material-icons text-gray-400 text-5xl mb-4">schedule</span>
                  <h3 className="text-lg font-medium mb-2">Nessun turno per questa settimana</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Non ci sono turni pubblicati per te in questa settimana.
                    Prova a selezionare un'altra settimana o contatta l'amministratore.
                  </p>
                </div>
              ) : (
                <EmployeeScheduleViewer 
                  schedule={currentSchedule}
                  shifts={allShifts}
                  userShifts={userShifts}
                />
              )}
            </CardContent>
          </Card>
          
          {/* Lista di tutti gli orari pubblicati */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Tutti i turni pubblicati</CardTitle>
            </CardHeader>
            <CardContent>
              {publishedSchedules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Nessun turno pubblicato al momento.
                  </p>
                </div>
              ) : (
                <Tabs defaultValue="upcoming">
                  <TabsList className="mb-4">
                    <TabsTrigger value="upcoming">Prossimi</TabsTrigger>
                    <TabsTrigger value="past">Passati</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upcoming">
                    <div className="space-y-4">
                      {publishedSchedules
                        .filter(schedule => new Date(schedule.endDate) >= new Date())
                        .map(schedule => (
                          <div 
                            key={schedule.id}
                            className="flex justify-between items-center p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedWeek(new Date(schedule.startDate));
                            }}
                          >
                            <div>
                              <div className="font-medium">
                                {format(new Date(schedule.startDate), "d MMMM", { locale: it })} - {format(new Date(schedule.endDate), "d MMMM yyyy", { locale: it })}
                              </div>
                              <div className="text-sm text-gray-500">
                                Pubblicato il {format(new Date(schedule.publishedAt), "d MMMM yyyy", { locale: it })}
                              </div>
                            </div>
                            <span className="material-icons text-gray-400">navigate_next</span>
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="past">
                    <div className="space-y-4">
                      {publishedSchedules
                        .filter(schedule => new Date(schedule.endDate) < new Date())
                        .map(schedule => (
                          <div 
                            key={schedule.id}
                            className="flex justify-between items-center p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedWeek(new Date(schedule.startDate));
                            }}
                          >
                            <div>
                              <div className="font-medium">
                                {format(new Date(schedule.startDate), "d MMMM", { locale: it })} - {format(new Date(schedule.endDate), "d MMMM yyyy", { locale: it })}
                              </div>
                              <div className="text-sm text-gray-500">
                                Pubblicato il {format(new Date(schedule.publishedAt), "d MMMM yyyy", { locale: it })}
                              </div>
                            </div>
                            <span className="material-icons text-gray-400">navigate_next</span>
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}