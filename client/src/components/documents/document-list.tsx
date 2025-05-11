import { useState } from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { downloadPDF } from "@/lib/utils";

export function DocumentList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [pdfPreviewData, setPdfPreviewData] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);
  
  // Carica documenti 
  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/documents"],
  });
  
  // Carica lista utenti per mostrare i nomi (solo per admin)
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin
  });
  
  // Filtra documenti per tipo
  const payslips = documents.filter(doc => doc.type === "payslip");
  const taxDocuments = documents.filter(doc => doc.type === "tax_document");
  
  // Ottiene il nome utente dalla userId
  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.name || `Utente #${userId}`;
  };
  
  // Funzione per ottenere il tipo documento in italiano
  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "payslip":
        return "Busta paga";
      case "tax_document":
        return "CUD / Documento fiscale";
      default:
        return type;
    }
  };
  
  // Funzione per aprire anteprima documento
  const handlePreview = (document: any) => {
    setPreviewDocument(document);
    setPdfPreviewData(document.fileData);
  };
  
  // Funzione per scaricare il documento
  const handleDownload = (document: any) => {
    downloadPDF(document.filename, document.fileData);
  };
  
  // Mutazione per eliminare un documento (solo admin)
  const deleteDocument = useMutation({
    mutationFn: (documentId: number) => {
      return apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Documento eliminato",
        description: "Il documento è stato eliminato con successo",
      });
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del documento",
        variant: "destructive",
      });
      setConfirmDeleteId(null);
    },
  });
  
  if (isLoading) {
    return (
      <Card className="bg-white animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-full bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            <div className="h-20 w-full bg-gray-200 rounded"></div>
            <div className="h-20 w-full bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (documents.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>I tuoi documenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <span className="material-icons text-4xl mb-2">description</span>
            <p>Non ci sono documenti disponibili al momento.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>
            {isAdmin ? "Gestione documenti" : "I tuoi documenti"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="payslips" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="payslips" className="flex-1">
                Buste paga <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{payslips.length}</span>
              </TabsTrigger>
              <TabsTrigger value="tax" className="flex-1">
                CUD <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{taxDocuments.length}</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="payslips">
              {payslips.length > 0 ? (
                <div className="space-y-4">
                  {payslips.map(doc => (
                    <DocumentItem 
                      key={doc.id}
                      document={doc}
                      isAdmin={isAdmin}
                      getUserName={getUserName}
                      onPreview={handlePreview}
                      onDownload={handleDownload}
                      onDelete={() => setConfirmDeleteId(doc.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Nessuna busta paga disponibile.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="tax">
              {taxDocuments.length > 0 ? (
                <div className="space-y-4">
                  {taxDocuments.map(doc => (
                    <DocumentItem 
                      key={doc.id}
                      document={doc}
                      isAdmin={isAdmin}
                      getUserName={getUserName}
                      onPreview={handlePreview}
                      onDownload={handleDownload}
                      onDelete={() => setConfirmDeleteId(doc.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Nessun documento fiscale disponibile.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Dialog conferma eliminazione */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
          </DialogHeader>
          <p>Sei sicuro di voler eliminare questo documento? Questa azione non può essere annullata.</p>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              className="w-full sm:w-auto"
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && deleteDocument.mutate(confirmDeleteId)}
              className="w-full sm:w-auto"
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending ? (
                <>
                  <span className="material-icons animate-spin mr-2">sync</span>
                  Eliminazione in corso...
                </>
              ) : (
                "Elimina"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog anteprima PDF */}
      <Dialog open={pdfPreviewData !== null} onOpenChange={() => setPdfPreviewData(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {previewDocument && (
                <>
                  {getDocumentTypeLabel(previewDocument.type)} - {previewDocument.period}
                  {isAdmin && <span className="font-normal ml-2">({getUserName(previewDocument.userId)})</span>}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 h-full overflow-hidden">
            {pdfPreviewData && (
              <iframe
                src={`data:application/pdf;base64,${pdfPreviewData}`}
                className="w-full h-full border rounded-md"
              />
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => previewDocument && handleDownload(previewDocument)}
              className="w-full sm:w-auto"
            >
              <span className="material-icons mr-2">download</span>
              Scarica PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DocumentItemProps {
  document: any;
  isAdmin: boolean;
  getUserName: (userId: number) => string;
  onPreview: (document: any) => void;
  onDownload: (document: any) => void;
  onDelete: () => void;
}

function DocumentItem({ document, isAdmin, getUserName, onPreview, onDownload, onDelete }: DocumentItemProps) {
  const uploadDate = parseISO(document.uploadedAt);
  
  return (
    <div className="p-4 border rounded-md">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium text-lg">
            {document.period}
            {isAdmin && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({getUserName(document.userId)})
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Caricato il {format(uploadDate, "d MMMM yyyy", { locale: it })}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600"
            onClick={() => onPreview(document)}
          >
            <span className="material-icons text-lg">visibility</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-green-600"
            onClick={() => onDownload(document)}
          >
            <span className="material-icons text-lg">download</span>
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={onDelete}
            >
              <span className="material-icons text-lg">delete</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}