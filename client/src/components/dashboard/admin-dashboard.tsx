import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, calculateTotalWorkHours, formatHours } from "@/lib/utils";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { RecentActivities } from "./recent-activities";

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
  
  const { data: allShifts = [] } = useQuery({
    queryKey: [`/api/schedules/${currentSchedule?.id}/shifts`],
    enabled: !!currentSchedule?.id,
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
  
  // Calcola il totale delle ore programmate utilizzando la funzione utility
  const totalScheduledHours = calculateTotalWorkHours(
    allShifts.filter((shift: any) => shift.type === "work")
  );

  // Weekly hours data for chart
  const shiftDistributionData = [
    { name: "Mattina", hours: 54 },
    { name: "Pomeriggio", hours: 48 },
    { name: "Sera", hours: 36 },
  ];
  
  // Pie chart colors
  const pieChartColors = ['#3b82f6', '#f97316', '#a855f7', '#10b981'];
  
  // Weekly hours data
  const weeklyHoursData = [
    { name: "Lun", hours: 42 },
    { name: "Mar", hours: 46 },
    { name: "Mer", hours: 44 },
    { name: "Gio", hours: 48 },
    { name: "Ven", hours: 50 },
    { name: "Sab", hours: 32 },
  ];
  
  // Monthly request data
  const monthlyRequestsData = [
    { name: "Gen", value: 4 },
    { name: "Feb", value: 6 },
    { name: "Mar", value: 8 },
    { name: "Apr", value: 5 },
    { name: "Mag", value: 9 },
  ];

  // Funzioni di utilità rimosse perché ora gestite dal componente RecentActivities

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
                <p className="text-2xl font-medium">{formatHours(totalScheduledHours)}</p>
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
      
      {/* Sezione grafici */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b p-4">
            <CardTitle className="text-base font-medium flex items-center">
              <span className="material-icons text-primary mr-2">pie_chart</span>
              Ore per Tipologia di Turno
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={shiftDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="hours"
                  nameKey="name"
                  label
                >
                  {shiftDistributionData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden"> 
          <CardHeader className="border-b p-4">
            <CardTitle className="text-base font-medium flex items-center">
              <span className="material-icons text-primary mr-2">bar_chart</span>
              Richieste per Mese
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRequestsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden col-span-1 md:col-span-2 lg:col-span-1"> 
          <CardHeader className="border-b p-4">
            <CardTitle className="text-base font-medium flex items-center">
              <span className="material-icons text-primary mr-2">trending_up</span>
              Ore Lavorate per Settimana
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="hours" stroke="#3b82f6" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <RecentActivities />
      
      {/* Single column layout for Pending Approvals only */}
      <div className="grid grid-cols-1 gap-4 mt-4">
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
      </div>
    </div>
  );
}
