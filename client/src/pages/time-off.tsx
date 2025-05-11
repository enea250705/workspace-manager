import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/layout";
import { TimeOffRequestForm } from "@/components/time-off/time-off-form";
import { TimeOffList } from "@/components/time-off/time-off-list";
import { TimeOffApproval } from "@/components/time-off/time-off-approval";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function TimeOff() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

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
      <div className="py-6">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Gestione ferie e permessi</h1>
            <p className="mt-1 text-sm text-gray-500">
              Richiedi, visualizza e gestisci le tue assenze dal lavoro.
            </p>
          </div>

          {isAdmin ? (
            <Tabs defaultValue="approve" className="w-full">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="approve" className="flex-1">Approvazioni</TabsTrigger>
                <TabsTrigger value="request" className="flex-1">Nuova richiesta</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">Cronologia personale</TabsTrigger>
              </TabsList>

              <TabsContent value="approve" className="space-y-6">
                <TimeOffApproval />
              </TabsContent>

              <TabsContent value="request" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TimeOffRequestForm />
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>Istruzioni</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                        <li>Seleziona il tipo di assenza che vuoi richiedere (ferie, permesso, malattia)</li>
                        <li>Indica la data di inizio e fine del periodo di assenza</li>
                        <li>Specifica se si tratta di una giornata intera o solo mezza giornata</li>
                        <li>Aggiungi una motivazione se necessario</li>
                        <li>Invia la richiesta e attendi l'approvazione</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <TimeOffList />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TimeOffRequestForm />
              <TimeOffList />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
