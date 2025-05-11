import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import MemoryStore from "memorystore";
import { WebSocketServer, WebSocket } from "ws";
import {
  insertUserSchema,
  insertScheduleSchema,
  insertShiftSchema,
  insertTimeOffRequestSchema,
  insertDocumentSchema,
  insertNotificationSchema
} from "@shared/schema";

// Initialize session store
const MemorySessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
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
  
  // Setup session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "keyboard cat",
      resave: false,
      saveUninitialized: false,
      store: new MemorySessionStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      })
    })
  );
  
  // Setup passport for authentication
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password" });
        }
        
        if (!user.isActive) {
          return done(null, false, { message: "User account is disabled" });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );
  
  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  
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
  
  // Authentication routes
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
  });
  
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ success: true });
    });
  });
  
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.json({ user: null });
    }
  });
  
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
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid user data" });
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
  app.get("/api/schedules", isAuthenticated, async (req, res) => {
    try {
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
  
  // TimeOff request routes
  app.get("/api/time-off-requests", isAuthenticated, async (req, res) => {
    try {
      if ((req.user as any).role === "admin") {
        // Admins can see all pending requests
        const requests = await storage.getPendingTimeOffRequests();
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
  
  return httpServer;
}
