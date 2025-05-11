import { useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  type: z.string(),
  startDate: z.date({
    required_error: "Seleziona una data di inizio",
  }),
  endDate: z.date({
    required_error: "Seleziona una data di fine",
  }),
  duration: z.string(),
  reason: z.string().optional(),
}).refine(data => {
  return data.startDate <= data.endDate;
}, {
  message: "La data di fine deve essere successiva o uguale alla data di inizio",
  path: ["endDate"],
});

export function TimeOffRequestForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "vacation",
      duration: "full_day",
      reason: "",
    },
  });
  
  const createTimeOffRequest = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      const payload = {
        ...data,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
      };
      return apiRequest("POST", "/api/time-off-requests", payload);
    },
    onSuccess: () => {
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta è stata inviata con successo",
      });
      form.reset({
        type: "vacation",
        duration: "full_day",
        reason: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio della richiesta",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    createTimeOffRequest.mutate(values);
  }
  
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Nuova richiesta di assenza</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo di assenza</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il tipo di assenza" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vacation">Ferie</SelectItem>
                      <SelectItem value="personal">Permesso personale</SelectItem>
                      <SelectItem value="sick">Malattia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data di inizio</FormLabel>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="border rounded-md p-2"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {field.value ? format(field.value, "EEEE d MMMM yyyy", { locale: it }) : "Seleziona una data"}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data di fine</FormLabel>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const startDate = form.getValues("startDate");
                        return date < (startDate || new Date());
                      }}
                      initialFocus
                      className="border rounded-md p-2"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {field.value ? format(field.value, "EEEE d MMMM yyyy", { locale: it }) : "Seleziona una data"}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Durata giornaliera</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="full_day" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Giornata intera
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="morning" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Solo mattina
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="afternoon" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Solo pomeriggio
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Inserisci il motivo della richiesta"
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button
              type="submit"
              className="w-full"
              disabled={createTimeOffRequest.isPending}
            >
              {createTimeOffRequest.isPending ? (
                <>
                  <span className="material-icons animate-spin mr-2">sync</span>
                  Invio in corso...
                </>
              ) : (
                "Invia richiesta"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}