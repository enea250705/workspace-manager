import { createContext, useState, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const API_URL = import.meta.env.VITE_API_URL || '';
  
  console.log("AuthProvider inizializzato, API_URL:", API_URL);

  // Check if user is already logged in
  useEffect(() => {
    async function checkAuth() {
      console.log("Verifico autenticazione utente...");
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: 'GET',
          credentials: "include",
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log("Risposta /api/auth/me:", response.status, response.statusText);
        
        // Log dei cookie disponibili
        console.log("Cookie disponibili:", document.cookie);
        
        const data = await response.json();
        console.log("Dati utente ricevuti:", data);
        
        if (data.user) {
          console.log("Utente autenticato:", data.user);
          setUser(data.user);
        } else {
          console.log("Nessun utente autenticato");
        }
      } catch (error) {
        console.error("Errore durante la verifica dell'autenticazione:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [API_URL]);

  // Login function
  const login = async (username: string, password: string) => {
    console.log(`Tentativo di login per l'utente: ${username}`);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      console.log("Risposta login:", response.status, response.statusText);
      
      if (!response.ok) {
        console.error("Login fallito con status:", response.status);
        throw new Error("Login failed");
      }
      
      // Log dei cookie ricevuti
      console.log("Cookie dopo login:", document.cookie);
      
      const data = await response.json();
      console.log("Dati login ricevuti:", data);
      
      if (data.user) {
        console.log("Login riuscito per:", data.user.username);
        setUser(data.user);
        return;
      }
      
      throw new Error("Login failed");
    } catch (error) {
      console.error("Errore durante il login:", error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    console.log("Tentativo di logout...");
    try {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log("Risposta logout:", response.status, response.statusText);
      
      setUser(null);
      
      // Clear all queries from the cache on logout
      queryClient.clear();
      
      console.log("Logout completato");
    } catch (error) {
      console.error("Errore durante il logout:", error);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
