import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiRequest } from "@/lib/queryClient";

export function AdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ["/api/time-off-requests"],
  });

  const { data: currentSchedule } = useQuery({
    queryKey: ["/api/schedules"],
  });

  const pendingRequests = timeOffRequests.filter(
    (req: any) => req.status === "pending"
  );

  // Mutations for approving/rejecting requests
  const approveMutation = useMutation({
    mutationFn: (requestId: number) =>
      apiRequest("POST", `/api/time-off-requests/${requestId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: number) =>
      apiRequest("POST", `/api/time-off-requests/${requestId}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
    },
  });

  // Current stats
  const activeEmployees = users.filter((user: any) => user.isActive).length;
  const employeesOnVacation = timeOffRequests.filter(
    (req: any) => req.status === "approved" && req.type === "vacation" && 
    new Date(req.endDate) >= new Date()
  ).length;

  // Weekly hours data for chart
  const shiftDistributionData = [
    { name: "Mattina", hours: 54 },
    { name: "Pomeriggio", hours: 48 },
    { name: "Sera", hours: 36 },
  ];

  // Example activities (would come from a real endpoint in production)
  const recentActivities = [
    {
      id: 1,
      type: "schedule_update",
      message: "Turno settimanale pubblicato",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: 2,
      type: "request_approved",
      message: "Approvata richiesta ferie",
      user: "Laura Bianchi",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: 3,
      type: "user_added",
      message: "Nuovo dipendente registrato",
      user: "Stefano Verdi",
      timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000), // 1.08 days ago
    },
    {
      id: 4,
      type: "document_upload",
      message: "Buste paga caricate nel sistema",
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    },
  ];

  const formatActivityTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours} ore fa`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Ieri";
      return `${diffDays} giorni fa`;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "schedule_update":
        return { icon: "event_available", bgColor: "bg-blue-100", textColor: "text-primary" };
      case "request_approved":
        return { icon: "check_circle", bgColor: "bg-green-100", textColor: "text-success" };
      case "user_added":
        return { icon: "person_add", bgColor: "bg-amber-100", textColor: "text-warning" };
      case "document_upload":
        return { icon: "upload_file", bgColor: "bg-purple-100", textColor: "text-purple-600" };
      default:
        return { icon: "info", bgColor: "bg-gray-100", textColor: "text-gray-600" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Dipendenti Attivi</p>
                <p className="text-2xl font-medium">{activeEmployees}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <span className="material-icons text-primary">people</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <span className="text-success">+2</span> rispetto al mese scorso
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Richieste in Attesa</p>
                <p className="text-2xl font-medium">{pendingRequests.length}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-lg">
                <span className="material-icons text-error">pending_actions</span>
              </div>
            </div>
            <div className="mt-4 text-xs flex items-center text-error">
              {pendingRequests.length > 0 ? (
                <>
                  <span className="material-icons text-xs mr-1">priority_high</span>
                  Richiesta urgente da approvare
                </>
              ) : (
                "Nessuna richiesta in attesa"
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Ore Programmate</p>
                <p className="text-2xl font-medium">186</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <span className="material-icons text-success">schedule</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Per questa settimana
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Dipendenti in Ferie</p>
                <p className="text-2xl font-medium">{employeesOnVacation}</p>
              </div>
              <div className="bg-amber-100 p-2 rounded-lg">
                <span className="material-icons text-warning">beach_access</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Questa settimana
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader className="border-b px-4 py-3 flex justify-between items-center">
          <CardTitle className="text-base font-medium">Attività Recenti</CardTitle>
          <Button variant="link" size="sm" className="h-auto p-0">
            Vedi tutte
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="divide-y">
            {recentActivities.map((activity) => {
              const { icon, bgColor, textColor } = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="py-3 flex items-start">
                  <div className={`${bgColor} p-1 rounded mr-3`}>
                    <span className={`material-icons text-sm ${textColor}`}>{icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      {activity.message}
                      {activity.user && (
                        <span className="font-medium"> {activity.user}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatActivityTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Approvals */}
        <Card>
          <CardHeader className="border-b px-4 py-3 flex justify-between items-center">
            <CardTitle className="text-base font-medium">Approvazioni in Attesa</CardTitle>
            <Link href="/requests">
              <Button variant="link" size="sm" className="h-auto p-0">
                Gestisci
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                Nessuna richiesta in attesa di approvazione
              </div>
            ) : (
              <div className="divide-y">
                {pendingRequests.slice(0, 3).map((request: any) => (
                  <div key={request.id} className="py-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {request.type === "vacation"
                            ? "Richiesta Ferie"
                            : request.type === "personal"
                            ? "Permesso Personale"
                            : "Cambio Turno"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Da:{" "}
                          <span className="font-medium">
                            {users.find((u: any) => u.id === request.userId)?.name || "Dipendente"}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Periodo: {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="icon"
                          variant="default"
                          className="h-6 w-6 bg-success"
                          onClick={() => approveMutation.mutate(request.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                          <span className="material-icons text-sm">check</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="default"
                          className="h-6 w-6 bg-error"
                          onClick={() => rejectMutation.mutate(request.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                          <span className="material-icons text-sm">close</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Weekly Overview */}
        <Card>
          <CardHeader className="border-b px-4 py-3 flex justify-between items-center">
            <CardTitle className="text-base font-medium">Panoramica Settimanale</CardTitle>
            <Link href="/schedule">
              <Button variant="link" size="sm" className="h-auto p-0">
                Pianifica
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">
                  Settimana: {currentSchedule ? (
                    <>
                      {formatDate(currentSchedule.startDate)} - {formatDate(currentSchedule.endDate)}
                    </>
                  ) : (
                    "Nessun turno pianificato"
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  Stato: {currentSchedule?.isPublished ? "Pubblicato" : "Bozza"}
                </p>
              </div>
              <Button size="sm" className="h-8 flex items-center gap-1">
                <span className="material-icons text-sm">download</span>
                PDF
              </Button>
            </div>
            
            {/* Coverage Overview */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Copertura Turni</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Mattina (4:00-12:00)</span>
                    <span>85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-success rounded-full h-2" style={{ width: "85%" }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Pomeriggio (12:00-18:00)</span>
                    <span>100%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-success rounded-full h-2" style={{ width: "100%" }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Sera (18:00-24:00)</span>
                    <span>75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-warning rounded-full h-2" style={{ width: "75%" }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-2 flex justify-between border-t">
              <Button variant="ghost" size="sm" className="h-auto p-1 text-primary flex items-center gap-1">
                <span className="material-icons text-sm">edit</span>
                <span className="text-sm">Modifica</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-auto p-1 text-primary flex items-center gap-1">
                <span className="material-icons text-sm">send</span>
                <span className="text-sm">Notifica</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Shift Distribution Chart */}
      <Card>
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base font-medium">Distribuzione Ore per Turno</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={shiftDistributionData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#1976D2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
