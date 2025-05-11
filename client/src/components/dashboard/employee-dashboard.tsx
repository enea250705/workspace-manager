import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatHours } from "@/lib/utils";
import { Link } from "wouter";

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
  
  // Calculate work stats
  const totalHoursThisWeek = myShifts.reduce((total: number, shift: any) => {
    if (shift.type === "work") {
      // Assuming startTime and endTime are in format "HH:MM"
      const [startHour, startMin] = shift.startTime.split(":").map(Number);
      const [endHour, endMin] = shift.endTime.split(":").map(Number);
      
      let hours = endHour - startHour;
      let minutes = endMin - startMin;
      
      if (minutes < 0) {
        hours -= 1;
        minutes += 60;
      }
      
      return total + hours + (minutes / 60);
    }
    return total;
  }, 0);
  
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
  
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-primary to-blue-600 text-white">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-2">Benvenuto, {user?.name}!</h2>
          <p className="opacity-90">Ecco un riepilogo dei tuoi turni e richieste.</p>
        </CardContent>
      </Card>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Ore Programmate</p>
                <p className="text-2xl font-medium">{formatHours(totalHoursThisWeek)}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <span className="material-icons text-primary">schedule</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Questa settimana
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Giorni Lavorativi</p>
                <p className="text-2xl font-medium">{workingDays}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <span className="material-icons text-success">event_available</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Su 7 giorni
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Richieste Ferie</p>
                <p className="text-2xl font-medium">{pendingRequests.length}</p>
              </div>
              <div className="bg-amber-100 p-2 rounded-lg">
                <span className="material-icons text-warning">pending_actions</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              In attesa di approvazione
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Upcoming Shifts */}
      <Card>
        <CardHeader className="border-b px-4 py-3 flex justify-between items-center">
          <CardTitle className="text-base font-medium">Prossimi Turni</CardTitle>
          <Link href="/my-schedule">
            <Button variant="link" size="sm" className="h-auto p-0">
              Vedi tutti
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-4">
          {!mySchedule || upcomingShifts.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              Nessun turno programmato
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingShifts.map(({ day, shifts }: any) => (
                <div key={day} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{day}</h3>
                    <div className="text-xs text-gray-500">
                      {formatHours(
                        shifts.reduce((total: number, shift: any) => {
                          if (shift.type === "work") {
                            const [startHour, startMin] = shift.startTime.split(":").map(Number);
                            const [endHour, endMin] = shift.endTime.split(":").map(Number);
                            
                            let hours = endHour - startHour;
                            let minutes = endMin - startMin;
                            
                            if (minutes < 0) {
                              hours -= 1;
                              minutes += 60;
                            }
                            
                            return total + hours + (minutes / 60);
                          }
                          return total;
                        }, 0)
                      )}
                    </div>
                  </div>
                  
                  {shifts.map((shift: any) => (
                    <div 
                      key={shift.id}
                      className={`p-2 mb-2 rounded-md ${
                        shift.type === "work" 
                          ? "bg-blue-50 border border-blue-100" 
                          : shift.type === "vacation"
                          ? "bg-red-50 border border-red-100"
                          : "bg-yellow-50 border border-yellow-100"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">
                            {shift.type === "work" 
                              ? `${shift.startTime} - ${shift.endTime}` 
                              : shift.type === "vacation"
                              ? "Ferie"
                              : "Permesso"}
                          </p>
                          {shift.area && (
                            <p className="text-xs text-gray-600">Area: {shift.area}</p>
                          )}
                        </div>
                        <span className="material-icons text-sm text-gray-400">
                          {shift.type === "work" 
                            ? "work" 
                            : shift.type === "vacation"
                            ? "beach_access"
                            : "time_to_leave"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Two-column layout for Time Off and Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time Off Requests */}
        <Card>
          <CardHeader className="border-b px-4 py-3 flex justify-between items-center">
            <CardTitle className="text-base font-medium">Le Mie Richieste</CardTitle>
            <Link href="/time-off">
              <Button variant="link" size="sm" className="h-auto p-0">
                Nuova Richiesta
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            {myTimeOffRequests.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                Nessuna richiesta effettuata
              </div>
            ) : (
              <div className="space-y-3">
                {myTimeOffRequests.slice(0, 3).map((request: any) => (
                  <div 
                    key={request.id}
                    className="border rounded-md p-3 flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center">
                        <span className={`material-icons text-sm mr-2 ${
                          request.status === "approved" 
                            ? "text-success" 
                            : request.status === "rejected"
                            ? "text-error"
                            : "text-warning"
                        }`}>
                          {request.status === "approved" 
                            ? "check_circle" 
                            : request.status === "rejected"
                            ? "cancel"
                            : "pending"}
                        </span>
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
                    <div className="text-xs">
                      <span className={`px-2 py-1 rounded-full ${
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Latest Documents */}
        <Card>
          <CardHeader className="border-b px-4 py-3 flex justify-between items-center">
            <CardTitle className="text-base font-medium">Documenti Recenti</CardTitle>
            <Link href="/my-documents">
              <Button variant="link" size="sm" className="h-auto p-0">
                Vedi tutti
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            {myDocuments.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                Nessun documento disponibile
              </div>
            ) : (
              <div className="space-y-3">
                {latestPayslip && (
                  <div className="border rounded-md p-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-red-100 p-1 rounded mr-3">
                        <span className="material-icons text-error">description</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Busta Paga - {latestPayslip.period}
                        </p>
                        <p className="text-xs text-gray-500">
                          Caricato il {formatDate(latestPayslip.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="flex items-center gap-1">
                      <span className="material-icons text-xs">download</span>
                      PDF
                    </Button>
                  </div>
                )}
                
                {latestTaxDoc && (
                  <div className="border rounded-md p-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-1 rounded mr-3">
                        <span className="material-icons text-primary">folder</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          CUD - {latestTaxDoc.period}
                        </p>
                        <p className="text-xs text-gray-500">
                          Caricato il {formatDate(latestTaxDoc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="flex items-center gap-1">
                      <span className="material-icons text-xs">download</span>
                      PDF
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Schedule Overview Notification */}
      {mySchedule && mySchedule.isPublished && (
        <Card className="bg-blue-50 border border-blue-200">
          <CardContent className="p-4 flex items-start">
            <span className="material-icons text-primary mr-3 mt-1">notifications</span>
            <div>
              <h3 className="font-medium mb-1">Orario Settimanale Pubblicato</h3>
              <p className="text-sm text-gray-700">
                Il tuo orario per la settimana {formatDate(mySchedule.startDate)} - {formatDate(mySchedule.endDate)} è stato pubblicato.
                Visualizzalo nella sezione "I Miei Turni".
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
