import { getWsUrl } from './config';

/**
 * WebSocket service for real-time notifications
 */
class WebSocketService {
  private socket: WebSocket | null = null;
  private userId: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  
  /**
   * Initialize WebSocket connection for a user
   * @param userId User ID for the WebSocket connection
   */
  connect(userId: number): void {
    if (this.socket) {
      this.disconnect();
    }
    
    this.userId = userId;
    const wsUrl = getWsUrl(userId);
    
    try {
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.socket?.close();
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }
  
  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.userId = null;
    this.reconnectAttempts = 0;
  }
  
  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }
  
  /**
   * Add event listener for WebSocket messages
   * @param type Event type to listen for
   * @param callback Callback function to execute when event is received
   */
  addEventListener(type: string, callback: (data: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)?.add(callback);
  }
  
  /**
   * Remove event listener
   * @param type Event type
   * @param callback Callback function to remove
   */
  removeEventListener(type: string, callback: (data: any) => void): void {
    if (this.listeners.has(type)) {
      this.listeners.get(type)?.delete(callback);
    }
  }
  
  /**
   * Notify all listeners of an event
   * @param data Event data
   */
  private notifyListeners(data: any): void {
    if (data && data.type) {
      const listeners = this.listeners.get(data.type);
      
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('Error in WebSocket listener callback:', error);
          }
        });
      }
    }
  }
  
  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService(); 