import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { addDays, parseISO, format } from "date-fns";
import {
  insertUserSchema,
  insertScheduleSchema,
  insertShiftSchema,
  insertTimeOffRequestSchema,
  insertDocumentSchema,
  insertNotificationSchema
} from "@shared/schema";

// Initialize session store - Moved to auth.ts

// Funzione per la generazione automatica dei turni
async function generateAutomaticSchedule(
  startDate: string,
  endDate: string,
  users: any[],
  settings: {
    minHoursPerEmployee: number,
    maxHoursPerEmployee: number,
    startHour: string,
    endHour: string,
    distributeEvenly: boolean,
    respectTimeOffRequests: boolean
  },
  approvedTimeOffs: any[] = []
): Promise<any[]> {
  // Risultato: array di turni da generare
  const shifts: any[] = [];
  
  // Calcola il numero di giorni nel periodo
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days = [];
  
  // Crea un array di tutte le date nel periodo
  let currentDate = start;
  while (currentDate <= end) {
    days.push(format(currentDate, 'yyyy-MM-dd'));
    currentDate = addDays(currentDate, 1);
  }
  
  // Calcola per ogni dipendente i giorni in cui hanno ferie approvate
  const userTimeOffs: Record<number, string[]> = {};
  
  if (settings.respectTimeOffRequests) {
    // Inizializza l'oggetto per ogni utente
    users.forEach(user => {
      userTimeOffs[user.id] = [];
    });
    
    // Popola l'oggetto con i giorni di ferie
    approvedTimeOffs.forEach(timeOff => {
      const timeOffStart = parseISO(timeOff.startDate);
      const timeOffEnd = parseISO(timeOff.endDate);
      
      let current = timeOffStart;
      while (current <= timeOffEnd) {
        const dateStr = format(current, 'yyyy-MM-dd');
        
        // Se è mezza giornata, potremmo decidere diversamente in base alla logica aziendale
        // Qui per semplicità, anche una mezza giornata di ferie blocca l'intera giornata
        if (!userTimeOffs[timeOff.userId].includes(dateStr)) {
          userTimeOffs[timeOff.userId].push(dateStr);
        }
        
        current = addDays(current, 1);
      }
    });
  }
  
  // Calcola le ore totali per dipendente in base alla configurazione
  // Se distributeEvenly è true, tutti avranno ore simili
  let hoursPerEmployee: Record<number, number> = {};
  
  if (settings.distributeEvenly) {
    const totalEmployees = users.length;
    users.forEach(user => {
      // Calcola i giorni disponibili (totali - giorni di ferie)
      const availableDays = days.filter(day => !userTimeOffs[user.id]?.includes(day)).length;
      
      // Calcola le ore totali considerando i giorni disponibili
      const totalPossibleHours = availableDays * 8; // Assumiamo max 8 ore al giorno
      const targetHours = Math.min(settings.maxHoursPerEmployee, totalPossibleHours);
      
      hoursPerEmployee[user.id] = Math.max(settings.minHoursPerEmployee, targetHours);
    });
  } else {
    // Se non distribuiamo equamente, proviamo a dare il massimo delle ore a tutti
    users.forEach(user => {
      hoursPerEmployee[user.id] = settings.maxHoursPerEmployee;
    });
  }
  
  // Converti le ore di inizio e fine in numeri per facilitare i calcoli
  const startHourNum = parseInt(settings.startHour.split(':')[0]);
  const endHourNum = parseInt(settings.endHour.split(':')[0]);
  
  // Ore di lavoro disponibili in un giorno
  const hoursPerDay = endHourNum - startHourNum;
  
  // Per ogni giorno nel periodo
  days.forEach(day => {
    // Determina quanti dipendenti lavorano in questo giorno
    // Filtriamo i dipendenti che non hanno ferie in questo giorno
    const availableUsers = users.filter(user => !userTimeOffs[user.id]?.includes(day));
    
    // Se non ci sono dipendenti disponibili, salta questo giorno
    if (availableUsers.length === 0) return;
    
    // Distribuzione turni: per semplicità, facciamo turni di 8 ore o il massimo configurato
    // In un sistema reale, si potrebbe usare un algoritmo più sofisticato
    
    // Creiamo un array di ore per slot, ad esempio [8, 9, 10, ..., 17] per 8:00-18:00
    const timeSlots = [];
    for (let hour = startHourNum; hour < endHourNum; hour++) {
      timeSlots.push(hour);
    }
    
    // Distribuiamo i turni per questo giorno
    availableUsers.forEach(user => {
      // Verifica se questo utente ha ancora ore da assegnare
      if (hoursPerEmployee[user.id] <= 0) return;
      
      // Determiniamo la lunghezza del turno (4 o 8 ore in base alle ore rimaste)
      // Per semplicità, facciamo turni di 4 o 8 ore
      let shiftLength = 8;
      if (hoursPerEmployee[user.id] < 8) {
        shiftLength = 4;
      }
      
      // Se non ci sono abbastanza ore rimaste nella giornata, salta
      if (shiftLength > timeSlots.length) return;
      
      // Determina l'ora di inizio del turno
      // Per semplicità, partiamo dall'inizio della giornata
      const shiftStartHour = timeSlots[0];
      const shiftEndHour = shiftStartHour + shiftLength;
      
      // Aggiungi il turno
      shifts.push({
        userId: user.id,
        day,
        startTime: `${String(shiftStartHour).padStart(2, '0')}:00`,
        endTime: `${String(shiftEndHour).padStart(2, '0')}:00`,
        type: 'regular',
        notes: null,
        area: null
      });
      
      // Aggiorna le ore rimaste per questo dipendente
      hoursPerEmployee[user.id] -= shiftLength;
      
      // Rimuovi gli slot utilizzati
      timeSlots.splice(0, shiftLength);
    });
  });
  
  return shifts;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time notifications
  const wss = new WebSocketServer({ noServer: true });
  
  // Store WebSocket clients by userId
  const clients = new Map<number, WebSocket[]>();
  
  // Handle WebSocket connection
  wss.on("connection", (ws: WebSocket, userId: number) => {
    if (!clients.has(userId)) {
      clients.set(userId, []);
    }
    
    clients.get(userId)?.push(ws);
    
    ws.on("close", () => {
      const userClients = clients.get(userId);
      if (userClients) {
        const index = userClients.indexOf(ws);
        if (index > -1) {
          userClients.splice(index, 1);
        }
        
        if (userClients.length === 0) {
          clients.delete(userId);
        }
      }
    });
  });
  
  // Handle WebSocket upgrade
  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const userId = parseInt(url.searchParams.get("userId") || "0");
    
    if (!userId) {
      socket.destroy();
      return;
    }
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, userId);
    });
  });
  
  // Function to send notification to a user via WebSocket
  const sendNotification = (userId: number, notification: any) => {
    const userClients = clients.get(userId);
    if (userClients) {
      const message = JSON.stringify(notification);
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  };
  
  // AUTH SETUP IS NOW HANDLED BY setupAuth in auth.ts
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  
  // Middleware to check if user is admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user && (req.user as any).role === "admin") {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };
  
  // Authentication routes are handled in auth.ts
  
  // User management routes
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });
  
  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: err.errors });
      }
      res.status(400).json({ message: "Invalid user data" });
    }
  });
  
  // Bulk user creation
  app.post("/api/users/bulk", isAdmin, async (req, res) => {
    try {
      const { users } = req.body;
      
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ message: "Invalid user data. Expected array of users." });
      }
      
      const results = {
        createdCount: 0,
        failedCount: 0,
        failed: [] as string[]
      };
      
      // Process each user
      for (const userData of users) {
        try {
          // Validate user data
          const validUserData = insertUserSchema.parse(userData);
          
          // Check if username already exists
          const existingUser = await storage.getUserByUsername(validUserData.username);
          if (existingUser) {
            results.failedCount++;
            results.failed.push(`Username '${validUserData.username}' già esistente`);
            continue;
          }
          
          // Create user
          await storage.createUser(validUserData);
          results.createdCount++;
        } catch (validationError) {
          results.failedCount++;
          if (validationError instanceof z.ZodError) {
            results.failed.push(`Dati non validi per l'utente: ${userData.username || "unknown"}`);
          } else {
            results.failed.push(`Errore nella creazione dell'utente: ${userData.username || "unknown"}`);
          }
        }
      }
      
      res.status(201).json(results);
    } catch (error) {
      console.error("Error creating bulk users:", error);
      res.status(500).json({ message: "Error creating users" });
    }
  });
  
  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only admins or the user themselves can get user details
      if ((req.user as any).role !== "admin" && (req.user as any).id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });
  
  app.patch("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Don't allow changing username
      if (userData.username) {
        delete userData.username;
      }
      
      const user = await storage.updateUser(userId, userData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Schedule management routes
  // Ottieni tutte le programmazioni
  app.get("/api/schedules/all", isAuthenticated, async (req, res) => {
    try {
      const schedules = await storage.getAllSchedules();
      console.log("Retrieved all schedules:", schedules);
      res.json(schedules);
    } catch (err) {
      console.error("Error getting all schedules:", err);
      res.status(500).json({ message: "Failed to get schedules" });
    }
  });

  // Ottieni una programmazione specifica per data o l'attuale
  app.get("/api/schedules", isAuthenticated, async (req, res) => {
    try {
      // Se viene fornito un ID specifico, restituisce quella programmazione
      if (req.query.id) {
        const scheduleId = parseInt(req.query.id as string);
        const schedule = await storage.getSchedule(scheduleId);
        return res.json(schedule || null);
      }
      
      // Altrimenti cerca per intervallo di date
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      endDate.setDate(endDate.getDate() + 7); // Default to one week period
      
      const schedule = await storage.getScheduleByDateRange(startDate, endDate);
      res.json(schedule || null);
    } catch (err) {
      res.status(500).json({ message: "Failed to get schedule" });
    }
  });
  
  app.post("/api/schedules", isAdmin, async (req, res) => {
    try {
      const scheduleData = insertScheduleSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id
      });
      
      const schedule = await storage.createSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (err) {
      res.status(400).json({ message: "Invalid schedule data" });
    }
  });
  
  app.post("/api/schedules/:id/publish", isAdmin, async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      const schedule = await storage.publishSchedule(scheduleId);
      
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Get all users
      const users = await storage.getAllUsers();
      
      // Create notifications for all users
      for (const user of users) {
        if (user.isActive) {
          const notification = await storage.createNotification({
            userId: user.id,
            type: "schedule_update",
            message: "A new work schedule has been published",
            isRead: false,
            data: {
              scheduleId: schedule.id,
              startDate: schedule.startDate,
              endDate: schedule.endDate
            }
          });
          
          // Send real-time notification
          sendNotification(user.id, {
            type: "schedule_update",
            message: "A new work schedule has been published",
            data: notification
          });
        }
      }
      
      res.json(schedule);
    } catch (err) {
      res.status(500).json({ message: "Failed to publish schedule" });
    }
  });
  
  // Shift management routes
  app.get("/api/schedules/:scheduleId/shifts", isAuthenticated, async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.scheduleId);
      
      if ((req.user as any).role === "admin") {
        // Admins can see all shifts
        const shifts = await storage.getShifts(scheduleId);
        res.json(shifts);
      } else {
        // Employees can only see their own shifts
        const shifts = await storage.getUserShifts((req.user as any).id, scheduleId);
        res.json(shifts);
      }
    } catch (err) {
      res.status(500).json({ message: "Failed to get shifts" });
    }
  });
  
  app.post("/api/shifts", isAdmin, async (req, res) => {
    try {
      const shiftData = insertShiftSchema.parse(req.body);
      const shift = await storage.createShift(shiftData);
      
      const schedule = await storage.getSchedule(shiftData.scheduleId);
      
      // If the schedule is published, notify the user
      if (schedule && schedule.isPublished) {
        const notification = await storage.createNotification({
          userId: shiftData.userId,
          type: "shift_update",
          message: "Your work schedule has been updated",
          isRead: false,
          data: {
            shiftId: shift.id,
            scheduleId: shift.scheduleId,
            day: shift.day
          }
        });
        
        // Send real-time notification
        sendNotification(shiftData.userId, {
          type: "shift_update",
          message: "Your work schedule has been updated",
          data: notification
        });
      }
      
      res.status(201).json(shift);
    } catch (err) {
      res.status(400).json({ message: "Invalid shift data" });
    }
  });
  
  app.patch("/api/shifts/:id", isAdmin, async (req, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      const shiftData = req.body;
      
      const shift = await storage.updateShift(shiftId, shiftData);
      
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      const schedule = await storage.getSchedule(shift.scheduleId);
      
      // If the schedule is published, notify the user
      if (schedule && schedule.isPublished) {
        const notification = await storage.createNotification({
          userId: shift.userId,
          type: "shift_update",
          message: "Your work schedule has been updated",
          isRead: false,
          data: {
            shiftId: shift.id,
            scheduleId: shift.scheduleId,
            day: shift.day
          }
        });
        
        // Send real-time notification
        sendNotification(shift.userId, {
          type: "shift_update",
          message: "Your work schedule has been updated",
          data: notification
        });
      }
      
      res.json(shift);
    } catch (err) {
      res.status(500).json({ message: "Failed to update shift" });
    }
  });
  
  app.delete("/api/shifts/:id", isAdmin, async (req, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      const shift = await storage.deleteShift(shiftId);
      
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete shift" });
    }
  });
  
  // Auto-generation preview endpoint
  app.post("/api/schedules/preview", isAdmin, async (req, res) => {
    try {
      const { startDate, endDate, userIds, settings } = req.body;
      
      // Ottieni richieste di ferie approvate per il periodo specificato
      let approvedTimeOffs: any[] = [];
      if (settings.respectTimeOffRequests) {
        approvedTimeOffs = (await storage.getAllTimeOffRequests()).filter(
          request => 
            request.status === "approved" &&
            userIds.includes(request.userId) &&
            // Controllo sovrapposizione date
            (
              (new Date(request.startDate) >= new Date(startDate) && new Date(request.startDate) <= new Date(endDate)) ||
              (new Date(request.endDate) >= new Date(startDate) && new Date(request.endDate) <= new Date(endDate)) ||
              (new Date(request.startDate) <= new Date(startDate) && new Date(request.endDate) >= new Date(endDate))
            )
        );
      }
      
      // Dati utenti
      const users = await Promise.all(
        userIds.map(async (userId: number) => {
          const user = await storage.getUser(userId);
          return user;
        })
      );

      // Algoritmo di generazione automatica dei turni
      const shifts = await generateAutomaticSchedule(
        startDate,
        endDate,
        users.filter(Boolean) as any[],
        settings,
        approvedTimeOffs
      );
      
      // Restituisci anteprima
      res.json({
        startDate,
        endDate,
        isPublished: false,
        shifts
      });
    } catch (err) {
      console.error("Preview generation error:", err);
      res.status(500).json({ message: "Failed to generate schedule preview" });
    }
  });
  
  // Auto-generation and save endpoint
  app.post("/api/schedules/auto-generate", isAdmin, async (req, res) => {
    try {
      const { startDate, endDate, userIds, settings } = req.body;
      
      // Ottieni richieste di ferie approvate per il periodo specificato
      let approvedTimeOffs: any[] = [];
      if (settings.respectTimeOffRequests) {
        approvedTimeOffs = (await storage.getAllTimeOffRequests()).filter(
          request => 
            request.status === "approved" &&
            userIds.includes(request.userId) &&
            // Controllo sovrapposizione date
            (
              (new Date(request.startDate) >= new Date(startDate) && new Date(request.startDate) <= new Date(endDate)) ||
              (new Date(request.endDate) >= new Date(startDate) && new Date(request.endDate) <= new Date(endDate)) ||
              (new Date(request.startDate) <= new Date(startDate) && new Date(request.endDate) >= new Date(endDate))
            )
        );
      }
      
      // Dati utenti
      const users = await Promise.all(
        userIds.map(async (userId: number) => {
          const user = await storage.getUser(userId);
          return user;
        })
      );
      
      // Crea la pianificazione
      const schedule = await storage.createSchedule({
        startDate,
        endDate,
        isPublished: false,
        createdBy: (req.user as any).id
      });
      
      // Genera i turni automaticamente
      const shifts = await generateAutomaticSchedule(
        startDate,
        endDate,
        users.filter(Boolean) as any[],
        settings,
        approvedTimeOffs
      );
      
      // Salva i turni generati
      for (const shift of shifts) {
        await storage.createShift({
          ...shift,
          scheduleId: schedule.id
        });
      }
      
      res.status(201).json({
        ...schedule,
        shifts
      });
    } catch (err) {
      console.error("Auto-generation error:", err);
      res.status(500).json({ message: "Failed to auto-generate schedule" });
    }
  });
  
  // TimeOff request routes
  app.get("/api/time-off-requests", isAuthenticated, async (req, res) => {
    try {
      if ((req.user as any).role === "admin") {
        // Admins can see all requests
        const requests = await storage.getAllTimeOffRequests();
        res.json(requests);
      } else {
        // Employees can only see their own requests
        const requests = await storage.getUserTimeOffRequests((req.user as any).id);
        res.json(requests);
      }
    } catch (err) {
      res.status(500).json({ message: "Failed to get time-off requests" });
    }
  });
  
  // Get pending time off requests (admin only)
  app.get("/api/time-off-requests/pending", isAdmin, async (req, res) => {
    try {
      const requests = await storage.getPendingTimeOffRequests();
      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: "Failed to get pending time-off requests" });
    }
  });
  
  app.post("/api/time-off-requests", isAuthenticated, async (req, res) => {
    try {
      const requestData = insertTimeOffRequestSchema.parse({
        ...req.body,
        userId: (req.user as any).id
      });
      
      const request = await storage.createTimeOffRequest(requestData);
      
      // Notify admins about the new request
      const admins = (await storage.getAllUsers()).filter(user => user.role === "admin" && user.isActive);
      
      for (const admin of admins) {
        const notification = await storage.createNotification({
          userId: admin.id,
          type: "time_off_request",
          message: `New time-off request from ${(req.user as any).name}`,
          isRead: false,
          data: {
            requestId: request.id,
            userId: request.userId,
            userName: (req.user as any).name,
            startDate: request.startDate,
            endDate: request.endDate,
            type: request.type
          }
        });
        
        // Send real-time notification
        sendNotification(admin.id, {
          type: "time_off_request",
          message: `New time-off request from ${(req.user as any).name}`,
          data: notification
        });
      }
      
      res.status(201).json(request);
    } catch (err) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });
  
  app.post("/api/time-off-requests/:id/approve", isAdmin, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.approveTimeOffRequest(requestId, (req.user as any).id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Notify the user about the approval
      const notification = await storage.createNotification({
        userId: request.userId,
        type: "request_approved",
        message: "Your time-off request has been approved",
        isRead: false,
        data: {
          requestId: request.id,
          startDate: request.startDate,
          endDate: request.endDate,
          type: request.type
        }
      });
      
      // Send real-time notification
      sendNotification(request.userId, {
        type: "request_approved",
        message: "Your time-off request has been approved",
        data: notification
      });
      
      res.json(request);
    } catch (err) {
      res.status(500).json({ message: "Failed to approve request" });
    }
  });
  
  app.post("/api/time-off-requests/:id/reject", isAdmin, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.rejectTimeOffRequest(requestId, (req.user as any).id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Notify the user about the rejection
      const notification = await storage.createNotification({
        userId: request.userId,
        type: "request_rejected",
        message: "Your time-off request has been rejected",
        isRead: false,
        data: {
          requestId: request.id,
          startDate: request.startDate,
          endDate: request.endDate,
          type: request.type
        }
      });
      
      // Send real-time notification
      sendNotification(request.userId, {
        type: "request_rejected",
        message: "Your time-off request has been rejected",
        data: notification
      });
      
      res.json(request);
    } catch (err) {
      res.status(500).json({ message: "Failed to reject request" });
    }
  });
  
  // Document management routes
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      
      if ((req.user as any).role === "admin") {
        // Admins can see all documents
        const documents = await storage.getAllDocuments(type);
        res.json(documents);
      } else {
        // Employees can only see their own documents
        const documents = await storage.getUserDocuments((req.user as any).id, type);
        res.json(documents);
      }
    } catch (err) {
      res.status(500).json({ message: "Failed to get documents" });
    }
  });
  
  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Only admins or the document owner can view the document
      if ((req.user as any).role !== "admin" && (req.user as any).id !== document.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(document);
    } catch (err) {
      res.status(500).json({ message: "Failed to get document" });
    }
  });
  
  app.post("/api/documents", isAdmin, async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        uploadedBy: (req.user as any).id
      });
      
      const document = await storage.createDocument(documentData);
      
      // Notify the user about the new document
      const notification = await storage.createNotification({
        userId: document.userId,
        type: "document_upload",
        message: `New ${document.type === "payslip" ? "payslip" : "tax document"} available`,
        isRead: false,
        data: {
          documentId: document.id,
          type: document.type,
          period: document.period
        }
      });
      
      // Send real-time notification
      sendNotification(document.userId, {
        type: "document_upload",
        message: `New ${document.type === "payslip" ? "payslip" : "tax document"} available`,
        data: notification
      });
      
      res.status(201).json(document);
    } catch (err) {
      res.status(400).json({ message: "Invalid document data" });
    }
  });
  
  app.delete("/api/documents/:id", isAdmin, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const result = await storage.deleteDocument(documentId);
      
      if (!result) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });
  
  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications((req.user as any).id);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });
  
  app.post("/api/notifications/:id/mark-read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Only the notification owner can mark it as read
      if (notification.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(notification);
    } catch (err) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  
  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllUserNotificationsAsRead((req.user as any).id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });
  
  // Message routes
  app.get("/api/messages/received", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getUserReceivedMessages((req.user as any).id);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ message: "Failed to get received messages" });
    }
  });
  
  app.get("/api/messages/sent", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getUserSentMessages((req.user as any).id);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ message: "Failed to get sent messages" });
    }
  });
  
  app.get("/api/messages/:id", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      const userId = (req.user as any).id;
      // Verify that the user is either the sender or receiver of the message
      if (message.fromUserId !== userId && message.toUserId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // If the user is the receiver and the message is unread, mark it as read
      if (message.toUserId === userId && !message.isRead) {
        await storage.markMessageAsRead(messageId);
      }
      
      res.json(message);
    } catch (err) {
      res.status(500).json({ message: "Failed to get message" });
    }
  });
  
  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { toUserId, subject, content, relatedToShiftId } = req.body;
      
      if (!toUserId || !subject || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Verify that recipient exists
      const recipient = await storage.getUser(toUserId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      const message = await storage.createMessage({
        fromUserId: userId,
        toUserId,
        subject,
        content,
        relatedToShiftId
      });
      
      // Create a notification for the recipient
      await storage.createNotification({
        userId: toUserId,
        type: "new_message",
        message: `Hai ricevuto un nuovo messaggio: ${subject}`,
        isRead: false,
        data: { messageId: message.id }
      });
      
      res.status(201).json(message);
    } catch (err) {
      res.status(500).json({ message: "Failed to create message" });
    }
  });
  
  app.post("/api/messages/:id/mark-read", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Only the recipient can mark a message as read
      if (message.toUserId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedMessage = await storage.markMessageAsRead(messageId);
      res.json(updatedMessage);
    } catch (err) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });
  
  app.delete("/api/messages/:id", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      const userId = (req.user as any).id;
      // Only sender or recipient can delete a message
      if (message.fromUserId !== userId && message.toUserId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteMessage(messageId);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete message" });
    }
  });
  
  return httpServer;
}
