import {
  users, schedules, shifts, timeOffRequests, documents, notifications, messages,
  type User, type InsertUser,
  type Schedule, type InsertSchedule,
  type Shift, type InsertShift,
  type TimeOffRequest, type InsertTimeOffRequest,
  type Document, type InsertDocument,
  type Notification, type InsertNotification,
  type Message, type InsertMessage
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Schedule management
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  getSchedule(id: number): Promise<Schedule | undefined>;
  getScheduleByDateRange(startDate: Date, endDate: Date): Promise<Schedule | undefined>;
  publishSchedule(id: number): Promise<Schedule | undefined>;
  
  // Shift management
  createShift(shift: InsertShift): Promise<Shift>;
  getShifts(scheduleId: number): Promise<Shift[]>;
  getUserShifts(userId: number, scheduleId: number): Promise<Shift[]>;
  updateShift(id: number, shiftData: Partial<InsertShift>): Promise<Shift | undefined>;
  deleteShift(id: number): Promise<boolean>;
  
  // TimeOff requests
  createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest>;
  getTimeOffRequest(id: number): Promise<TimeOffRequest | undefined>;
  getUserTimeOffRequests(userId: number): Promise<TimeOffRequest[]>;
  getPendingTimeOffRequests(): Promise<TimeOffRequest[]>;
  getAllTimeOffRequests(): Promise<TimeOffRequest[]>;
  approveTimeOffRequest(id: number, approverId: number): Promise<TimeOffRequest | undefined>;
  rejectTimeOffRequest(id: number, approverId: number): Promise<TimeOffRequest | undefined>;
  
  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getUserDocuments(userId: number, type?: string): Promise<Document[]>;
  getAllDocuments(type?: string): Promise<Document[]>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllUserNotificationsAsRead(userId: number): Promise<boolean>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessage(id: number): Promise<Message | undefined>;
  getUserReceivedMessages(userId: number): Promise<Message[]>;
  getUserSentMessages(userId: number): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  deleteMessage(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private schedules: Map<number, Schedule>;
  private shifts: Map<number, Shift>;
  private timeOffRequests: Map<number, TimeOffRequest>;
  private documents: Map<number, Document>;
  private notifications: Map<number, Notification>;
  private messages: Map<number, Message>;
  
  private userCurrentId: number;
  private scheduleCurrentId: number;
  private shiftCurrentId: number;
  private timeOffRequestCurrentId: number;
  private documentCurrentId: number;
  private notificationCurrentId: number;
  private messageCurrentId: number;
  
  constructor() {
    this.users = new Map();
    this.schedules = new Map();
    this.shifts = new Map();
    this.timeOffRequests = new Map();
    this.documents = new Map();
    this.notifications = new Map();
    this.messages = new Map();
    
    this.userCurrentId = 1;
    this.scheduleCurrentId = 1;
    this.shiftCurrentId = 1;
    this.timeOffRequestCurrentId = 1;
    this.documentCurrentId = 1;
    this.notificationCurrentId = 1;
    this.messageCurrentId = 1;
    
    // Create default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      name: "Admin User",
      email: "admin@staffsync.com",
      role: "admin",
      isActive: true,
    });
  }
  
  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const user: User = { ...insertUser, id, lastLogin: now };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Schedule management
  async createSchedule(scheduleData: InsertSchedule): Promise<Schedule> {
    const id = this.scheduleCurrentId++;
    const now = new Date();
    const schedule: Schedule = {
      ...scheduleData,
      id,
      publishedAt: null,
      updatedAt: now
    };
    
    this.schedules.set(id, schedule);
    return schedule;
  }
  
  async getSchedule(id: number): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }
  
  async getScheduleByDateRange(startDate: Date, endDate: Date): Promise<Schedule | undefined> {
    return Array.from(this.schedules.values()).find(
      (schedule) => 
        new Date(schedule.startDate) <= endDate && 
        new Date(schedule.endDate) >= startDate
    );
  }
  
  async publishSchedule(id: number): Promise<Schedule | undefined> {
    const schedule = await this.getSchedule(id);
    if (!schedule) return undefined;
    
    const now = new Date();
    const updatedSchedule: Schedule = {
      ...schedule,
      isPublished: true,
      publishedAt: now,
      updatedAt: now
    };
    
    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }
  
  // Shift management
  async createShift(shiftData: InsertShift): Promise<Shift> {
    const id = this.shiftCurrentId++;
    const shift: Shift = { ...shiftData, id };
    
    this.shifts.set(id, shift);
    return shift;
  }
  
  async getShifts(scheduleId: number): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(
      (shift) => shift.scheduleId === scheduleId
    );
  }
  
  async getUserShifts(userId: number, scheduleId: number): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(
      (shift) => shift.userId === userId && shift.scheduleId === scheduleId
    );
  }
  
  async updateShift(id: number, shiftData: Partial<InsertShift>): Promise<Shift | undefined> {
    const shift = this.shifts.get(id);
    if (!shift) return undefined;
    
    const updatedShift: Shift = { ...shift, ...shiftData };
    this.shifts.set(id, updatedShift);
    return updatedShift;
  }
  
  async deleteShift(id: number): Promise<boolean> {
    return this.shifts.delete(id);
  }
  
  // TimeOff requests
  async createTimeOffRequest(requestData: InsertTimeOffRequest): Promise<TimeOffRequest> {
    const id = this.timeOffRequestCurrentId++;
    const now = new Date();
    const request: TimeOffRequest = {
      ...requestData,
      id,
      approvedBy: null,
      createdAt: now,
      updatedAt: now
    };
    
    this.timeOffRequests.set(id, request);
    return request;
  }
  
  async getTimeOffRequest(id: number): Promise<TimeOffRequest | undefined> {
    return this.timeOffRequests.get(id);
  }
  
  async getUserTimeOffRequests(userId: number): Promise<TimeOffRequest[]> {
    return Array.from(this.timeOffRequests.values()).filter(
      (request) => request.userId === userId
    );
  }
  
  async getPendingTimeOffRequests(): Promise<TimeOffRequest[]> {
    return Array.from(this.timeOffRequests.values()).filter(
      (request) => request.status === "pending"
    );
  }
  
  async getAllTimeOffRequests(): Promise<TimeOffRequest[]> {
    return Array.from(this.timeOffRequests.values());
  }
  
  async approveTimeOffRequest(id: number, approverId: number): Promise<TimeOffRequest | undefined> {
    const request = await this.getTimeOffRequest(id);
    if (!request) return undefined;
    
    const now = new Date();
    const updatedRequest: TimeOffRequest = {
      ...request,
      status: "approved",
      approvedBy: approverId,
      updatedAt: now
    };
    
    this.timeOffRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  async rejectTimeOffRequest(id: number, approverId: number): Promise<TimeOffRequest | undefined> {
    const request = await this.getTimeOffRequest(id);
    if (!request) return undefined;
    
    const now = new Date();
    const updatedRequest: TimeOffRequest = {
      ...request,
      status: "rejected",
      approvedBy: approverId,
      updatedAt: now
    };
    
    this.timeOffRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  // Documents
  async createDocument(documentData: InsertDocument): Promise<Document> {
    const id = this.documentCurrentId++;
    const now = new Date();
    const document: Document = {
      ...documentData,
      id,
      uploadedAt: now
    };
    
    this.documents.set(id, document);
    return document;
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async getUserDocuments(userId: number, type?: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.userId === userId && (!type || document.type === type)
    );
  }
  
  async getAllDocuments(type?: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => !type || document.type === type
    );
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
  
  // Notifications
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = this.notificationCurrentId++;
    const now = new Date();
    const notification: Notification = {
      ...notificationData,
      id,
      createdAt: now
    };
    
    this.notifications.set(id, notification);
    return notification;
  }
  
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === userId
    );
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification: Notification = {
      ...notification,
      isRead: true
    };
    
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  async markAllUserNotificationsAsRead(userId: number): Promise<boolean> {
    const userNotifications = await this.getUserNotifications(userId);
    
    userNotifications.forEach(notification => {
      this.notifications.set(notification.id, {
        ...notification,
        isRead: true
      });
    });
    
    return true;
  }
  
  // Message management
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    const now = new Date();
    
    const message: Message = {
      id,
      fromUserId: messageData.fromUserId,
      toUserId: messageData.toUserId,
      subject: messageData.subject,
      content: messageData.content,
      relatedToShiftId: messageData.relatedToShiftId || null,
      isRead: false,
      createdAt: now
    };
    
    this.messages.set(id, message);
    return message;
  }
  
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async getUserReceivedMessages(userId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.toUserId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getUserSentMessages(userId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.fromUserId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    
    if (!message) {
      return undefined;
    }
    
    const updatedMessage: Message = {
      ...message,
      isRead: true
    };
    
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  async deleteMessage(id: number): Promise<boolean> {
    return this.messages.delete(id);
  }
}

export const storage = new MemStorage();
