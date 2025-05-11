import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date-utils";
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
      <RecentActivities />
      
      {/* Single column layout for Pending Approvals only */}
      <div className="grid grid-cols-1 gap-4">
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
