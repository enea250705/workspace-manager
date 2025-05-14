import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(1, {
    message: "Username è obbligatorio",
  }),
  password: z.string().min(1, {
    message: "Password è obbligatoria",
  }),
  remember: z.boolean().default(false),
});

export default function Login() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || '';

  console.log("Login component inizializzato, API_URL:", API_URL);
  console.log("Cookie disponibili:", document.cookie);

  // Se l'utente è già autenticato, reindirizza alla dashboard
  useEffect(() => {
    if (isAuthenticated) {
      console.log("Utente già autenticato, reindirizzo alla dashboard");
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      remember: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Tentativo di login con:", values.username);
    setIsLoading(true);
    
    try {
      // Login utilizzando l'URL API completo
      console.log(`Invio richiesta di login a ${API_URL}/api/auth/login`);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
        credentials: 'include'
      });
      
      console.log("Risposta login:", response.status, response.statusText);
      
      if (!response.ok) {
        console.error("Login fallito con status:", response.status);
        throw new Error('Credenziali non valide');
      }
      
      // Log dei cookie ricevuti
      console.log("Cookie dopo login:", document.cookie);
      
      const data = await response.json();
      console.log("Dati login ricevuti:", data);
      
      if (data.user) {
        console.log("Login riuscito per:", data.user.username);
        
        // Prova a verificare subito l'autenticazione
        try {
          const checkResponse = await fetch(`${API_URL}/api/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          console.log("Verifica immediata auth:", checkResponse.status, checkResponse.statusText);
          const checkData = await checkResponse.json();
          console.log("Dati verifica auth:", checkData);
        } catch (checkError) {
          console.error("Errore nella verifica immediata:", checkError);
        }
        
        // Ricarica la pagina per aggiornare lo stato di autenticazione
        console.log("Reindirizzo alla dashboard");
        window.location.href = '/';
        return;
      }
      
      throw new Error('Errore durante l\'accesso');
    } catch (error) {
      console.error("Errore completo login:", error);
      toast({
        title: "Errore di accesso",
        description: "Credenziali non valide. Riprova.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-condensed">Da Vittorino Gestione</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sistema di Gestione Personale
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="nome.cognome@azienda.it" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="remember"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <label
                          htmlFor="remember"
                          className="text-sm font-medium text-gray-700"
                        >
                          Ricordami
                        </label>
                      </div>
                    )}
                  />
                  
                  <a href="#" className="text-sm text-primary hover:underline">
                    Password dimenticata?
                  </a>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading || authLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Accesso in corso...
                    </>
                  ) : (
                    "Accedi"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-gray-500">
          <p>
            Utilizzare le credenziali fornite dal tuo amministratore.
          </p>
        </div>
      </div>
    </div>
  );
}
