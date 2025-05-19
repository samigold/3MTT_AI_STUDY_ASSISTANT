/**
 * Socket Service
 * Handles communication with the server via Socket.IO
 */

/**
 * SocketService class implemented as a singleton
 * to ensure only one socket connection exists
 */
export class SocketService {
  static instance = null;
  static socket = null;
  
  /**
   * Get socket instance
   * @returns {Object} Socket.IO socket instance
   */  static getSocket() {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    
    // Check if socket is initialized; if not, try to initialize it
    if (!SocketService.socket && typeof window.io !== 'undefined') {
      SocketService.socket = window.io();
      console.log('Socket.IO connection established from getter');
    }
    
    return SocketService.socket;
  }
  
  constructor() {
    if (SocketService.instance) {
      return SocketService.instance;
    }
    
    SocketService.instance = this;
    try {
      // Connect to server using Socket.IO
      // We use the global io object that's loaded from socket.io.js in index.html
      if (typeof window.io !== 'undefined') {
        console.log('Socket.IO found, attempting to connect...');
        SocketService.socket = window.io();
        console.log('Socket.IO connection established');
        
        // Setup default listeners
        SocketService.socket.on('connect', () => {
          console.log('Connected to server with ID:', SocketService.socket.id);
        });
        
        // Add error handler
        SocketService.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });
        
        SocketService.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });
        
        SocketService.socket.on('disconnect', (reason) => {
          console.log('Disconnected from server:', reason);
        });
      } else {
        console.error('Socket.IO not available - add the socket.io.js script to your HTML');
        // Create a mock socket for graceful degradation
        SocketService.socket = this._createMockSocket();
      }
    } catch (err) {
      console.error('Error initializing socket service:', err);
      // Create a mock socket as fallback
      SocketService.socket = this._createMockSocket();
    }
  }
  
  /**
   * Create a mock socket for graceful degradation
   * @returns {Object} Mock socket with same API but no functionality
   * @private
   */
  _createMockSocket() {
    return {
      id: 'mock-socket',
      connected: false,
      on: () => console.warn('Mock socket: on() called'),
      off: () => console.warn('Mock socket: off() called'),
      emit: () => console.warn('Mock socket: emit() called'),
      disconnect: () => console.warn('Mock socket: disconnect() called')
    };
  }
}