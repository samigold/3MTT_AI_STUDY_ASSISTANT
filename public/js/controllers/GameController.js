/**
 * Game Controller
 * Main controller for the 3MTT Guessing Game
 */

// Import socket service
import { SocketService } from '../services/SocketService.js';
import { GameUI } from '../components/GameUI.js';

// Define events 
const EVENTS = {
  GAME_CREATED: 'gameCreated',
  GAME_JOINED: 'gameJoined',
  GAME_STARTED: 'gameStarted',
  ROUND_ENDED: 'roundEnded',
  GAME_ENDED: 'gameEnded',
  UPDATE_PLAYERS: 'updatePlayers',
  ERROR: 'error'
};

/**
 * Main Game Controller class
 */
export class GameController {
  constructor() {
    // Initialize event handlers storage
    this.eventHandlers = new Map();
    
    // Create socket connection
    this.socket = SocketService.getSocket();
    
    // Initialize UI
    this.ui = new GameUI(this);
    
    // Connect event listeners
    this._connectSocketEvents();
    this._connectUIEvents();
    
    console.log('Game Controller initialized');
  }
  
  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {function} callback - Event callback function
   */
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);
  }
  
  /**
   * Remove event handler
   * @param {string} event - Event name
   * @param {function} callback - Event callback function
   */
  off(event, callback) {
    if (!this.eventHandlers.has(event)) return;
    
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(callback);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  /**
   * Trigger event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  trigger(event, data) {
    if (!this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
  
  /**
   * Create a new game
   * @param {string} playerName - The name of the player
   */  createGame(playerName) {
    console.log('Creating game with player name:', playerName);
    if (!this.socket) {
      console.error('Socket not initialized when trying to create game');
      if (typeof window.addToFloatingFeed === 'function') {
        window.addToFloatingFeed('Error: Cannot connect to game server', 'error');
      }
      return;
    }
    this.socket.emit('createGame', { playerName });
    console.log('Create game request sent to server');
  }
  
  /**
   * Join an existing game
   * @param {string} gameId - The ID of the game to join
   * @param {string} playerName - The name of the player
   */
  joinGame(gameId, playerName) {
    this.socket.emit('joinGame', { gameId, playerName });
  }
  
  /**
   * Add questions to the game
   * @param {string} gameId - The ID of the game
   * @param {Array} questions - Array of question objects
   */
  addQuestions(gameId, questions) {
    this.socket.emit('addQuestions', { gameId, questions });
  }
  
  /**
   * Start the game
   * @param {string} gameId - The ID of the game
   */
  startGame(gameId) {
    console.log('Starting game with ID:', gameId);
    this.socket.emit('startGame', { gameId });
  }
  
  /**
   * Add an AI player to the game
   * @param {string} gameId - The ID of the game to add an AI player to
   */
  addAIPlayer(gameId) {
    console.log('Adding AI player to game with ID:', gameId);
    this.socket.emit('addAIPlayer', { gameId });
  }
  
  /**
   * Make a guess
   * @param {string} gameId - The ID of the game
   * @param {string} guess - The player's guess
   * @param {number} optionIndex - Index of the selected option (for multiple choice)
   */
  makeGuess(gameId, guess, optionIndex) {
    this.socket.emit('makeGuess', { gameId, guess, optionIndex });
  }
  
  /**
   * Generate AI questions
   * @param {string} course - Course topic
   * @param {string} topic - Specific topic
   * @param {boolean} isMultipleChoice - Whether to generate multiple choice questions
   * @param {number} questionCount - Number of questions to generate
   */
  generateAIQuestions(course, topic, isMultipleChoice, questionCount) {
    return new Promise((resolve, reject) => {
      // Set up one-time listener for AI response
      const onQuestionsGenerated = (data) => {
        resolve(data.questions);
        this.socket.off('aiQuestionsGenerated', onQuestionsGenerated);
      };
      
      const onError = (error) => {
        if (error === 'Failed to generate questions') {
          reject(new Error(error));
          this.socket.off('error', onError);
        }
      };
      
      this.socket.on('aiQuestionsGenerated', onQuestionsGenerated);
      this.socket.on('error', onError);
      
      // Request questions
      this.socket.emit('getAIQuestions', { 
        course, 
        topic, 
        isMultipleChoice, 
        questionCount 
      });
    });
  }
    /**
   * Connect socket event listeners
   * @private
   */
  _connectSocketEvents() {
    // Game flow events
    this.socket.on('gameCreated', (data) => {
      console.log('Game created event received:', data);
      this.trigger(EVENTS.GAME_CREATED, data);
    });
    
    this.socket.on('gameJoined', (data) => {
      console.log('Game joined event received:', data);
      this.trigger(EVENTS.GAME_JOINED, data);
    });
    
    this.socket.on('gameStarted', (data) => {
      console.log('Game started event received:', data);
      // Ensure we have the multiple choice data if provided
      if (data.options && data.isMultipleChoice) {
        console.log('Multiple choice question detected:', {
          question: data.question,
          optionsCount: data.options.length,
          isMultipleChoice: data.isMultipleChoice
        });
      }
      this.trigger(EVENTS.GAME_STARTED, data);
    });
    
    this.socket.on('roundEnded', (data) => {
      this.trigger(EVENTS.ROUND_ENDED, data);
    });
    
    this.socket.on('gameEnded', (data) => {
      this.trigger(EVENTS.GAME_ENDED, data);
    });
    
    // Player updates
    this.socket.on('updatePlayers', (data) => {
      this.trigger(EVENTS.UPDATE_PLAYERS, data);
    });
    
    // Error handling
    this.socket.on('error', (error) => {
      this.trigger(EVENTS.ERROR, error);
    });
    
    // Keep additional events from server.js
  }
  
  /**
   * Connect UI event listeners
   * @private
   */
  _connectUIEvents() {
    // UI event listeners will be handled by GameUI class
  }
}