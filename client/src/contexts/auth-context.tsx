import { createContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  name?: string;
  email?: string;
  role: string;
  isActive: boolean;
}

interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextProps | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // Fetch current user data
  const { 
    data: user, 
    isLoading, 
    error,
    refetch: refetchUser
  } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    refetchOnWindowFocus: true,
    onSuccess: (data) => {
      setIsAuthenticated(!!data);
    },
    onError: () => {
      setIsAuthenticated(false);
    }
  });
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      refetchUser();
      
      toast({
        title: "Login effettuato",
        description: "Hai effettuato l'accesso con successo.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore di accesso",
        description: "Username o password non validi.",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      setIsAuthenticated(false);
      
      toast({
        title: "Logout effettuato",
        description: "Hai effettuato il logout con successo.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore durante il logout",
        description: "Si è verificato un errore durante il logout.",
        variant: "destructive",
      });
    },
  });

  // Login function
  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  // Logout function
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error: error as Error,
        login,
        logout,
        isAuthenticated,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}