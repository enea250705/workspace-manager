import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserForm } from "./user-form";

export function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const usersPerPage = 5;
  
  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (userData: any) => 
      apiRequest("PATCH", `/api/users/${userData.id}`, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditUserDialogOpen(false);
      toast({
        title: "Utente aggiornato",
        description: "L'utente è stato aggiornato con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento dell'utente.",
        variant: "destructive",
      });
    }
  });
  
  // Toggle user active status
  const toggleUserStatus = (user: any) => {
    updateUserMutation.mutate({
      id: user.id,
      isActive: !user.isActive,
    });
  };
  
  // Filter users based on search and filters
  const filteredUsers = users
    .filter((user: any) => {
      const nameMatch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const roleMatch = roleFilter === "all" || user.role === roleFilter;
      const statusMatch = statusFilter === "all" || 
                         (statusFilter === "active" && user.isActive) ||
                         (statusFilter === "inactive" && !user.isActive);
      
      return nameMatch && roleMatch && statusMatch;
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
  
  // Paginate users
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );
  
  // Handle edit user
  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setIsEditUserDialogOpen(true);
  };
  
  // Format last login date
  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "Mai";
    
    const date = new Date(lastLogin);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Oggi, " + date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Ieri, " + date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays < 7) {
      return `${diffDays} giorni fa`;
    } else {
      return formatDate(lastLogin);
    }
  };
  
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-condensed font-medium">Gestione Utenti</h2>
          <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <span className="material-icons text-sm">person_add</span>
                Nuovo Utente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
              </DialogHeader>
              <UserForm 
                onSubmit={(userData) => {
                  setIsNewUserDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                  toast({
                    title: "Utente creato",
                    description: "Il nuovo utente è stato creato con successo.",
                  });
                }}
                onCancel={() => setIsNewUserDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Search & Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                <span className="material-icons text-gray-400 text-sm">search</span>
              </span>
              <Input
                type="text"
                placeholder="Cerca utenti..."
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
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tutti i ruoli" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i ruoli</SelectItem>
                <SelectItem value="admin">Amministratore</SelectItem>
                <SelectItem value="employee">Dipendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tutti gli stati" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="active">Attivo</SelectItem>
                <SelectItem value="inactive">Disattivato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Users Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-8 text-center">
              <span className="material-icons animate-spin text-primary">sync</span>
              <p className="mt-2 text-sm text-gray-500">Caricamento utenti...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-icons text-4xl text-gray-400">person_off</span>
              <p className="mt-2 text-gray-500">Nessun utente trovato</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Nome</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Ruolo</th>
                  <th className="px-4 py-2 text-left">Stato</th>
                  <th className="px-4 py-2 text-left">Ultimo accesso</th>
                  <th className="px-4 py-2 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedUsers.map((user: any) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === "admin" 
                          ? "bg-primary bg-opacity-10 text-primary" 
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {user.role === "admin" ? "Amministratore" : "Dipendente"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center">
                        <span className={`w-2 h-2 rounded-full ${
                          user.isActive ? "bg-success" : "bg-error"
                        } mr-1`}></span>
                        {user.isActive ? "Attivo" : "Disattivato"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatLastLogin(user.lastLogin)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditUser(user)}
                      >
                        <span className="material-icons text-sm">edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-2"
                        onClick={() => toggleUserStatus(user)}
                      >
                        <span className="material-icons text-sm">
                          {user.isActive ? "block" : "check_circle"}
                        </span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {filteredUsers.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Mostra {(currentPage - 1) * usersPerPage + 1}-{Math.min(currentPage * usersPerPage, filteredUsers.length)} di {filteredUsers.length} utenti
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
        
        {/* Edit User Dialog */}
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modifica Utente</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <UserForm 
                user={selectedUser}
                onSubmit={(userData) => {
                  updateUserMutation.mutate({
                    ...userData,
                    id: selectedUser.id,
                  });
                }}
                onCancel={() => setIsEditUserDialogOpen(false)}
                isEdit={true}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
