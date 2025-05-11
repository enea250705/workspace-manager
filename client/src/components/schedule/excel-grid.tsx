import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { generateTimeSlots, formatHours } from "@/lib/utils";

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
};

export function ExcelGrid({
  scheduleId,
  users,
  startDate,
  endDate,
  shifts,
  timeOffRequests,
  isPublished,
  onPublish
}: ScheduleGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(0);
  
  // Generazione degli slot di tempo (30 minuti) dalle 4:00 alle 24:00
  const timeSlots = generateTimeSlots(4, 24);
  
  // Inizializza giorni della settimana
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startDate, i);
    return {
      date,
      name: format(date, "EEEE", { locale: it }),
      shortName: format(date, "EEE", { locale: it }),
      formattedDate: format(date, "yyyy-MM-dd")
    };
  });
  
  // Stato della griglia
  const [gridData, setGridData] = useState<Record<string, Record<number, {
    cells: Array<{ type: string; shiftId: number | null; isTimeOff?: boolean }>;
    notes: string;
    total: number;
  }>>>({});
  
  // Creazione di un nuovo turno
  const createShiftMutation = useMutation({
    mutationFn: (shiftData: any) => apiRequest("POST", "/api/shifts", shiftData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}/shifts`] });
      toast({
        title: "Turno aggiunto",
        description: "Il turno è stato aggiunto con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiunta del turno.",
        variant: "destructive",
      });
    }
  });
  
  // Aggiornamento di un turno esistente
  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PATCH", `/api/shifts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}/shifts`] });
      toast({
        title: "Turno aggiornato",
        description: "Il turno è stato aggiornato con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del turno.",
        variant: "destructive",
      });
    }
  });
  
  // Eliminazione di un turno
  const deleteShiftMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/shifts/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}/shifts`] });
      toast({
        title: "Turno eliminato",
        description: "Il turno è stato eliminato con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del turno.",
        variant: "destructive",
      });
    }
  });
  
  // Inizializzazione della griglia
  useEffect(() => {
    if (!scheduleId || !users.length) return;
    
    // Se la griglia è già inizializzata, non fare nulla
    if (Object.keys(gridData).length > 0) return;
    
    // Crea una nuova griglia
    const newGridData: Record<string, Record<number, {
      cells: Array<{ type: string; shiftId: number | null; isTimeOff?: boolean }>;
      notes: string;
      total: number;
    }>> = {};
    
    // Inizializza la griglia vuota per tutti i giorni e utenti
    weekDays.forEach(day => {
      newGridData[day.name] = {};
      
      // Filtra solo i dipendenti attivi
      const activeUsers = users.filter(u => u.role === "employee" && u.isActive);
      
      activeUsers.forEach(user => {
        newGridData[day.name][user.id] = {
          cells: timeSlots.map(() => ({ type: "", shiftId: null })),
          notes: "",
          total: 0
        };
      });
    });
    
    // Popola la griglia con i turni esistenti
    if (shifts && shifts.length > 0) {
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
                shiftId: shift.id 
              };
            }
            
            // Aggiorna le note
            newGridData[day][userId].notes = shift.notes || "";
            
            // Calcola le ore totali
            if (shift.type === 'work') {
              const startHour = parseInt(shift.startTime.split(':')[0]);
              const startMin = parseInt(shift.startTime.split(':')[1]);
              const endHour = parseInt(shift.endTime.split(':')[0]);
              const endMin = parseInt(shift.endTime.split(':')[1]);
              
              let hours = endHour - startHour;
              let minutes = endMin - startMin;
              
              if (minutes < 0) {
                hours -= 1;
                minutes += 60;
              }
              
              // Aggiungi al totale
              newGridData[day][userId].total += hours + (minutes / 60);
            }
          }
        }
      });
    }
    
    // Aggiungi le richieste di ferie/permessi approvate
    if (timeOffRequests && timeOffRequests.length > 0) {
      const approvedRequests = timeOffRequests.filter(req => req.status === "approved");
      
      approvedRequests.forEach(request => {
        const userId = request.userId;
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        
        // Verifica ogni giorno della settimana
        weekDays.forEach(day => {
          const dayDate = new Date(day.formattedDate);
          
          // Se il giorno è nell'intervallo della richiesta
          if (dayDate >= startDate && dayDate <= endDate) {
            if (newGridData[day.name] && newGridData[day.name][userId]) {
              // Marca tutte le celle per questo giorno
              const type = request.type === "vacation" ? "vacation" : "leave";
              
              if (request.duration === "full_day") {
                // Giorno intero
                newGridData[day.name][userId].cells = newGridData[day.name][userId].cells.map(() => ({
                  type,
                  shiftId: null,
                  isTimeOff: true
                }));
                newGridData[day.name][userId].notes = `${request.type === "vacation" ? "Ferie" : "Permesso"} approvato`;
              } else if (request.duration === "morning") {
                // Solo mattina (prima metà)
                const halfDay = Math.floor(timeSlots.length / 2);
                for (let i = 0; i < halfDay; i++) {
                  newGridData[day.name][userId].cells[i] = {
                    type,
                    shiftId: null,
                    isTimeOff: true
                  };
                }
                newGridData[day.name][userId].notes = `${request.type === "vacation" ? "Ferie" : "Permesso"} mattina`;
              } else if (request.duration === "afternoon") {
                // Solo pomeriggio (seconda metà)
                const halfDay = Math.floor(timeSlots.length / 2);
                for (let i = halfDay; i < timeSlots.length; i++) {
                  newGridData[day.name][userId].cells[i] = {
                    type,
                    shiftId: null,
                    isTimeOff: true
                  };
                }
                newGridData[day.name][userId].notes = `${request.type === "vacation" ? "Ferie" : "Permesso"} pomeriggio`;
              }
            }
          }
        });
      });
    }
    
    setGridData(newGridData);
  }, [scheduleId, users, shifts, timeOffRequests, weekDays, timeSlots]);
  
  // Gestione del click su una cella
  const handleCellClick = (userId: number, timeIndex: number, day: string) => {
    if (!scheduleId || isPublished) return;
    
    const newGridData = { ...gridData };
    const userDayData = newGridData[day][userId];
    const currentCell = userDayData.cells[timeIndex];
    
    // Non modificare se è una cella di ferie/permessi approvati
    if (currentCell.isTimeOff) {
      toast({
        title: "Cella bloccata",
        description: "Non puoi modificare questa cella perché è una richiesta di ferie/permessi approvata.",
        variant: "destructive",
      });
      return;
    }
    
    // Ciclo: vuoto -> lavoro -> ferie -> permesso -> vuoto
    let newType = "";
    
    if (currentCell.type === "") {
      newType = "work";
    } else if (currentCell.type === "work") {
      newType = "vacation";
    } else if (currentCell.type === "vacation") {
      newType = "leave";
    }
    
    // Trova le celle consecutive dello stesso tipo
    let startIndex = timeIndex;
    let endIndex = timeIndex;
    
    if (currentCell.shiftId) {
      // Se è un turno esistente, trova i suoi confini
      const shiftId = currentCell.shiftId;
      
      // Trova l'indice iniziale
      for (let i = timeIndex; i >= 0; i--) {
        if (userDayData.cells[i].shiftId === shiftId) {
          startIndex = i;
        } else {
          break;
        }
      }
      
      // Trova l'indice finale
      for (let i = timeIndex; i < userDayData.cells.length; i++) {
        if (userDayData.cells[i].shiftId === shiftId) {
          endIndex = i;
        } else {
          break;
        }
      }
      
      // Cancella tutte le celle nel range
      for (let i = startIndex; i <= endIndex; i++) {
        userDayData.cells[i] = { type: "", shiftId: null };
      }
      
      // Elimina il turno dal server
      deleteShiftMutation.mutate(shiftId);
      
      // Ricalcola il totale delle ore
      calculateTotal(userId, day, newGridData);
    } else if (newType !== "") {
      // Crea un nuovo turno
      const newShiftData = {
        scheduleId,
        userId,
        day,
        startTime: timeSlots[timeIndex],
        endTime: timeSlots[timeIndex + 1], // +1 per creare uno slot di 30 minuti
        type: newType,
        notes: userDayData.notes,
      };
      
      createShiftMutation.mutate(newShiftData);
      
      // Aggiorna la cella nella UI
      userDayData.cells[timeIndex] = { 
        type: newType, 
        shiftId: null // sarà aggiornato nel prossimo caricamento
      };
      
      // Ricalcola il totale delle ore
      if (newType === 'work') {
        userDayData.total += 0.5; // 30 minuti = 0.5 ore
      }
    }
    
    setGridData(newGridData);
  };
  
  // Calcola il totale delle ore per un dipendente in un giorno
  const calculateTotal = (userId: number, day: string, data: any) => {
    let total = 0;
    let continuousWork = false;
    let startTime = "";
    
    // Cerca blocchi continui di celle "work"
    data[day][userId].cells.forEach((cell: any, index: number) => {
      if (cell.type === "work") {
        if (!continuousWork) {
          continuousWork = true;
          startTime = timeSlots[index];
        }
      } else if (continuousWork) {
        // Fine di un blocco di lavoro
        continuousWork = false;
        const endTime = timeSlots[index];
        
        // Calcola le ore
        const startHour = parseInt(startTime.split(':')[0]);
        const startMin = parseInt(startTime.split(':')[1]);
        const endHour = parseInt(endTime.split(':')[0]);
        const endMin = parseInt(endTime.split(':')[1]);
        
        let hours = endHour - startHour;
        let minutes = endMin - startMin;
        
        if (minutes < 0) {
          hours -= 1;
          minutes += 60;
        }
        
        total += hours + (minutes / 60);
      }
    });
    
    // Controlla se l'ultimo blocco arriva fino alla fine
    if (continuousWork) {
      const endTime = timeSlots[timeSlots.length - 1];
      
      // Calcola le ore
      const startHour = parseInt(startTime.split(':')[0]);
      const startMin = parseInt(startTime.split(':')[1]);
      const endHour = parseInt(endTime.split(':')[0]);
      const endMin = parseInt(endTime.split(':')[1]);
      
      let hours = endHour - startHour;
      let minutes = endMin - startMin;
      
      if (minutes < 0) {
        hours -= 1;
        minutes += 60;
      }
      
      total += hours + (minutes / 60);
    }
    
    data[day][userId].total = total;
  };
  
  // Gestione del cambio note
  const handleNotesChange = (userId: number, day: string, notes: string) => {
    if (!scheduleId || isPublished) return;
    
    const newGridData = { ...gridData };
    newGridData[day][userId].notes = notes;
    
    // Trova tutti i turni per questo utente e giorno
    const userShifts = shifts.filter(s => s.userId === userId && s.day === day);
    
    // Aggiorna le note per tutti i turni
    userShifts.forEach(shift => {
      updateShiftMutation.mutate({
        id: shift.id,
        data: { notes }
      });
    });
    
    setGridData(newGridData);
  };
  
  // Funzione per copiare un giorno al successivo
  const handleCopyDay = () => {
    if (!scheduleId || isPublished) return;
    
    const currentDay = weekDays[selectedDay].name;
    const nextDay = weekDays[(selectedDay + 1) % 7].name;
    
    toast({
      title: "Copiando il giorno",
      description: `Copiando gli orari da ${currentDay} a ${nextDay}...`,
    });
    
    // Copia tutti i turni dal giorno corrente al successivo
    Object.entries(gridData[currentDay]).forEach(([userId, userData]: [string, any]) => {
      const userIdNum = parseInt(userId);
      
      // Trova blocchi continui di celle dello stesso tipo
      let currentBlock: { 
        start: number; 
        end: number; 
        type: string;
        notes: string;
      } | null = null;
      
      userData.cells.forEach((cell: any, index: number) => {
        if (cell.type !== "") {
          if (!currentBlock || currentBlock.type !== cell.type) {
            // Se avevamo un blocco precedente, salvalo
            if (currentBlock && typeof currentBlock.start === 'number' && typeof currentBlock.end === 'number') {
              createShiftMutation.mutate({
                scheduleId,
                userId: userIdNum,
                day: nextDay,
                startTime: timeSlots[currentBlock.start],
                endTime: timeSlots[currentBlock.end + 1],
                type: currentBlock.type,
                notes: userData.notes,
              });
            }
            // Inizia un nuovo blocco
            currentBlock = { 
              start: index, 
              end: index, 
              type: cell.type,
              notes: userData.notes
            };
          } else {
            // Estendi il blocco corrente
            if (currentBlock) {
              currentBlock.end = index;
            }
          }
        } else if (currentBlock && typeof currentBlock.start === 'number' && typeof currentBlock.end === 'number') {
          // Fine di un blocco
          createShiftMutation.mutate({
            scheduleId,
            userId: userIdNum,
            day: nextDay,
            startTime: timeSlots[currentBlock.start],
            endTime: timeSlots[currentBlock.end + 1],
            type: currentBlock.type,
            notes: userData.notes,
          });
          currentBlock = null;
        }
      });
      
      // Non dimenticare l'ultimo blocco se arriva fino alla fine
      if (currentBlock && typeof currentBlock.start === 'number' && typeof currentBlock.end === 'number') {
        createShiftMutation.mutate({
          scheduleId,
          userId: userIdNum,
          day: nextDay,
          startTime: timeSlots[currentBlock.start],
          endTime: timeSlots[currentBlock.end + 1],
          type: currentBlock.type,
          notes: userData.notes,
        });
      }
    });
    
    toast({
      title: "Giorno copiato",
      description: `Gli orari di ${currentDay} sono stati copiati in ${nextDay}.`,
    });
  };
  
  // Filtro per mostrare solo gli impiegati attivi
  const activeEmployees = users.filter(user => user.role === "employee" && user.isActive);
  
  return (
    <div className="bg-white border rounded-lg p-4 pt-0">
      {/* Pannello di controllo */}
      <div className="flex justify-between items-center py-4 border-b">
        <div className="flex space-x-4">
          <div className="text-xl font-semibold">
            Pianificazione Turni
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {format(startDate, "d MMMM", { locale: it })} - {format(endDate, "d MMMM yyyy", { locale: it })}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyDay}
            disabled={isPublished}
          >
            <span className="material-icons text-sm mr-1">content_copy</span>
            Copia Giorno
          </Button>
          <Button
            variant="default"
            size="sm"
            className="bg-success hover:bg-success/90"
            onClick={onPublish}
            disabled={isPublished}
          >
            <span className="material-icons text-sm mr-1">publish</span>
            Pubblica
          </Button>
        </div>
      </div>
      
      {/* Legenda colori */}
      <div className="flex flex-wrap gap-4 py-3 border-b">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-100 mr-2 border border-blue-300"></div>
          <span className="text-sm">In servizio (X)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-100 mr-2 border border-red-300"></div>
          <span className="text-sm">Ferie (F)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-100 mr-2 border border-yellow-300"></div>
          <span className="text-sm">Permesso (P)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-white mr-2 border border-gray-300"></div>
          <span className="text-sm">Non in servizio</span>
        </div>
      </div>
      
      {/* Tabs giorni settimana */}
      <div className="flex border-b">
        {weekDays.map((day, index) => (
          <button
            key={day.name}
            className={`py-2 px-4 text-sm font-medium ${
              index === selectedDay
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setSelectedDay(index)}
          >
            {day.shortName} {format(day.date, "d/M")}
          </button>
        ))}
      </div>
      
      {/* Tabella in stile Excel */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border py-2 px-3 text-left w-[180px]">Dipendente</th>
              {timeSlots.map((slot, index) => (
                <th key={index} className="border py-1 px-1 text-center text-xs" style={{ minWidth: '40px' }}>
                  {slot}
                </th>
              ))}
              <th className="border py-2 px-3 text-left w-[150px]">Note</th>
              <th className="border py-2 px-3 text-center w-[80px]">Totale</th>
            </tr>
          </thead>
          <tbody>
            {activeEmployees.map(employee => {
              const currentDay = weekDays[selectedDay].name;
              const userDayData = gridData[currentDay]?.[employee.id];
              
              return (
                <tr key={employee.id}>
                  <td className="border py-2 px-3">{employee.name}</td>
                  
                  {userDayData?.cells.map((cell, index) => (
                    <td
                      key={index}
                      className={`border text-center cursor-pointer ${
                        cell.type === "work"
                          ? "bg-blue-100 hover:bg-blue-200"
                          : cell.type === "vacation"
                            ? "bg-red-100 hover:bg-red-200"
                            : cell.type === "leave"
                              ? "bg-yellow-100 hover:bg-yellow-200"
                              : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleCellClick(employee.id, index, currentDay)}
                      style={{ cursor: isPublished ? "default" : "pointer" }}
                      title={
                        cell.isTimeOff
                          ? "Richiesta approvata (non modificabile)"
                          : isPublished 
                            ? "Pianificazione pubblicata (non modificabile)"
                            : "Clicca per cambiare stato"
                      }
                    >
                      {cell.type === "work" && "X"}
                      {cell.type === "vacation" && "F"}
                      {cell.type === "leave" && "P"}
                    </td>
                  ))}
                  
                  <td className="border p-0">
                    <input
                      type="text"
                      className="w-full h-full border-none py-2 px-3"
                      value={userDayData?.notes || ""}
                      onChange={(e) => handleNotesChange(employee.id, currentDay, e.target.value)}
                      disabled={isPublished}
                      placeholder="Note..."
                    />
                  </td>
                  
                  <td className="border py-2 px-3 text-center font-medium">
                    {userDayData ? formatHours(userDayData.total) : "0h"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Messaggio se pubblicato */}
      {isPublished && (
        <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200 text-blue-700 text-sm">
          <span className="material-icons text-sm align-middle mr-1">info</span>
          Questa pianificazione è stata pubblicata. I dipendenti possono visualizzarla nel loro account.
          Puoi ancora apportare modifiche e ripubblicare per aggiornare i turni.
        </div>
      )}
    </div>
  );
}