import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { generateTimeSlots, formatHours } from "@/lib/utils";

/**
 * Griglia Excel per la gestione dei turni con:
 * - Celle da 30 minuti (4:00-24:00)
 * - Visualizzazione giornaliera tramite tab
 * - Indicatori: X (lavoro), F (ferie), P (permessi)
 * - Colonne per note e totale ore
 * - Supporto per richieste approvate
 * - Pubblicazione e modifica dopo pubblicazione
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
  
  // Orari dalle 4:00 alle 24:00 con intervalli di 30 minuti
  const timeSlots = generateTimeSlots(4, 24);
  
  // Giorni della settimana basati sul range di date
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startDate, i);
    return {
      date,
      name: format(date, "EEEE", { locale: it }),
      shortName: format(date, "EEE", { locale: it }),
      formattedDate: format(date, "yyyy-MM-dd")
    };
  });
  
  // Struttura dati della griglia: {giorno: {userId: {cells, notes, total}}}
  const [gridData, setGridData] = useState<Record<string, Record<number, {
    cells: Array<{ type: string; shiftId: number | null; isTimeOff?: boolean }>;
    notes: string;
    total: number;
  }>>>({});
  
  // API mutation per creare un nuovo turno
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
  
  // API mutation per modificare un turno
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
  
  // API mutation per eliminare un turno
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
    
    if (Object.keys(gridData).length > 0) return;
    
    const newGridData: Record<string, Record<number, {
      cells: Array<{ type: string; shiftId: number | null; isTimeOff?: boolean }>;
      notes: string;
      total: number;
    }>> = {};
    
    // Crea griglia vuota per tutti i giorni e dipendenti
    weekDays.forEach(day => {
      newGridData[day.name] = {};
      
      const activeEmployees = users.filter(u => u.role === "employee" && u.isActive);
      
      activeEmployees.forEach(user => {
        newGridData[day.name][user.id] = {
          cells: timeSlots.map(() => ({ type: "", shiftId: null })),
          notes: "",
          total: 0
        };
      });
    });
    
    // Popola con i turni esistenti
    if (shifts && shifts.length > 0) {
      shifts.forEach(shift => {
        const userId = shift.userId;
        const day = shift.day;
        
        if (newGridData[day] && newGridData[day][userId]) {
          const startIndex = timeSlots.indexOf(shift.startTime);
          const endIndex = timeSlots.indexOf(shift.endTime);
          
          if (startIndex >= 0 && endIndex >= 0) {
            // Imposta le celle del turno
            for (let i = startIndex; i < endIndex; i++) {
              newGridData[day][userId].cells[i] = { 
                type: shift.type, 
                shiftId: shift.id 
              };
            }
            
            // Imposta note
            newGridData[day][userId].notes = shift.notes || "";
            
            // Calcola ore lavorate
            if (shift.type === 'work') {
              const duration = getHourDifference(shift.startTime, shift.endTime);
              newGridData[day][userId].total += duration;
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
        
        // Per ogni giorno coperto dalla richiesta
        weekDays.forEach(day => {
          const dayDate = new Date(day.formattedDate);
          
          if (dayDate >= startDate && dayDate <= endDate) {
            if (newGridData[day.name] && newGridData[day.name][userId]) {
              const type = request.type === "vacation" ? "vacation" : "leave";
              
              // In base al tipo di richiesta (giorno intero, mattina, pomeriggio)
              if (request.duration === "full_day") {
                // Giorno intero
                newGridData[day.name][userId].cells = newGridData[day.name][userId].cells.map(() => ({
                  type,
                  shiftId: null,
                  isTimeOff: true
                }));
                newGridData[day.name][userId].notes = `${request.type === "vacation" ? "Ferie" : "Permesso"} approvato`;
              } else if (request.duration === "morning") {
                // Solo mattina
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
                // Solo pomeriggio
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
  
  // Calcola differenza in ore tra due orari
  const getHourDifference = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let hours = endHour - startHour;
    let minutes = endMin - startMin;
    
    if (minutes < 0) {
      hours -= 1;
      minutes += 60;
    }
    
    return hours + (minutes / 60);
  };
  
  // Gestione del click su una cella
  const handleCellClick = (userId: number, timeIndex: number, day: string) => {
    if (!scheduleId) return;
    
    // Non permettere modifiche se pubblicato (solo admin può farlo)
    if (isPublished) {
      toast({
        title: "Pianificazione pubblicata",
        description: "Questa pianificazione è stata pubblicata. Ripubblica dopo le modifiche.",
      });
      return;
    }
    
    const newGridData = { ...gridData };
    const userDayData = newGridData[day][userId];
    const currentCell = userDayData.cells[timeIndex];
    
    // Non permettere modifiche a celle con richieste approvate
    if (currentCell.isTimeOff) {
      toast({
        title: "Cella bloccata",
        description: "Non puoi modificare questa cella perché contiene una richiesta di ferie/permessi approvata.",
        variant: "destructive",
      });
      return;
    }
    
    // Ciclo di stati: vuoto -> lavoro -> ferie -> permesso -> vuoto
    let newType = "";
    
    if (currentCell.type === "") {
      newType = "work";
    } else if (currentCell.type === "work") {
      newType = "vacation";
    } else if (currentCell.type === "vacation") {
      newType = "leave";
    }
    
    // Trova tutte le celle dello stesso turno (consecutive con stesso shiftId)
    let startIndex = timeIndex;
    let endIndex = timeIndex;
    
    if (currentCell.shiftId) {
      // Elimina un turno esistente
      const shiftId = currentCell.shiftId;
      
      // Trova i limiti del turno
      for (let i = timeIndex; i >= 0; i--) {
        if (userDayData.cells[i].shiftId === shiftId) {
          startIndex = i;
        } else {
          break;
        }
      }
      
      for (let i = timeIndex; i < userDayData.cells.length; i++) {
        if (userDayData.cells[i].shiftId === shiftId) {
          endIndex = i;
        } else {
          break;
        }
      }
      
      // Cancella le celle
      for (let i = startIndex; i <= endIndex; i++) {
        userDayData.cells[i] = { type: "", shiftId: null };
      }
      
      // Elimina dal server
      deleteShiftMutation.mutate(shiftId);
      
      // Ricalcola ore totali
      recalculateTotal(userId, day, newGridData);
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
      
      // Aggiorna UI
      userDayData.cells[timeIndex] = { 
        type: newType, 
        shiftId: null // sarà aggiornato al prossimo caricamento
      };
      
      // Aggiorna totale ore
      if (newType === 'work') {
        userDayData.total += 0.5; // 30 minuti = 0.5 ore
      }
    }
    
    setGridData(newGridData);
  };
  
  // Ricalcola ore totali per un dipendente in un giorno
  const recalculateTotal = (userId: number, day: string, data: any) => {
    let total = 0;
    let continuousWork = false;
    let startTime = "";
    
    // Cerca blocchi continui di celle di tipo "work"
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
        
        // Aggiungi ore al totale
        total += getHourDifference(startTime, endTime);
      }
    });
    
    // Controlla se l'ultimo blocco arriva fino alla fine
    if (continuousWork) {
      const endTime = timeSlots[timeSlots.length - 1];
      total += getHourDifference(startTime, endTime);
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
  
  // Copia turni dal giorno selezionato al successivo
  const handleCopyDay = () => {
    if (!scheduleId || isPublished) return;
    
    const currentDay = weekDays[selectedDay].name;
    const nextDay = weekDays[(selectedDay + 1) % 7].name;
    
    toast({
      title: "Copiando il giorno",
      description: `Copiando gli orari da ${currentDay} a ${nextDay}...`,
    });
    
    // Per ogni dipendente, copia i suoi turni
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
            // Salva il blocco precedente
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
          // Fine di un blocco, salvalo
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
      
      // Gestisci l'ultimo blocco se arriva fino alla fine
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
  
  // Filtra solo i dipendenti attivi
  const activeEmployees = users.filter(user => user.role === "employee" && user.isActive);
  
  return (
    <div className="bg-white border rounded-lg shadow-sm p-4 pt-0">
      {/* Header e controlli */}
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
            variant={isPublished ? "outline" : "default"}
            size="sm"
            className={isPublished ? "" : "bg-green-600 hover:bg-green-700"}
            onClick={onPublish}
          >
            <span className="material-icons text-sm mr-1">publish</span>
            {isPublished ? "Ripubblica" : "Pubblica"}
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
      <div className="flex border-b overflow-x-auto">
        {weekDays.map((day, index) => (
          <button
            key={day.name}
            className={`py-2 px-4 text-sm font-medium whitespace-nowrap ${
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
      
      {/* Tabella turni in stile Excel */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border py-2 px-3 text-left font-medium sticky left-0 bg-gray-50 z-10 w-[180px]">
                Dipendente
              </th>
              {timeSlots.map((slot, index) => (
                <th key={index} className="border py-1 px-1 text-center text-xs font-medium" style={{ minWidth: '40px' }}>
                  {slot}
                </th>
              ))}
              <th className="border py-2 px-3 text-left font-medium w-[150px]">Note</th>
              <th className="border py-2 px-3 text-center font-medium w-[80px]">Totale</th>
            </tr>
          </thead>
          <tbody>
            {activeEmployees.map(employee => {
              const currentDay = weekDays[selectedDay].name;
              const userDayData = gridData[currentDay]?.[employee.id];
              
              return (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="border py-2 px-3 font-medium sticky left-0 bg-white z-10">
                    {employee.name}
                  </td>
                  
                  {userDayData?.cells.map((cell, index) => (
                    <td
                      key={index}
                      className={`border text-center ${
                        cell.type === "work"
                          ? "bg-blue-100 hover:bg-blue-200"
                          : cell.type === "vacation"
                            ? "bg-red-100 hover:bg-red-200"
                            : cell.type === "leave"
                              ? "bg-yellow-100 hover:bg-yellow-200"
                              : "hover:bg-gray-100"
                      } ${isPublished ? "" : "cursor-pointer"}`}
                      onClick={() => handleCellClick(employee.id, index, currentDay)}
                      title={
                        cell.isTimeOff
                          ? "Richiesta approvata (non modificabile)"
                          : isPublished 
                            ? "Pianificazione pubblicata (modifica e ripubblica)"
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
      
      {/* Messaggio stato pubblicazione */}
      {isPublished ? (
        <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200 text-blue-700 text-sm">
          <span className="material-icons text-sm align-middle mr-1">info</span>
          Questa pianificazione è stata pubblicata e i dipendenti possono visualizzarla. 
          Puoi apportare modifiche e fare clic su "Ripubblica" per aggiornare i turni.
        </div>
      ) : (
        <div className="mt-4 bg-yellow-50 p-3 rounded border border-yellow-200 text-yellow-700 text-sm">
          <span className="material-icons text-sm align-middle mr-1">warning</span>
          Questa pianificazione è attualmente in bozza. I dipendenti non possono visualizzarla finché non fai clic su "Pubblica".
        </div>
      )}
    </div>
  );
}