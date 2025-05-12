import React from 'react';
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, RefreshCw } from 'lucide-react';

interface RepublishButtonProps {
  scheduleId: number;
  isPublished: boolean;
}

export function RepublishButton({ scheduleId, isPublished }: RepublishButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const republishMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/schedules/${scheduleId}/publish`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Turno ripubblicato",
        description: "Il turno è stato ripubblicato con successo e le notifiche sono state inviate.",
        duration: 5000,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: `Non è stato possibile ripubblicare il turno: ${error.message || 'Errore sconosciuto'}`,
        variant: "destructive",
      });
    }
  });
  
  if (!isPublished) {
    return null;
  }
  
  return (
    <Button 
      variant="secondary"
      className="gap-2 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
      onClick={() => republishMutation.mutate()}
      disabled={republishMutation.isPending}
    >
      {republishMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Ripubblica modifiche
    </Button>
  );
}