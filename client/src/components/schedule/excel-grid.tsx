import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateTimeSlots, calculateWorkHours, formatHours } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * La griglia Excel-like per la gestione dei turni
 * Implementa esattamente la funzionalità richiesta con:
 * - Celle con cadenza di 30 minuti dalle 4:00 alle 24:00
 * - Visualizzazione per singolo giorno con tab per ogni giorno della settimana
 * - X per indicare presenza lavorativa
 * - F per indicare ferie
 * - P per indicare permessi
 * - Colonna NOTE per annotazioni
 * - Colonna TOTALE per calcolo automatico delle ore
 */

type ScheduleGridProps = {
  scheduleId: number | null;
  users: any[];
  startDate: Date;
  endDate: Date;
  shifts: any[];
  timeOffRequests: any[];
  isPublished: boolean;
  onPublish: () => void;
  forceResetGrid?: boolean; // Forza un reset completo della griglia
};

export function ExcelGrid({
  scheduleId,
  users,
  startDate,
  endDate,
  shifts,
  timeOffRequests,
  isPublished,
  onPublish,
  forceResetGrid = false
}: ScheduleGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(0);
  
  // Generazione degli slot di tempo (30 minuti) dalle 4:00 alle 24:00
  const timeSlots = generateTimeSlots(4, 24);
  
  // Inizializza giorni della settimana
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return {
      date,
      name: format(date, "EEEE", { locale: it }),
      shortName: format(date, "EEE", { locale: it }),
      formattedDate: format(date, "yyyy-MM-dd")
    };
  });
  
  // State per la griglia dei dati
  const [gridData, setGridData] = useState<Record<string, Record<number, {
    cells: Array<{ type: string; shiftId: number | null; isTimeOff?: boolean }>;
    notes: string;
    total: number;
  }>>>({});
  
  // MUTATION MIGLIORATA per il salvataggio dei turni
  const updateShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      let response;
      
      if (data.id) {
        // Aggiorna un turno esistente
        response = await apiRequest("PATCH", `/api/shifts/${data.id}`, data);
      } else {
        // Crea un nuovo turno
        response = await apiRequest("POST", `/api/shifts`, { 
          ...data, 
          scheduleId 
        });
      }
      
      // Converti la risposta in un oggetto JSON e restituiscilo
      // In questo modo non avremo problemi di tipo con onSuccess
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalida la query per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}/shifts`] });
      
      // Notifica l'utente
      toast({
        title: "Turno aggiornato",
        description: "Il turno è stato aggiornato con successo.",
        duration: 2000 // Toast più breve per non disturbare
      });
      
      // Log di debug
      console.log('✅ Turno aggiornato con successo:', data);
    },
    onError: (error: any) => {
      // Notifica l'errore
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message || 'Errore sconosciuto'}`,
        variant: "destructive",
      });
      
      // Log dettagliato dell'errore
      console.error('❌ Errore durante l\'aggiornamento del turno:', error);
    }
  });
  
  // MUTATION MIGLIORATA per l'eliminazione dei turni
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      // Chiamata API migliorata con gestione errori
      const response = await apiRequest("DELETE", `/api/shifts/${id}`, {});
      
      // Per compatibilità con le altre funzioni
      try {
        return await response.json();
      } catch (e) {
        // DELETE potrebbe non restituire JSON, in tal caso restituiamo un oggetto vuoto
        return { success: true };
      }
    },
    onSuccess: () => {
      // Invalida la query per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}/shifts`] });
      
      // Notifica molto breve per non essere intrusiva durante l'eliminazione
      toast({
        title: "Turno eliminato",
        description: "Il turno è stato eliminato con successo.",
        duration: 1500, // Toast più breve
      });
    },
    onError: (error: any) => {
      // Notifica l'errore
      toast({
        title: "Errore eliminazione",
        description: `Si è verificato un errore: ${error.message || 'Errore sconosciuto'}`,
        variant: "destructive",
      });
      
      // Log dettagliato dell'errore
      console.error('❌ Errore durante l\'eliminazione del turno:', error);
    }
  });
  
  // INIZIALIZZAZIONE MIGLIORATA DELLA GRIGLIA
  useEffect(() => {
    // Verifica che ci siano utenti disponibili
    if (!users.length) return;
    
    // Controlla i parametri URL per vedere se dobbiamo forzare un reset
    const urlParams = new URLSearchParams(window.location.search);
    const forceEmptyFromUrl = urlParams.get('forceEmpty') === 'true';
    const scheduleIdFromUrl = urlParams.get('scheduleId');
    const resetFromUrl = urlParams.get('reset') === 'true';
    const newScheduleParam = urlParams.get('newSchedule');
    
    // Condizioni per il reset completo della griglia (VERSIONE MIGLIORATA)
    // Inclusi più casi per garantire sempre un reset quando necessario
    // Limitiamo le condizioni di reset per evitare cicli infiniti
    const shouldReset = 
      (forceResetGrid && Object.keys(gridData).length === 0) || // Solo se la griglia è vuota
      forceEmptyFromUrl || 
      resetFromUrl || 
      (Object.keys(gridData).length === 0 && weekDays.length > 0 && users.length > 0) ||
      (scheduleIdFromUrl && scheduleId?.toString() === scheduleIdFromUrl && Object.keys(gridData).length === 0) ||
      (newScheduleParam && scheduleId?.toString() === newScheduleParam && Object.keys(gridData).length === 0);
    
    if (shouldReset) {
      // Log dettagliato delle condizioni di reset
      console.log("RESET COMPLETO GRIGLIA:", {
        forceResetGrid,
        forceEmptyFromUrl, 
        resetFromUrl, 
        scheduleIdFromUrl,
        newScheduleParam,
        currentScheduleId: scheduleId,
        timestamp: Date.now()
      });
      
      // FASE 1: INIZIALIZZAZIONE DI UNA GRIGLIA COMPLETAMENTE VUOTA
      const newGridData: Record<string, Record<number, {
        cells: Array<{ type: string; shiftId: number | null; isTimeOff?: boolean }>;
        notes: string;
        total: number;
      }>> = {};
    
      // FASE 2: PREPARAZIONE STRUTTURA VUOTA
      // Inizializza tutti i giorni con una struttura completamente vuota
      weekDays.forEach(day => {
        newGridData[day.name] = {};
        
        // Filtra solo i dipendenti attivi (evita di creare celle per utenti non attivi)
        // In questa versione migliorata, filtra più rigorosamente
        const activeUsers = users.filter(u => 
          u.role === "employee" && 
          u.isActive === true && 
          u.id !== undefined
        );
        
        // Per ogni utente attivo, crea una struttura vuota per questo giorno
        activeUsers.forEach(user => {
          // Crea celle completamente vuote inizializzate correttamente
          newGridData[day.name][user.id] = {
            cells: timeSlots.map(() => ({ 
              type: "", 
              shiftId: null,
              isTimeOff: false // Aggiungiamo esplicitamente isTimeOff = false per chiarezza
            })),
            notes: "",
            total: 0
          };
        });
      });
      
      console.log("✅ Pulizia completa della tabella dei turni completata. Griglia reimpostata vuota.");
      
      // Popola la griglia con i turni esistenti
      if (shifts && shifts.length > 0 && scheduleId) {
        shifts.forEach(shift => {
          const userId = shift.userId;
          const day = shift.day;
          
          if (newGridData[day] && newGridData[day][userId]) {
            // Trova gli indici corrispondenti all'intervallo di tempo del turno
            const startIndex = timeSlots.indexOf(shift.startTime);
            const endIndex = timeSlots.indexOf(shift.endTime);
            
            if (startIndex >= 0 && endIndex >= 0) {
              // Imposta tutte le celle nell'intervallo
              for (let i = startIndex; i < endIndex; i++) {
                newGridData[day][userId].cells[i] = { 
                  type: shift.type, 
                  shiftId: shift.id,
                  isTimeOff: false // Per default, i turni normali non sono richieste di ferie/permessi
                };
              }
              
              // Aggiorna le note
              newGridData[day][userId].notes = shift.notes || "";
              
              // Calcola le ore totali utilizzando la funzione centralizzata
              if (shift.type === 'work') {
                // Aggiungi al totale usando la funzione di calcolo standardizzata
                newGridData[day][userId].total += calculateWorkHours(shift.startTime, shift.endTime);
              }
            }
          }
        });
      }
      
      // FASE 3: SOVRAPPOSIZIONE DELLE RICHIESTE FERIE/PERMESSI
      // Aggiungi le richieste di ferie/permessi approvate - VERSIONE MIGLIORATA
      if (timeOffRequests && timeOffRequests.length > 0) {
        // Filtra solo le richieste approvate 
        const approvedRequests = timeOffRequests.filter(req => 
          req.status === "approved" && 
          req.userId !== undefined && 
          req.startDate && 
          req.endDate
        );
        
        console.log(`📋 Applicazione di ${approvedRequests.length} richieste di ferie/permessi approvate`);
        
        // Processa ogni richiesta approvata
        approvedRequests.forEach(request => {
          const userId = request.userId;
          const startDate = new Date(request.startDate);
          const endDate = new Date(request.endDate);
          
          // Verifica ogni giorno della settimana
          weekDays.forEach(day => {
            const dayDate = new Date(day.formattedDate);
            
            // Se il giorno è compreso nel periodo della richiesta
            if (dayDate >= startDate && dayDate <= endDate) {
              // Verifica che la struttura dei dati esista
              if (newGridData[day.name] && newGridData[day.name][userId]) {
                // Determina il tipo di permesso (usa "vacation" per ferie, "leave" per permessi)
                const requestType = request.type === "vacation" ? "vacation" : "leave";
                
                // Gestione migliorata dei permessi di mezza giornata
                if (request.halfDay) {
                  const halfDayText = request.type === "vacation" ? "Ferie" : "Permesso";
                  
                  // Mattina (fino alle 13:00)
                  if (request.halfDayPeriod === "morning") {
                    for (let i = 0; i < timeSlots.length; i++) {
                      const hour = parseInt(timeSlots[i].split(':')[0]);
                      if (hour < 13) {
                        newGridData[day.name][userId].cells[i] = {
                          type: requestType,
                          shiftId: null,
                          isTimeOff: true // Flag esplicito per identificare le celle di ferie/permessi
                        };
                      }
                    }
                    // Aggiorna le note con dettagli più chiari
                    newGridData[day.name][userId].notes = `${halfDayText} mattina (${format(startDate, "dd/MM")}-${format(endDate, "dd/MM")})`;
                  }
                  // Pomeriggio (dalle 13:00)
                  else {
                    for (let i = 0; i < timeSlots.length; i++) {
                      const hour = parseInt(timeSlots[i].split(':')[0]);
                      if (hour >= 13) {
                        newGridData[day.name][userId].cells[i] = {
                          type: requestType,
                          shiftId: null,
                          isTimeOff: true
                        };
                      }
                    }
                    // Aggiorna le note con dettagli più chiari 
                    newGridData[day.name][userId].notes = `${halfDayText} pomeriggio (${format(startDate, "dd/MM")}-${format(endDate, "dd/MM")})`;
                  }
                }
                // Gestione dei permessi a giornata intera
                else {
                  // Marca tutte le celle del giorno come ferie/permessi
                  for (let i = 0; i < timeSlots.length; i++) {
                    newGridData[day.name][userId].cells[i] = {
                      type: requestType,
                      shiftId: null,
                      isTimeOff: true
                    };
                  }
                  
                  // Aggiorna le note
                  const fullDayText = request.type === "vacation" ? "Ferie" : "Permesso";
                  newGridData[day.name][userId].notes = `${fullDayText} giornata intera (${format(startDate, "dd/MM")}-${format(endDate, "dd/MM")})`;
                }
              }
            }
          });
        });
      }
      
      // FASE 4: AGGIORNAMENTO STATO CON LA NUOVA GRIGLIA
      setGridData(newGridData);
      
      // FASE 5: LOG DI COMPLETAMENTO
      console.log(`✅ Inizializzazione completa della griglia turni per schedule ID ${scheduleId}`);
    }
  }, [scheduleId, users, shifts, timeOffRequests, weekDays, timeSlots, forceResetGrid]);
  
  // GESTIONE CLIC MIGLIORATA
  // Gestisce in modo più robusto il clic su una cella della griglia
  const handleCellClick = (userId: number, timeIndex: number, day: string) => {
    // VALIDAZIONE PRELIMINARE
    // Non procedere se non c'è uno schedule valido o se è già pubblicato
    if (!scheduleId || isPublished) {
      if (isPublished) {
        toast({
          title: "Turno pubblicato",
          description: "Non puoi modificare un turno già pubblicato.",
          variant: "destructive"
        });
      }
      return;
    }
    
    // PREPARAZIONE STATO
    // Creiamo una copia profonda dei dati per evitare modifiche accidentali dello stato
    const newGridData = structuredClone(gridData);
    // Verifica che i dati utente/giorno esistano
    if (!newGridData[day] || !newGridData[day][userId]) {
      console.error(`Dati mancanti per utente ${userId} nel giorno ${day}`);
      return;
    }
    
    const userDayData = newGridData[day][userId];
    const currentCell = userDayData.cells[timeIndex];
    
    // CICLO DELLE TIPOLOGIE
    // Determina il nuovo tipo di turno secondo la rotazione stabilita
    let newType = "work"; // Default: se la cella è vuota, diventa lavoro
    
    // Verifica se la cella è bloccata perché è una richiesta di ferie/permesso già approvata
    if (currentCell.isTimeOff) {
      console.log("⚠️ Non è possibile modificare questa cella: è una richiesta di ferie o permesso approvata");
      toast({
        title: "Azione non permessa",
        description: "Non puoi modificare una cella che rappresenta ferie o permessi già approvati.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentCell.type) {
      // Rotazione: work -> vacation -> leave -> (vuoto) -> work...
      if (currentCell.type === "work") {
        newType = "vacation";  // Lavoro -> Ferie
      } else if (currentCell.type === "vacation") {
        newType = "leave";     // Ferie -> Permesso 
      } else if (currentCell.type === "leave") {
        newType = "";          // Permesso -> Vuoto
      }
    }
    
    console.log(`🔄 Cambio tipo cella: ${currentCell.type || 'vuota'} -> ${newType || 'vuota'}`);
    
    // GESTIONE API PER TIPO DI AZIONE
    // 1. SE LA CELLA HA UN ID ESISTENTE
    if (currentCell.shiftId) {
      if (newType === "") {
        // CASO 1: ELIMINAZIONE
        // Elimina il turno dal database
        deleteShiftMutation.mutate(currentCell.shiftId);
        
        // Aggiorna il conteggio delle ore (solo se era un turno di lavoro)
        if (currentCell.type === "work") {
          const slotDuration = 0.5; // 30 minuti
          userDayData.total = Math.max(0, userDayData.total - slotDuration);
        }
        
        // Aggiorna la cella localmente
        userDayData.cells[timeIndex] = { 
          type: "", 
          shiftId: null,
          isTimeOff: false
        };
      } else {
        // CASO 2: AGGIORNAMENTO
        // Prepara i dati per l'aggiornamento
        const updateData = {
          id: currentCell.shiftId,
          scheduleId,
          userId,
          day,
          startTime: timeSlots[timeIndex],
          endTime: timeSlots[timeIndex + 1],
          type: newType,
          notes: userDayData.notes || ""
        };
        
        // Invia l'aggiornamento al server
        updateShiftMutation.mutate(updateData);
        
        // Aggiorna il conteggio delle ore
        if (currentCell.type === "work" && newType !== "work") {
          // Se passiamo da lavoro a non-lavoro, sottraiamo ore
          const slotDuration = 0.5;
          userDayData.total = Math.max(0, userDayData.total - slotDuration);
        } else if (currentCell.type !== "work" && newType === "work") {
          // Se passiamo da non-lavoro a lavoro, aggiungiamo ore
          const slotDuration = 0.5;
          userDayData.total += slotDuration;
        }
        
        // Aggiorna lo stato della cella
        userDayData.cells[timeIndex] = { 
          type: newType, 
          shiftId: currentCell.shiftId,
          isTimeOff: false // Imposta esplicitamente a false quando viene modificato manualmente
        };
      }
    } 
    // 2. CELLA SENZA ID O VUOTA CHE DIVENTA NON-VUOTA
    else if (newType !== "") {
      // CASO 3: CREAZIONE
      // Prepara i dati per la creazione
      const createData = {
        scheduleId,
        userId,
        day,
        startTime: timeSlots[timeIndex],
        endTime: timeSlots[timeIndex + 1],
        type: newType,
        notes: userDayData.notes || "",
        area: null // Area opzionale
      };
      
      // Crea un nuovo turno nel database
      updateShiftMutation.mutate(createData, {
        onSuccess: (data) => {
          // Ora la risposta è già un oggetto JSON grazie alla mutationFn migliorata
          // che converte automaticamente la risposta in JSON
            
          // Se la risposta contiene un ID, aggiorniamo la cella con l'ID corretto
          if (data && data.id) {
            const updatedGridData = structuredClone(gridData);
            if (updatedGridData[day] && updatedGridData[day][userId]) {
              updatedGridData[day][userId].cells[timeIndex].shiftId = data.id;
              setGridData(updatedGridData);
              console.log(`✅ Cella aggiornata con nuovo ID turno: ${data.id}`);
            }
          }
        }
      });
      
      // Aggiorna il conteggio delle ore (solo per tipo "work")
      if (newType === "work") {
        const slotDuration = 0.5;
        userDayData.total += slotDuration;
      }
      
      // Aggiorna lo stato della cella
      userDayData.cells[timeIndex] = { 
        type: newType, 
        shiftId: null, // Verrà aggiornato nella callback di successo
        isTimeOff: false
      };
    }
    
    // AGGIORNAMENTO STATO FINALE
    setGridData(newGridData);
  };
  
  // GESTIONE NOTE MIGLIORATA
  // Aggiorna in modo più robusto le note per un utente in un giorno specifico
  const handleNotesChange = (userId: number, day: string, value: string) => {
    // PREPARAZIONE STATO
    // Usa una copia profonda per evitare modifiche accidentali
    const newGridData = structuredClone(gridData);
    
    // Validazione: verifica che i dati per utente/giorno siano disponibili
    if (!newGridData[day] || !newGridData[day][userId]) {
      console.error(`Dati mancanti per utente ${userId} nel giorno ${day}`);
      return;
    }
    
    // Imposta il nuovo valore per le note
    newGridData[day][userId].notes = value;
    
    // AGGIORNAMENTO STATO LOCALE
    // Applica immediatamente il cambiamento all'interfaccia
    setGridData(newGridData);
    
    // AGGIORNAMENTO DATABASE
    // Trova tutti i turni associati all'utente per questo giorno
    const userDayShifts = shifts.filter(
      (shift: any) => shift.userId === userId && 
                      shift.day === day && 
                      shift.id !== undefined
    );
    
    // Log per debug
    console.log(`📝 Aggiornamento note per ${userDayShifts.length} turni di ${day}:`, value);
    
    // Se non ci sono turni ma c'è una nota, crea un turno "note-only" come promemoria
    if (userDayShifts.length === 0 && value.trim() !== '') {
      // Cerca la prima cella vuota nel giorno
      const firstEmptySlotIndex = newGridData[day][userId].cells.findIndex(cell => 
        !cell.type && !cell.shiftId
      );
      
      // Se troviamo una cella vuota, creiamo un turno placeholder
      if (firstEmptySlotIndex >= 0) {
        console.log(`🆕 Creazione turno placeholder per le note del giorno ${day}`);
        
        updateShiftMutation.mutate({
          scheduleId,
          userId,
          day,
          startTime: timeSlots[firstEmptySlotIndex],
          endTime: timeSlots[firstEmptySlotIndex + 1],
          type: "note", // Tipo speciale per turni che sono solo note
          notes: value,
          area: "note" // Area speciale per indicare che è solo una nota
        });
      }
    } 
    // Altrimenti, aggiorna le note per tutti i turni esistenti
    else {
      userDayShifts.forEach((shift: any) => {
        updateShiftMutation.mutate({
          id: shift.id,
          notes: value
        });
      });
    }
    
    // Conferma l'aggiornamento all'utente solo per note significative
    if (value.trim().length > 5) {
      toast({
        title: "Note salvate",
        description: "Le note sono state aggiornate per tutti i turni di questa giornata",
        duration: 2000 // Toast più breve per non disturbare
      });
    }
  };
  
  // Gestione della stampa dello schedule
  const handlePrint = () => {
    if (!scheduleId) return;
    
    // Genera HTML per la stampa
    let pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pianificazione Turni</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .working { background-color: #e1f5fe; }
          .vacation { background-color: #ffebee; }
          .leave { background-color: #fff9c4; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .legend { display: flex; gap: 20px; margin-bottom: 30px; }
          .legend-item { display: flex; align-items: center; }
          .legend-color { display: inline-block; width: 16px; height: 16px; margin-right: 5px; border: 1px solid #ccc; }
          .name-cell { width: 150px; }
          .total-cell { width: 80px; }
        </style>
      </head>
      <body>
        <h1>Pianificazione Turni: ${format(new Date(startDate), "d MMMM", { locale: it })} - ${format(new Date(endDate), "d MMMM yyyy", { locale: it })}</h1>
        
        <div class="header">
          <div>
            <p>Data: ${format(new Date(), "dd/MM/yyyy")}</p>
            <p>Stato: ${isPublished ? 'Pubblicato' : 'Bozza'}</p>
          </div>
        </div>
        
        <div class="legend">
          <div class="legend-item"><span class="legend-color working"></span> In servizio (X)</div>
          <div class="legend-item"><span class="legend-color vacation"></span> Ferie (F)</div>
          <div class="legend-item"><span class="legend-color leave"></span> Permesso (P)</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="name-cell">Dipendente</th>
              <th>Lunedì</th>
              <th>Martedì</th>
              <th>Mercoledì</th>
              <th>Giovedì</th>
              <th>Venerdì</th>
              <th>Sabato</th>
              <th>Domenica</th>
              <th class="total-cell">Totale Ore</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Add employee rows with shift summary
    users
      .filter((user: any) => user.role === "employee" && user.isActive)
      .forEach((user: any) => {
        let userTotalHours = 0;
        
        pdfContent += `
          <tr>
            <td class="name-cell">${user.name}</td>
        `;
        
        // Add days of week
        ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].forEach(day => {
          const userShifts = shifts.filter((s: any) => s.userId === user.id && s.day === day);
          let daySummary = '-';
          let cellClass = '';
          
          if (userShifts.length > 0) {
            // Sort shifts by start time
            userShifts.sort((a: any, b: any) => {
              return a.startTime.localeCompare(b.startTime);
            });
            
            // Get first and last shift
            const firstShift = userShifts[0];
            const lastShift = userShifts[userShifts.length - 1];
            
            // Determine shift type for cell color
            if (firstShift.type === 'work') {
              cellClass = 'working';
              daySummary = `${firstShift.startTime} - ${lastShift.endTime}`;
              
              // Calculate hours for this day
              let dayHours = 0;
              userShifts.forEach(shift => {
                const [startHour, startMin] = shift.startTime.split(":").map(Number);
                const [endHour, endMin] = shift.endTime.split(":").map(Number);
                
                let hours = endHour - startHour;
                let minutes = endMin - startMin;
                
                if (minutes < 0) {
                  hours -= 1;
                  minutes += 60;
                }
                
                dayHours += hours + (minutes / 60);
              });
              
              // Add to total
              userTotalHours += dayHours;
            } else if (firstShift.type === 'vacation') {
              cellClass = 'vacation';
              daySummary = 'Ferie';
            } else if (firstShift.type === 'leave') {
              cellClass = 'leave';
              daySummary = 'Permesso';
            }
          }
          
          pdfContent += `<td class="${cellClass}">${daySummary}</td>`;
        });
        
        // Add total hours
        pdfContent += `<td class="total-cell">${userTotalHours.toFixed(1)}</td></tr>`;
      });
    
    pdfContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    // Create a blob and download
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pianificazione_${format(new Date(startDate), "yyyy-MM-dd")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-base font-semibold">
          {format(startDate, "d MMMM", { locale: it })} - {format(endDate, "d MMMM yyyy", { locale: it })}
        </h3>
        <div className="flex items-center gap-2">
          {isPublished ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Pubblicato
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Bozza
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1">
            <span className="material-icons text-sm">print</span>
            Stampa
          </Button>
          {!isPublished && (
            <Button 
              size="sm" 
              onClick={() => {
                // Controllo se ci sono turni prima di pubblicare
                const hasShifts = shifts && shifts.length > 0;
                
                // Se non ci sono turni, mostra un avviso
                if (!hasShifts) {
                  toast({
                    title: "Attenzione",
                    description: "Stai per pubblicare un turno vuoto. Sei sicuro di voler procedere?",
                    variant: "destructive",
                    action: (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          // Procedi con la pubblicazione anche se vuoto
                          onPublish();
                          toast({
                            title: "Turno vuoto pubblicato",
                            description: "Il turno vuoto è stato pubblicato con successo."
                          });
                        }}
                      >
                        Pubblica vuoto
                      </Button>
                    )
                  });
                  return;
                }
                
                // Se ci sono turni, procedi con la pubblicazione
                onPublish();
                
                // Notifica l'utente
                toast({
                  title: "Turno pubblicato",
                  description: "Il turno è stato pubblicato con successo. Gli utenti possono ora visualizzarlo."
                });
                
                // Log
                console.log(`✅ Schedule ID ${scheduleId} pubblicato con successo`);
              }} 
              className="flex items-center gap-1"
            >
              <span className="material-icons text-sm">publish</span>
              Pubblica
            </Button>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <Tabs defaultValue={weekDays[selectedDay].name} onValueChange={(value) => {
          const dayIndex = weekDays.findIndex(d => d.name === value);
          if (dayIndex !== -1) {
            setSelectedDay(dayIndex);
          }
        }}>
          <TabsList className="mb-4 w-full">
            {weekDays.map((day, idx) => (
              <TabsTrigger key={day.name} value={day.name} className="flex-1">
                <span className="hidden sm:inline">{day.name}</span>
                <span className="sm:hidden">{day.shortName}</span>
                <span className="ml-1 text-xs text-muted-foreground hidden sm:inline">
                  {format(day.date, "d/M")}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {weekDays.map((day) => (
            <TabsContent key={day.name} value={day.name} className="relative">
              <div className="overflow-auto border rounded-md">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-sm font-semibold text-muted-foreground text-left sticky left-0 bg-muted/50 z-10">
                        Dipendente
                      </th>
                      {timeSlots.map((slot, idx) => (
                        <th key={idx} className="p-1 text-xs font-medium text-muted-foreground w-8 sm:w-12 text-center">
                          <span className="hidden sm:inline">{slot}</span>
                          <span className="sm:hidden">{slot.replace(":00", "").replace(":30", "½")}</span>
                        </th>
                      ))}
                      <th className="p-2 text-sm font-semibold text-muted-foreground text-left min-w-[120px] sm:min-w-[200px]">
                        Note
                      </th>
                      <th className="p-2 text-xs sm:text-sm font-semibold text-muted-foreground text-center w-12 sm:w-20">
                        Ore
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(user => user.role === "employee" && user.isActive)
                      .map(user => (
                        <tr key={user.id} className="border-b">
                          <td className="p-2 text-xs sm:text-sm font-medium sticky left-0 bg-white z-10">
                            {user.name}
                          </td>
                          
                          {timeSlots.map((slot, idx) => {
                            // Get cell data
                            const cellData = gridData[day.name]?.[user.id]?.cells[idx] || { type: "", shiftId: null };
                            const cellType = cellData.type;
                            
                            // Style based on cell type
                            let cellStyle = "cursor-pointer hover:bg-gray-50 transition-colors";
                            let cellContent = "";
                            
                            if (cellType === "work") {
                              cellStyle += " bg-blue-50 text-blue-700";
                              cellContent = "X";
                            } else if (cellType === "vacation") {
                              cellStyle += " bg-red-50 text-red-700";
                              cellContent = "F";
                            } else if (cellType === "leave") {
                              cellStyle += " bg-yellow-50 text-yellow-700";
                              cellContent = "P";
                            }
                            
                            if (isPublished) {
                              cellStyle = cellStyle.replace("cursor-pointer", "");
                            }
                            
                            return (
                              <td 
                                key={idx}
                                className={`p-0 text-center ${cellStyle}`}
                                onClick={() => handleCellClick(user.id, idx, day.name)}
                              >
                                <div className="w-full h-full p-0 sm:p-1 text-xs sm:text-sm">
                                  {cellContent}
                                </div>
                              </td>
                            );
                          })}
                          
                          <td className="p-1">
                            <Input
                              size={20}
                              placeholder="Note..."
                              value={gridData[day.name]?.[user.id]?.notes || ""}
                              onChange={(e) => handleNotesChange(user.id, day.name, e.target.value)}
                              disabled={isPublished}
                              className="text-xs sm:text-sm w-full"
                            />
                          </td>
                          
                          <td className="p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm">
                            {gridData[day.name]?.[user.id]?.total.toFixed(1) || "0.0"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-3 text-sm text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <span className="material-icons text-sm">help_outline</span>
                        <span>Legenda</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="p-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-4 h-4 rounded bg-blue-50 text-blue-700 text-xs flex items-center justify-center">X</span>
                          <span>In servizio</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-4 h-4 rounded bg-red-50 text-red-700 text-xs flex items-center justify-center">F</span>
                          <span>Ferie</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-4 h-4 rounded bg-yellow-50 text-yellow-700 text-xs flex items-center justify-center">P</span>
                          <span>Permesso</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}