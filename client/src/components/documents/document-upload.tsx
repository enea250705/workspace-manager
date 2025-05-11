import { useState, useRef, ChangeEvent } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  type: z.string(),
  period: z.string().min(1, "Il periodo è obbligatorio"),
  userId: z.string().min(1, "Seleziona un dipendente"),
  file: z.any().refine((file) => file instanceof File, "Seleziona un file PDF")
});

export function DocumentUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Carica lista utenti per il menu a tendina
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    select: (data) => data.filter(user => user.isActive)
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "payslip",
      period: "",
      userId: "",
    },
  });
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      form.setValue("file", file);
    }
  };
  
  const resetFileInput = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    form.setValue("file", null);
  };
  
  // Funzione per convertire un file in base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Rimuove la parte 'data:application/pdf;base64,' dall'inizio
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Impossibile convertire il file in base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };
  
  const uploadDocument = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const { file, ...rest } = data;
      const fileData = await fileToBase64(file);
      
      // Crea un nome file basato sul tipo e periodo
      const fileName = `${data.type === "payslip" ? "BustaPaga" : "CUD"}_${data.period.replace(/[\/\\:*?"<>|]/g, "_")}.pdf`;
      
      return apiRequest("POST", "/api/documents", {
        ...rest,
        userId: parseInt(data.userId),
        filename: fileName,
        fileData
      });
    },
    onSuccess: () => {
      toast({
        title: "Documento caricato",
        description: "Il documento è stato caricato con successo",
      });
      
      // Reset del form e del file
      form.reset({
        type: "payslip",
        period: "",
        userId: "",
      });
      resetFileInput();
      
      // Invalida la cache dei documenti
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento del documento",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    uploadDocument.mutate(values);
  }
  
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Carica nuovo documento</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo di documento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il tipo di documento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="payslip">Busta paga</SelectItem>
                      <SelectItem value="tax_document">CUD / Documento fiscale</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch("type") === "payslip" ? "Mese e anno (es. Maggio 2025)" : "Anno di riferimento (es. 2024)"}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={form.watch("type") === "payslip" ? "Maggio 2025" : "2024"} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dipendente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un dipendente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="file"
              render={({ field: { ref, ...field } }) => (
                <FormItem>
                  <FormLabel>Documento PDF</FormLabel>
                  <FormControl>
                    <div className="flex flex-col space-y-2">
                      <Input
                        {...field}
                        value={undefined}
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                      />
                      {selectedFile && (
                        <div className="text-sm text-gray-500">
                          File selezionato: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button
              type="submit"
              className="w-full"
              disabled={uploadDocument.isPending}
            >
              {uploadDocument.isPending ? (
                <>
                  <span className="material-icons animate-spin mr-2">sync</span>
                  Caricamento in corso...
                </>
              ) : (
                "Carica documento"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}