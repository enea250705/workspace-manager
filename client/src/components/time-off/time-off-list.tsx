import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function TimeOffList() {
  const { data: timeOffRequests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/time-off-requests"],
  });
  
  // Filtra le richieste per stato
  const pendingRequests = timeOffRequests.filter(req => req.status === "pending");
  const approvedRequests = timeOffRequests.filter(req => req.status === "approved");
  const rejectedRequests = timeOffRequests.filter(req => req.status === "rejected");
  
  // Funzione per formattare le date
  const formatDateRange = (startDate: string, endDate: string, duration: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (startDate === endDate) {
      let durationType = "";
      switch (duration) {
        case "morning":
          durationType = " (mattina)";
          break;
        case "afternoon":
          durationType = " (pomeriggio)";
          break;
        default:
          durationType = " (giornata intera)";
      }
      
      return format(start, "d MMMM yyyy", { locale: it }) + durationType;
    }
    
    return `${format(start, "d MMMM", { locale: it })} - ${format(end, "d MMMM yyyy", { locale: it })}`;
  };
  
  // Funzione per ottenere il tipo di richiesta in italiano
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "vacation":
        return "Ferie";
      case "personal":
        return "Permesso personale";
      case "sick":
        return "Malattia";
      default:
        return type;
    }
  };
  
  // Funzione per ottenere il badge di stato
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">In attesa</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Approvata</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Respinta</Badge>;
      default:
        return null;
    }
  };
  
  if (isLoading) {
    return (
      <Card className="bg-white animate-pulse">
        <CardHeader>
          <div className="h-6 w-36 bg-gray-200 rounded mb-3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-6 w-full bg-gray-200 rounded mb-3"></div>
          <div className="h-6 w-full bg-gray-200 rounded mb-3"></div>
          <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (timeOffRequests.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Le tue richieste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <span className="material-icons text-4xl mb-2">event_busy</span>
            <p>Non hai ancora inviato richieste di ferie o permessi.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Le tue richieste</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="all" className="flex-1">
              Tutte <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{timeOffRequests.length}</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">
              In attesa <span className="ml-1 text-xs bg-yellow-100 px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">
              Approvate <span className="ml-1 text-xs bg-green-100 px-2 py-0.5 rounded-full">{approvedRequests.length}</span>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1">
              Respinte <span className="ml-1 text-xs bg-red-100 px-2 py-0.5 rounded-full">{rejectedRequests.length}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <div className="space-y-4">
              {timeOffRequests.map(request => (
                <RequestCard 
                  key={request.id}
                  request={request}
                  formatDateRange={formatDateRange}
                  getTypeLabel={getTypeLabel}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="pending">
            <div className="space-y-4">
              {pendingRequests.length > 0 ? (
                pendingRequests.map(request => (
                  <RequestCard 
                    key={request.id}
                    request={request}
                    formatDateRange={formatDateRange}
                    getTypeLabel={getTypeLabel}
                    getStatusBadge={getStatusBadge}
                  />
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Non hai richieste in attesa.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="approved">
            <div className="space-y-4">
              {approvedRequests.length > 0 ? (
                approvedRequests.map(request => (
                  <RequestCard 
                    key={request.id}
                    request={request}
                    formatDateRange={formatDateRange}
                    getTypeLabel={getTypeLabel}
                    getStatusBadge={getStatusBadge}
                  />
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Non hai richieste approvate.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="rejected">
            <div className="space-y-4">
              {rejectedRequests.length > 0 ? (
                rejectedRequests.map(request => (
                  <RequestCard 
                    key={request.id}
                    request={request}
                    formatDateRange={formatDateRange}
                    getTypeLabel={getTypeLabel}
                    getStatusBadge={getStatusBadge}
                  />
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Non hai richieste respinte.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface RequestCardProps {
  request: any;
  formatDateRange: (startDate: string, endDate: string, duration: string) => string;
  getTypeLabel: (type: string) => string;
  getStatusBadge: (status: string) => JSX.Element | null;
}

function RequestCard({ request, formatDateRange, getTypeLabel, getStatusBadge }: RequestCardProps) {
  const createdAt = parseISO(request.createdAt);
  
  return (
    <div className="p-4 border rounded-md">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-medium">{getTypeLabel(request.type)}</div>
          <div className="text-sm text-gray-600">
            {formatDateRange(request.startDate, request.endDate, request.duration)}
          </div>
        </div>
        <div>{getStatusBadge(request.status)}</div>
      </div>
      
      {request.reason && (
        <div className="mt-2 text-sm text-gray-600">
          <div className="font-medium">Motivo:</div>
          <div>{request.reason}</div>
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        Richiesta inviata il {format(createdAt, "d MMMM yyyy, HH:mm", { locale: it })}
      </div>
    </div>
  );
}