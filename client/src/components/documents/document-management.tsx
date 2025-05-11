import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { downloadPDF } from "@/lib/utils";

export function DocumentManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [documentType, setDocumentType] = useState("payslip");
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadFormData, setUploadFormData] = useState({
    type: "payslip",
    userId: "",
    period: "",
    file: null as File | null,
  });
  
  const documentsPerPage = 5;
  
  // Fetch documents and users
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/documents", { type: documentType }],
  });
  
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });
  
  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: any) => {
      // Read the file as base64
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(formData.file);
      });
      
      // Remove the data URL prefix
      const base64Data = fileData.split(',')[1];
      
      return apiRequest("POST", "/api/documents", {
        type: formData.type,
        userId: parseInt(formData.userId),
        period: formData.period,
        filename: formData.file.name,
        fileData: base64Data,
        uploadedBy: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsUploadDialogOpen(false);
      setUploadFormData({
        type: "payslip",
        userId: "",
        period: "",
        file: null,
      });
      toast({
        title: "Documento caricato",
        description: "Il documento è stato caricato con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento del documento.",
        variant: "destructive",
      });
    }
  });
  
  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: number) => apiRequest("DELETE", `/api/documents/${documentId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Documento eliminato",
        description: "Il documento è stato eliminato con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del documento.",
        variant: "destructive",
      });
    }
  });
  
  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if the file is a PDF
    if (file.type !== "application/pdf") {
      toast({
        title: "Formato non supportato",
        description: "Sono supportati solo file in formato PDF",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "La dimensione massima consentita è 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setUploadFormData({
      ...uploadFormData,
      file,
    });
  };
  
  // Handle form submission
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFormData.userId || !uploadFormData.period || !uploadFormData.file) {
      toast({
        title: "Dati mancanti",
        description: "Compila tutti i campi richiesti",
        variant: "destructive",
      });
      return;
    }
    
    uploadDocumentMutation.mutate(uploadFormData);
  };
  
  // Filter and sort documents
  const filteredDocuments = documents
    .filter((doc: any) => {
      const nameMatch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
      const periodMatch = periodFilter === "all" || doc.period === periodFilter;
      const userMatch = userFilter === "all" || doc.userId === parseInt(userFilter);
      
      return nameMatch && periodMatch && userMatch;
    })
    .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  
  // Paginate documents
  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * documentsPerPage,
    currentPage * documentsPerPage
  );
  
  // Generate period options
  const getPeriodOptions = () => {
    if (documentType === "payslip") {
      const periods = Array.from(new Set(documents
        .filter((doc: any) => doc.type === "payslip")
        .map((doc: any) => doc.period)
      )).sort().reverse();
      
      return [
        <SelectItem key="all" value="all">Tutti i mesi</SelectItem>,
        ...periods.map(period => (
          <SelectItem key={period} value={period}>{period}</SelectItem>
        ))
      ];
    } else {
      const years = Array.from(new Set(documents
        .filter((doc: any) => doc.type === "tax_document")
        .map((doc: any) => doc.period)
      )).sort().reverse();
      
      return [
        <SelectItem key="all" value="all">Tutti gli anni</SelectItem>,
        ...years.map(year => (
          <SelectItem key={year} value={year}>{year}</SelectItem>
        ))
      ];
    }
  };
  
  // Get user name by ID
  const getUserName = (userId: number) => {
    const user = users.find((u: any) => u.id === userId);
    return user ? user.name : "Utente sconosciuto";
  };
  
  // Handle document download
  const handleDownload = (document: any) => {
    try {
      downloadPDF(document.filename, document.fileData);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il download del documento.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-condensed font-medium">Gestione Documenti</h2>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <span className="material-icons text-sm">upload_file</span>
                Carica Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Carica Documento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="docType">Tipo Documento</Label>
                  <Select
                    value={uploadFormData.type}
                    onValueChange={(value) => setUploadFormData({
                      ...uploadFormData,
                      type: value,
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payslip">Busta Paga</SelectItem>
                      <SelectItem value="tax_document">CUD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="userId">Dipendente</Label>
                  <Select
                    value={uploadFormData.userId}
                    onValueChange={(value) => setUploadFormData({
                      ...uploadFormData,
                      userId: value,
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona dipendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter((u: any) => u.role === "employee")
                        .map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="period">Periodo</Label>
                  <Input
                    id="period"
                    placeholder={uploadFormData.type === "payslip" ? "Giugno 2023" : "2023"}
                    value={uploadFormData.period}
                    onChange={(e) => setUploadFormData({
                      ...uploadFormData,
                      period: e.target.value,
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="document">File (solo PDF)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      id="document-upload"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="document-upload"
                      className="cursor-pointer block"
                    >
                      {uploadFormData.file ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="material-icons text-primary">description</span>
                          <span className="text-sm">{uploadFormData.file.name}</span>
                        </div>
                      ) : (
                        <>
                          <span className="material-icons text-gray-400 text-4xl">upload_file</span>
                          <p className="text-sm text-gray-500 mt-2">Clicca per selezionare il file o trascina qui</p>
                          <p className="text-xs text-gray-400 mt-1">Massimo 5MB</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    type="submit"
                    disabled={
                      uploadDocumentMutation.isPending ||
                      !uploadFormData.userId ||
                      !uploadFormData.period ||
                      !uploadFormData.file
                    }
                  >
                    Carica
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Document Tabs */}
        <Tabs
          defaultValue="payslip"
          onValueChange={(value) => {
            setDocumentType(value);
            setCurrentPage(1);
            setPeriodFilter("all");
          }}
        >
          <TabsList className="mb-4 border-b w-full">
            <TabsTrigger value="payslip" className="flex-1">Buste Paga</TabsTrigger>
            <TabsTrigger value="tax_document" className="flex-1">CUD</TabsTrigger>
          </TabsList>
          
          <TabsContent value="payslip">
            {/* Payslip Content */}
            <DocumentList
              documents={paginatedDocuments}
              isLoading={isLoading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              periodFilter={periodFilter}
              setPeriodFilter={setPeriodFilter}
              userFilter={userFilter}
              setUserFilter={setUserFilter}
              users={users}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              totalDocuments={filteredDocuments.length}
              periodOptions={getPeriodOptions()}
              getUserName={getUserName}
              onDownload={handleDownload}
              onDelete={(id) => deleteDocumentMutation.mutate(id)}
              documentType="payslip"
            />
          </TabsContent>
          
          <TabsContent value="tax_document">
            {/* Tax Documents Content */}
            <DocumentList
              documents={paginatedDocuments}
              isLoading={isLoading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              periodFilter={periodFilter}
              setPeriodFilter={setPeriodFilter}
              userFilter={userFilter}
              setUserFilter={setUserFilter}
              users={users}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              totalDocuments={filteredDocuments.length}
              periodOptions={getPeriodOptions()}
              getUserName={getUserName}
              onDownload={handleDownload}
              onDelete={(id) => deleteDocumentMutation.mutate(id)}
              documentType="tax_document"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

type DocumentListProps = {
  documents: any[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  periodFilter: string;
  setPeriodFilter: (period: string) => void;
  userFilter: string;
  setUserFilter: (userId: string) => void;
  users: any[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  totalDocuments: number;
  periodOptions: React.ReactNode[];
  getUserName: (userId: number) => string;
  onDownload: (document: any) => void;
  onDelete: (id: number) => void;
  documentType: string;
};

function DocumentList({
  documents,
  isLoading,
  searchTerm,
  setSearchTerm,
  periodFilter,
  setPeriodFilter,
  userFilter,
  setUserFilter,
  users,
  currentPage,
  setCurrentPage,
  totalPages,
  totalDocuments,
  periodOptions,
  getUserName,
  onDownload,
  onDelete,
  documentType,
}: DocumentListProps) {
  return (
    <>
      {/* Document Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2">
              <span className="material-icons text-gray-400 text-sm">search</span>
            </span>
            <Input
              type="text"
              placeholder={`Cerca ${documentType === "payslip" ? "buste paga" : "CUD"}...`}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <div>
          <Select
            value={periodFilter}
            onValueChange={(value) => {
              setPeriodFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={documentType === "payslip" ? "Tutti i mesi" : "Tutti gli anni"} />
            </SelectTrigger>
            <SelectContent>
              {periodOptions}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select
            value={userFilter}
            onValueChange={(value) => {
              setUserFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Tutti i dipendenti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i dipendenti</SelectItem>
              {users
                .filter((u: any) => u.role === "employee")
                .map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Document List */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-8 text-center">
            <span className="material-icons animate-spin text-primary">sync</span>
            <p className="mt-2 text-sm text-gray-500">Caricamento documenti...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-8 text-center">
            <span className="material-icons text-4xl text-gray-400">folder_off</span>
            <p className="mt-2 text-gray-500">
              {searchTerm || periodFilter !== "all" || userFilter !== "all"
                ? "Nessun documento trovato con i filtri applicati"
                : `Nessun ${documentType === "payslip" ? "busta paga" : "CUD"} disponibile`}
            </p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Documento</th>
                <th className="px-4 py-2 text-left">Dipendente</th>
                <th className="px-4 py-2 text-left">Periodo</th>
                <th className="px-4 py-2 text-left">Dimensione</th>
                <th className="px-4 py-2 text-left">Caricato</th>
                <th className="px-4 py-2 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map((doc: any) => (
                <tr key={doc.id}>
                  <td className="px-4 py-3 flex items-center">
                    <span className="material-icons text-error mr-2">picture_as_pdf</span>
                    {documentType === "payslip"
                      ? `Busta Paga - ${doc.period}`
                      : `CUD - ${doc.period}`}
                  </td>
                  <td className="px-4 py-3">{getUserName(doc.userId)}</td>
                  <td className="px-4 py-3">{doc.period}</td>
                  <td className="px-4 py-3">
                    {/* Calculate size in KB, approx 4/3 of the base64 length */}
                    {Math.round((doc.fileData.length * 3) / 4 / 1024)} KB
                  </td>
                  <td className="px-4 py-3">{formatDate(doc.uploadedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDownload(doc)}
                    >
                      <span className="material-icons text-sm">download</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 ml-2"
                      onClick={() => onDelete(doc.id)}
                    >
                      <span className="material-icons text-sm">delete</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Pagination */}
      {totalDocuments > 0 && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Mostra {(currentPage - 1) * 5 + 1}-{Math.min(currentPage * 5, totalDocuments)} di {totalDocuments} documenti
          </div>
          <div className="flex space-x-1">
            <Button
              variant={currentPage === 1 ? "secondary" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Precedente
            </Button>
            
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              let pageNumber;
              
              if (totalPages <= 3) {
                pageNumber = i + 1;
              } else if (currentPage <= 2) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 1) {
                pageNumber = totalPages - 2 + i;
              } else {
                pageNumber = currentPage - 1 + i;
              }
              
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              );
            })}
            
            <Button
              variant={currentPage === totalPages ? "secondary" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Successivo
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
