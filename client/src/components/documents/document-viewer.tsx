import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";
import { downloadPDF } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DocumentViewer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  // Get payslips
  const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ["/api/documents", { type: "payslip" }],
  });
  
  // Get tax documents
  const { data: taxDocs = [], isLoading: taxDocsLoading } = useQuery({
    queryKey: ["/api/documents", { type: "tax_document" }],
  });
  
  // Get download history (in a real app, this would be fetched from the API)
  const downloadHistory = [
    {
      id: 1,
      documentName: "Busta Paga Maggio 2023",
      type: "Busta Paga",
      downloadDate: "10/06/2023 15:42",
      ip: "192.168.1.34",
    },
    {
      id: 2,
      documentName: "CUD 2022",
      type: "CUD",
      downloadDate: "25/03/2023 09:15",
      ip: "192.168.1.34",
    },
    {
      id: 3,
      documentName: "Busta Paga Aprile 2023",
      type: "Busta Paga",
      downloadDate: "08/05/2023 12:30",
      ip: "192.168.1.34",
    },
  ];
  
  // Filter payslips by year
  const filteredPayslips = payslips
    .filter((doc: any) => {
      if (selectedYear === "all") return true;
      
      // Extract year from period (assumes format "Month Year")
      const docYear = doc.period.split(" ").pop();
      return docYear === selectedYear;
    })
    .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  
  // Filter tax documents by year
  const filteredTaxDocs = taxDocs
    .filter((doc: any) => {
      if (selectedYear === "all") return true;
      return doc.period === selectedYear;
    })
    .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  
  // Get years from documents for dropdown
  const getYears = () => {
    const payslipYears = payslips.map((doc: any) => {
      const parts = doc.period.split(" ");
      return parts[parts.length - 1];
    });
    
    const taxDocYears = taxDocs.map((doc: any) => doc.period);
    
    const allYears = [...new Set([...payslipYears, ...taxDocYears])];
    
    return allYears.sort((a, b) => parseInt(b) - parseInt(a));
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payslips Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
            <CardTitle className="text-base font-medium">Le Mie Buste Paga</CardTitle>
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Anno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                {getYears().map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-4">
            {payslipsLoading ? (
              <div className="py-8 text-center">
                <span className="material-icons animate-spin text-primary">sync</span>
                <p className="mt-2 text-sm text-gray-500">Caricamento buste paga...</p>
              </div>
            ) : filteredPayslips.length === 0 ? (
              <div className="py-8 text-center">
                <span className="material-icons text-4xl text-gray-400">description_off</span>
                <p className="mt-2 text-gray-500">Nessuna busta paga disponibile</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPayslips.map((doc: any) => (
                  <div key={doc.id} className="border rounded p-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="material-icons text-error mr-2">description</span>
                      <div>
                        <p className="text-sm font-medium">{doc.period}</p>
                        <p className="text-xs text-gray-500">Caricato il {formatDate(doc.uploadedAt)}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleDownload(doc)}
                    >
                      <span className="material-icons text-xs">download</span>
                      PDF
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {filteredPayslips.length > 0 && filteredPayslips.length < payslips.length && (
              <div className="mt-3 flex justify-center">
                <Button 
                  variant="link" 
                  onClick={() => setSelectedYear("all")}
                  className="text-primary text-sm font-medium"
                >
                  Mostra tutti i documenti
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Tax Documents Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
            <CardTitle className="text-base font-medium">I Miei CUD</CardTitle>
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Anno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                {getYears().map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-4">
            {taxDocsLoading ? (
              <div className="py-8 text-center">
                <span className="material-icons animate-spin text-primary">sync</span>
                <p className="mt-2 text-sm text-gray-500">Caricamento CUD...</p>
              </div>
            ) : filteredTaxDocs.length === 0 ? (
              <div className="py-8 text-center">
                <span className="material-icons text-4xl text-gray-400">folder_off</span>
                <p className="mt-2 text-gray-500">Nessun CUD disponibile</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTaxDocs.map((doc: any) => (
                  <div key={doc.id} className="border rounded p-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="material-icons text-error mr-2">folder</span>
                      <div>
                        <p className="text-sm font-medium">CUD {doc.period}</p>
                        <p className="text-xs text-gray-500">Caricato il {formatDate(doc.uploadedAt)}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleDownload(doc)}
                    >
                      <span className="material-icons text-xs">download</span>
                      PDF
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Download History */}
      <Card>
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base font-medium">Cronologia Download</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {downloadHistory.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-icons text-4xl text-gray-400">history_toggle_off</span>
              <p className="mt-2 text-gray-500">Nessuna cronologia disponibile</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Documento</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-left">Data download</th>
                    <th className="px-4 py-2 text-left">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {downloadHistory.map((history) => (
                    <tr key={history.id}>
                      <td className="px-4 py-3">{history.documentName}</td>
                      <td className="px-4 py-3">{history.type}</td>
                      <td className="px-4 py-3">{history.downloadDate}</td>
                      <td className="px-4 py-3">{history.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
