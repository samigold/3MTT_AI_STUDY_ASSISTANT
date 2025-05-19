/**
 * 3MTT Guessing Game
 * Entry point that loads the modular game system
 * 
 * This module-based file ensures the game system is properly initialized
 * and connected to the game launch button that was created by gameInit.js
 */

// Import the modular system
import { GameController } from './js/controllers/GameController.js';
import * as GameDebug from './js/utils/GameDebug.js';
// Removed duplicate import and only use the namespace import

console.log('Game module loaded - initializing game system');

// Initialize game controller
let gameController = null;

// Status indicator for user feedback
let gameStatusIndicator = null;

// Floating game feed for immediate updates
let floatingGameFeed = null;
let floatingFeedItems = [];
const MAX_FEED_ITEMS_COLLAPSED = 3; // Maximum number of items to show in collapsed feed
const MAX_FEED_ITEMS_EXPANDED = 10; // Maximum number of items to show in expanded feed
let isGameFeedExpanded = false; // Track if the game feed is expanded

// Create a simple event system to track initialization
const gameInitEvents = {
  controllerInitialized: false,
  buttonConnected: false,
  uiInitialized: false
};

/**
 * Create or update the game status indicator
 * @param {string} status - Status message to display
 * @param {string} type - Type of status: 'info', 'success', 'warning', 'error'
 */
function updateGameStatus(status, type = 'info') {
  // Create the status indicator if it doesn't exist
  if (!gameStatusIndicator) {
    gameStatusIndicator = document.createElement('div');
    gameStatusIndicator.id = 'game-status-indicator';
    gameStatusIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(-10px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-width: 300px;
      text-align: center;
      pointer-events: none;
    `;
    document.body.appendChild(gameStatusIndicator);
    
    // Add the style for different status types
    const style = document.createElement('style');
    style.textContent = `
      #game-status-indicator.info {
        background-color: #2196F3;
        color: white;
      }
      #game-status-indicator.success {
        background-color: #4CAF50;
        color: white;
      }
      #game-status-indicator.warning {
        background-color: #FF9800;
        color: white;
      }
      #game-status-indicator.error {
        background-color: #F44336;
        color: white;
      }
      #game-status-indicator.visible {
        opacity: 1;
        transform: translateY(0);
      }
      @media (max-width: 768px) {
        #game-status-indicator {
          bottom: 10px;
          top: auto;
          left: 10px;
          right: 10px;
          max-width: calc(100% - 20px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Update the status indicator
  gameStatusIndicator.textContent = status;
  gameStatusIndicator.className = type;
  gameStatusIndicator.classList.add('visible');

  // Hide after a delay for non-error statuses
  if (type !== 'error') {
    setTimeout(() => {
      gameStatusIndicator.classList.remove('visible');
    }, 3000);
  }
  
  // Also add to floating feed for more persistent visibility
  addToFloatingFeed(status, type);
}

/**
 * Create and manage a floating feed of recent game events
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'info', 'success', 'warning', 'error'
 */
function addToFloatingFeed(message, type) {
  // Create the floating feed container if it doesn't exist and game controller is initialized
  if (!floatingGameFeed && gameController) {
    // Create container
    floatingGameFeed = document.createElement('div');
    floatingGameFeed.id = 'floating-game-feed';
    floatingGameFeed.style.cssText = `
      position: fixed;
      left: 10px;
      top: 10px;
      max-width: 320px;
      max-height: ${isGameFeedExpanded ? '350px' : '200px'};
      background-color: rgba(33, 33, 33, 0.85);
      backdrop-filter: blur(4px);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      transform: translateY(-150%);
    `;
    document.body.appendChild(floatingGameFeed);
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background-color: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;
    floatingGameFeed.appendChild(header);
    
    // Add title
    const title = document.createElement('span');
    title.textContent = 'Game Feed';
    title.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    header.appendChild(title);
      // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 8px;
    `;
    
    // Add clear button
    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '🗑️';
    clearBtn.title = 'Clear Feed';
    clearBtn.style.cssText = `
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      font-weight: normal;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    `;
    clearBtn.onclick = () => {
      clearFloatingFeed();
    };
    buttonsContainer.appendChild(clearBtn);
    
    // Add expand/collapse button
    const expandBtn = document.createElement('button');
    expandBtn.innerHTML = isGameFeedExpanded ? '&minus;' : '&plus;';
    expandBtn.title = isGameFeedExpanded ? 'Collapse Feed' : 'Expand Feed';
    expandBtn.style.cssText = `
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    `;
    expandBtn.onclick = () => {
      isGameFeedExpanded = !isGameFeedExpanded;
      expandBtn.innerHTML = isGameFeedExpanded ? '&minus;' : '&plus;';
      expandBtn.title = isGameFeedExpanded ? 'Collapse Feed' : 'Expand Feed';
      floatingGameFeed.style.maxHeight = isGameFeedExpanded ? '350px' : '200px';
      
      // Update feed display with new limit
      const maxItems = isGameFeedExpanded ? MAX_FEED_ITEMS_EXPANDED : MAX_FEED_ITEMS_COLLAPSED;
      while (floatingFeedItems.length > maxItems) {
        floatingFeedItems.shift();
      }
      updateFloatingFeedDisplay();
    };
    buttonsContainer.appendChild(expandBtn);
    
    // Add minimize button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Hide Feed';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    `;
    closeBtn.onclick = () => {
      floatingGameFeed.style.transform = 'translateY(-150%)';
      
      // Show the floating feed toggle button
      if (!document.getElementById('show-feed-btn')) {
        const showFeedBtn = document.createElement('button');
        showFeedBtn.id = 'show-feed-btn';
        showFeedBtn.innerHTML = '💬';
        showFeedBtn.title = 'Show Game Feed';
        showFeedBtn.style.cssText = `
          position: fixed;
          top: 10px;
          left: 10px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: var(--game-primary, #2196F3);
          color: white;
          border: none;
          cursor: pointer;
          font-size: 16px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        `;
        
        showFeedBtn.onclick = () => {
          if (floatingGameFeed) {
            floatingGameFeed.style.transform = 'translateY(0)';
            showFeedBtn.remove();
          }
        };
        
        // Add pulsing animation when there are new messages
        const pulseStyle = document.createElement('style');
        pulseStyle.textContent = `
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
          }
          
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
            50% { transform: scale(1.05); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
            100% { transform: scale(1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
          }
          
          .pulse {
            animation: pulse 1s infinite ease-in-out;
          }
        `;
        document.head.appendChild(pulseStyle);
        
        document.body.appendChild(showFeedBtn);
      }
    };
    buttonsContainer.appendChild(closeBtn);
    
    // Add buttons container to header
    header.appendChild(buttonsContainer);
    
    // Create feed container
    const feedContainer = document.createElement('div');
    feedContainer.style.cssText = `
      padding: 0;
      overflow-y: auto;
      max-height: ${isGameFeedExpanded ? '300px' : '150px'};
      transition: max-height 0.3s ease;
    `;
    floatingGameFeed.appendChild(feedContainer);
    
    // Create "View All" button
    const viewAllBtn = document.createElement('button');
    viewAllBtn.textContent = 'View Full Game';
    viewAllBtn.style.cssText = `
      background-color: rgba(255, 255, 255, 0.1);
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
      padding: 8px;
      width: 100%;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-top: auto;
    `;
    viewAllBtn.onmouseover = () => {
      viewAllBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    };
    viewAllBtn.onmouseout = () => {
      viewAllBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    };
    viewAllBtn.onclick = () => {
      // Find and click the game button to open the full game
      const gameBtn = document.getElementById('game-launcher-btn');
      if (gameBtn) {
        gameBtn.click();
      }
    };
    floatingGameFeed.appendChild(viewAllBtn);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .feed-item {
        padding: 8px 12px;
        font-size: 13px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        animation: fadein 0.3s;
        display: flex;
        align-items: flex-start;
      }
      
      .feed-item:last-child {
        border-bottom: none;
      }
      
      .feed-item.info {
        border-left: 3px solid #2196F3;
      }
      
      .feed-item.success {
        border-left: 3px solid #4CAF50;
      }
      
      .feed-item.warning {
        border-left: 3px solid #FF9800;
      }
      
      .feed-item.error {
        border-left: 3px solid #F44336;
      }
      
      .feed-icon {
        margin-right: 8px;
        width: 16px;
        height: 16px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        flex-shrink: 0;
        margin-top: 2px;
      }
      
      .feed-icon.info {
        background-color: #2196F3;
      }
      
      .feed-icon.success {
        background-color: #4CAF50;
      }
      
      .feed-icon.warning {
        background-color: #FF9800;
      }
      
      .feed-icon.error {
        background-color: #F44336;
      }
      
      @keyframes fadein {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Mobile adjustments */
      @media (max-width: 768px) {
        #floating-game-feed {
          left: 0;
          top: 0;
          width: 100%;
          max-width: none;
          border-radius: 0;
        }
        
        #show-feed-btn {
          bottom: 10px;
          top: auto;
          left: 10px;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        #floating-game-feed {
          background-color: rgba(20, 20, 20, 0.85);
        }
        
        #show-feed-btn {
          background-color: #1565c0;
        }
      }
    `;
    document.head.appendChild(style);
    
  // Animate entrance
    setTimeout(() => {
      floatingGameFeed.style.transform = 'translateY(0)';
      
      // Hide the original game feed when our floating feed appears
      const originalGameMessages = document.getElementById('gameMessages');
      if (originalGameMessages) {
        originalGameMessages.style.display = 'none';
      }
    }, 300);
  }

  // Add the message to the feed items array
  const timestamp = new Date().toLocaleTimeString();
  floatingFeedItems.push({
    message,
    type,
    timestamp
  });
  
  // Keep only the most recent messages
  const maxItems = isGameFeedExpanded ? MAX_FEED_ITEMS_EXPANDED : MAX_FEED_ITEMS_COLLAPSED;
  while (floatingFeedItems.length > maxItems) {
    floatingFeedItems.shift();
  }
  
  // Update the feed display
  updateFloatingFeedDisplay();
  
  // Pulse the show feed button if it exists and feed is hidden
  const showFeedBtn = document.getElementById('show-feed-btn');
  if (showFeedBtn && floatingGameFeed.style.transform !== 'translateY(0)') {
    showFeedBtn.classList.add('pulse');
    
    // Stop pulsing after a few seconds
    setTimeout(() => {
      showFeedBtn.classList.remove('pulse');
    }, 3000);
  }
}

/**
 * Update the floating feed display with current items
 */
function updateFloatingFeedDisplay() {
  if (!floatingGameFeed) return;
  
  // Find the feed container
  const feedContainer = floatingGameFeed.querySelector('div:nth-child(2)');
  if (!feedContainer) return;
  
  // Clear existing content
  feedContainer.innerHTML = '';
  
  // Add feed items
  floatingFeedItems.forEach(item => {
    const feedItem = document.createElement('div');
    feedItem.className = `feed-item ${item.type}`;
    
    // Create icon based on type
    const icon = document.createElement('span');
    icon.className = `feed-icon ${item.type}`;
    
    // Set icon content based on type
    switch (item.type) {
      case 'info':
        icon.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z"/></svg>';
        break;
      case 'success':
        icon.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        break;
      case 'warning':
        icon.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"/></svg>';
        break;
      case 'error':
        icon.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>';
        break;
      default:
        icon.innerHTML = 'ℹ️';
    }
    
    // Create message container
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
      flex-grow: 1;
      overflow: hidden;
    `;
    
    // Add message text
    const messageText = document.createElement('div');
    messageText.textContent = item.message;
    messageText.style.cssText = `
      color: #fff;
      white-space: normal;
      word-break: break-word;
    `;
    messageContainer.appendChild(messageText);
    
    // Format timestamp
    const formattedTime = formatTimestamp(item.timestamp);
    
    // Add timestamp
    const timestamp = document.createElement('div');
    timestamp.textContent = formattedTime;
    timestamp.style.cssText = `
      font-size: 10px;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 2px;
    `;
    messageContainer.appendChild(timestamp);
    
    // Assemble feed item
    feedItem.appendChild(icon);
    feedItem.appendChild(messageContainer);
    feedContainer.appendChild(feedItem);
  });
  
  // If feed is hidden, show it
  if (floatingGameFeed.style.transform !== 'translateY(0)') {
    floatingGameFeed.style.transform = 'translateY(0)';
    
    // Remove the show feed button if it exists
    const showFeedBtn = document.getElementById('show-feed-btn');
    if (showFeedBtn) {
      showFeedBtn.remove();
    }
  }
  
  // Auto-scroll to the bottom
  feedContainer.scrollTop = feedContainer.scrollHeight;
}

/**
 * Format a timestamp to display in a user-friendly way
 * @param {string} timestamp - The timestamp to format
 * @returns {string} The formatted timestamp
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const now = new Date();
  const msgTime = new Date(timestamp);
  
  // If the timestamp is from today, just show the time
  if (now.toDateString() === msgTime.toDateString()) {
    // Use the existing time format from timestamp
    return timestamp.split(' ')[0];
  }
  
  // Otherwise show a short date format
  return msgTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + 
         ' ' + timestamp.split(' ')[0];
}

/**
 * Play a sound notification for important game events
 * @param {string} type - The type of sound to play: 'info', 'success', 'warning', 'error'
 */
function playNotificationSound(type = 'info') {
  // Create audio context on demand
  if (!window.notificationAudioContext) {
    try {
      window.notificationAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Audio notifications not supported in this browser');
      return;
    }
  }
  
  const context = window.notificationAudioContext;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  
  // Configure based on notification type
  switch (type) {
    case 'success':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(659.25, context.currentTime); // E5
      oscillator.frequency.setValueAtTime(783.99, context.currentTime + 0.1); // G5
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.5);
      break;
      
    case 'error':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(330, context.currentTime); // E4
      oscillator.frequency.setValueAtTime(349.23, context.currentTime + 0.1); // F4
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.5);
      break;
      
    case 'warning':
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(466.16, context.currentTime); // A#4/Bb4
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
      break;
      
    default: // info
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
      gain.gain.setValueAtTime(0.07, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
  }
}

/**
 * Toggle the visibility of the floating feed
 */
function toggleFloatingFeed() {
  if (!floatingGameFeed) return;
  
  // Find the original bottom game feed container
  const originalGameMessages = document.getElementById('gameMessages');
  
  if (floatingGameFeed.style.transform === 'translateY(0px)') {
    // Hide floating feed
    floatingGameFeed.style.transform = 'translateY(-150%)';
    
    // Show the original game feed if it exists
    if (originalGameMessages) {
      originalGameMessages.style.display = '';
    }
    
    // Show toggle button
    if (!document.getElementById('show-feed-btn')) {
      const showFeedBtn = document.createElement('button');
      showFeedBtn.id = 'show-feed-btn';
      showFeedBtn.innerHTML = '💬';
      showFeedBtn.title = 'Show Game Feed';
      showFeedBtn.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: var(--game-primary, #2196F3);
        color: white;
        border: none;
        cursor: pointer;
        font-size: 16px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
      `;
      
      showFeedBtn.onclick = toggleFloatingFeed;
      document.body.appendChild(showFeedBtn);
    }
  } else {    // Show floating feed
    floatingGameFeed.style.transform = 'translateY(0)';
    
    // Hide the original game feed if it exists
    if (originalGameMessages) {
      originalGameMessages.style.display = 'none';
      
      // Sync any messages from the original feed that might have been added
      syncOriginalMessagesToFloatingFeed();
    }
    
    const showFeedBtn = document.getElementById('show-feed-btn');
    if (showFeedBtn) {
      showFeedBtn.remove();
    }
  }
}

/**
 * Add a high-priority notification that will show the feed even if it's hidden
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'info', 'success', 'warning', 'error' 
 */
function addHighPriorityNotification(message, type) {
  // First add to feed
  addToFloatingFeed(message, type);
  
  // Make sure feed is visible
  if (floatingGameFeed && floatingGameFeed.style.transform !== 'translateY(0px)') {
    toggleFloatingFeed();
  }
  
  // Play sound for immediate attention
  playNotificationSound(type);
}

/**
 * Clear all items from the floating feed
 */
function clearFloatingFeed() {
  floatingFeedItems = [];
  if (floatingGameFeed) {
    const feedContainer = floatingGameFeed.querySelector('div:nth-child(2)');
    if (feedContainer) {
      feedContainer.innerHTML = '';
    }
    addToFloatingFeed('Feed cleared', 'info');
  }
}

// Add keyboard shortcut listeners
document.addEventListener('keydown', (event) => {
  // Alt+F to toggle feed visibility
  if (event.altKey && event.key === 'f') {
    toggleFloatingFeed();
    event.preventDefault();
  }
  
  // Alt+C to clear feed
  if (event.altKey && event.key === 'c' && floatingGameFeed) {
    clearFloatingFeed();
    event.preventDefault();
  }
});

// Function to initialize the controller
function initializeGameController() {
  console.log('Initializing game controller');
  updateGameStatus('Initializing game system...', 'info');
  
  try {
    // Create controller
    gameController = new GameController();
    
    // Make controller available globally for debugging
    window.gameController = gameController;
    
    // Make gameDebug available globally for consistency
    window.gameDebug = GameDebug;
    
    // Make addToFloatingFeed function available globally so GameUI can use it
    window.addToFloatingFeed = addToFloatingFeed;
    
    // Connect to socket.io if available through controller
    if (gameController.socket) {
      console.log('Socket.io connection detected - setting up game event listeners');
      updateGameStatus('Connected to game server', 'success');
    }
    
    // Mark as initialized
    gameInitEvents.controllerInitialized = true;
    updateGameStatus('Game controller initialized', 'success');
    
    // Find the game launch button (created by gameInit.js)
    const launchBtn = document.getElementById('game-launcher-btn');
    if (launchBtn) {
      console.log('Found game launch button - attaching controller');
      updateGameStatus('Game button connected', 'info');
      
      // Create a new button to replace the old one (removes all existing handlers)
      const newBtn = launchBtn.cloneNode(true);
      if (launchBtn.parentNode) {
        launchBtn.parentNode.replaceChild(newBtn, launchBtn);
        
        // Add the proper click handler that's guaranteed to work
        newBtn.onclick = function() {
          console.log('FIXED Game button clicked - opening overlay');
          updateGameStatus('Opening game...', 'info');
          if (window.gameController && window.gameController.ui) {
            window.gameController.ui.openGameOverlay();
            updateGameStatus('Game ready!', 'success');
          } else {
            console.error('Game controller not available - attempting recovery');
            updateGameStatus('Repairing game system...', 'warning');
            // Replace alert with console warning
            console.warn('Please wait while we set up the game...');
            
            // Try to force load the system
            setTimeout(() => {
              if (window.gameDebug && window.gameDebug.forceLoadGameSystem) {
                window.gameDebug.forceLoadGameSystem();
                
                // Check again after loading
                setTimeout(() => {
                  if (window.gameController && window.gameController.ui) {
                    window.gameController.ui.openGameOverlay();
                    updateGameStatus('Game ready!', 'success');
                  } else {
                    updateGameStatus('Unable to load game. Redirecting...', 'error');
                    window.location.href = 'game-launcher.html'; // Last resort
                  }
                }, 500);
              }
            }, 100);
          }
        };
        
        // Mark button as connected
        gameInitEvents.buttonConnected = true;
      }
    } else {
      console.error('Game launch button not found - attempting recovery');
      updateGameStatus('Game button not found. Creating...', 'warning');
      // Use async fixGameButton with proper error handling
      GameDebug.fixGameButton()
        .then(() => {
          console.log('Button fix completed');
          gameInitEvents.buttonConnected = true;
          updateGameStatus('Game button created successfully', 'success');
          
          // Add a welcome message to the floating feed
          addToFloatingFeed('Welcome to the 3MTT Guessing Game!', 'success');
          addToFloatingFeed('Use this feed to stay updated on game events', 'info');
        })
        .catch(err => {
          console.error('Error during button fix:', err);
          updateGameStatus('Failed to create game button', 'error');
        });
    }
    
    // Verify system status
    setTimeout(() => {
      const status = GameDebug.checkGameSystem();
      console.log('Game system status:', status);
      
      if (status.allSystemsGo) {
        updateGameStatus('Game system ready!', 'success');
        addToFloatingFeed('Game system is fully operational', 'success');
      } else {
        updateGameStatus('Game system needs repair', 'warning');
        addToFloatingFeed('Some game features may not be working properly', 'warning');
        console.warn('Some game systems are not working properly. Attempting repair...');
        GameDebug.fixGameButton()
          .then(() => {
            updateGameStatus('Game system repaired', 'success');
            addToFloatingFeed('Game system has been repaired', 'success');
          })
          .catch(err => {
            console.error('Error fixing button:', err);
            updateGameStatus('Error repairing game', 'error');
            addToFloatingFeed('Unable to repair game system. Refresh the page to try again.', 'error');
          });
      }
      
      // Set UI initialized flag based on status
      gameInitEvents.uiInitialized = status.uiInitialized;
      
      // Log final initialization status
      console.log('Game system verification complete:', 
                 status.allSystemsGo ? 'Success' : 'Issues detected');
    }, 1000);
    
    console.log('Game controller initialization process started');
  } catch (error) {
    console.error('Error initializing game controller:', error);
    updateGameStatus('Error initializing game', 'error');
    // Emergency button creation in case of error
    GameDebug.fixGameButton()
      .catch(err => {
        console.error('Error during emergency button creation:', err);
        updateGameStatus('Critical error in game system', 'error');
      });
  }
}

// Add handler to listen for game events from controller
function listenForGameEvents() {
  if (window.gameController && window.gameController.on) {
    // Listen for game start events
    window.gameController.on('gameStarted', (data) => {
      updateGameStatus(`Game started: ${data.gameName || 'New Game'}`, 'success');
    });
    
    // Listen for round start/end events
    window.gameController.on('roundStarted', () => {
      updateGameStatus('New round started!', 'info');
    });
    
    window.gameController.on('roundEnded', (result) => {
      if (result.winner) {
        updateGameStatus(`Round ended. Winner: ${result.winner}`, 'success');
      } else {
        updateGameStatus('Round ended', 'info');
      }
    });
    
    // Listen for connection issues
    window.gameController.on('connectionError', () => {
      updateGameStatus('Connection issue detected', 'error');
      addHighPriorityNotification('Connection to game server lost. Please check your internet connection.', 'error');
    });
    
    window.gameController.on('connectionRestored', () => {
      updateGameStatus('Connection restored', 'success');
      addToFloatingFeed('Connection to game server has been restored', 'success');
    });

    // Socket.io event listeners for game updates
    if (window.gameController.socket) {
      const socket = window.gameController.socket;

      // Game setup events
      socket.on('gameCreated', ({ gameId }) => {
        addHighPriorityNotification(`Game created! ID: ${gameId}`, 'success');
      });

      socket.on('gameJoined', () => {
        addHighPriorityNotification('You joined the game!', 'success');
      });

      socket.on('playerJoined', ({ name, isAI }) => {
        addToFloatingFeed(`${name}${isAI ? ' (AI)' : ''} joined the game`, 'info');
      });

      socket.on('updatePlayers', (players) => {
        const count = players.length;
        addToFloatingFeed(`${count} player${count !== 1 ? 's' : ''} in the game`, 'info');
      });

      socket.on('questionsAdded', ({ count }) => {
        addToFloatingFeed(`${count} question${count !== 1 ? 's' : ''} added`, 'success');
      });

      // Game progress events
      socket.on('gameStarted', ({ question, options, isMultipleChoice }) => {
        addHighPriorityNotification('Game started! A new question was posed.', 'success');
        
        if (isMultipleChoice) {
          addToFloatingFeed('This is a multiple choice question', 'info');
        }
      });

      socket.on('timerUpdate', ({ timeLeft }) => {
        if (timeLeft === 30 || timeLeft === 15 || timeLeft === 10 || timeLeft === 5) {
          if (timeLeft <= 10) {
            addHighPriorityNotification(`${timeLeft} seconds remaining!`, 'warning');
          } else {
            addToFloatingFeed(`${timeLeft} seconds remaining`, 'info');
          }
        }
      });

      socket.on('playerGuessed', ({ playerName, remainingAttempts, guess, isAI }) => {
        addToFloatingFeed(`${playerName} made a wrong guess (${remainingAttempts} attempts left)`, 'info');
      });

      socket.on('wrongGuess', ({ remainingAttempts, message }) => {
        if (remainingAttempts === 0) {
          addHighPriorityNotification('No more attempts left!', 'error');
        } else {
          addToFloatingFeed(message, 'warning');
        }
      });

      socket.on('aiGuessedCorrect', ({ playerName, answer }) => {
        addHighPriorityNotification(`${playerName} guessed correctly: "${answer}"`, 'success');
      });

      // Round completion events
      socket.on('roundEnded', ({ winner, answer, scores, currentRound, totalRounds }) => {
        addToFloatingFeed(`Round ${currentRound} of ${totalRounds} ended. The answer was: ${answer}`, 'info');
        addHighPriorityNotification(`${winner.name} won this round!`, 'success');
      });

      socket.on('newRound', ({ roundNumber, totalRounds, newMasterName, isAIMaster }) => {
        addHighPriorityNotification(`Round ${roundNumber} of ${totalRounds} starting!`, 'info');
        addToFloatingFeed(`${newMasterName}${isAIMaster ? ' (AI)' : ''} is the new game master`, 'info');
      });

      socket.on('aiHostingRound', ({ aiName, topic, questionCount }) => {
        addHighPriorityNotification(`${aiName} is hosting with ${questionCount} questions about "${topic}"`, 'info');
      });

      socket.on('gameEnded', ({ winner, finalScores, newMaster }) => {
        addHighPriorityNotification(`Game over! ${winner.name} wins with ${winner.score} points!`, 'success');
      });

      socket.on('newGameMaster', ({ masterName }) => {
        addToFloatingFeed(`${masterName} is now the game master`, 'info');
      });

      socket.on('gameRestarted', () => {
        addHighPriorityNotification('Game has been restarted', 'info');
      });

      socket.on('playerLeft', ({ name }) => {
        addToFloatingFeed(`${name} has left the game`, 'warning');
      });

      socket.on('error', (message) => {
        addHighPriorityNotification(message, 'error');
      });
    }
  }
}

/**
 * Sync messages from the original game feed to the floating feed
 * This ensures we don't miss messages that may have been added directly to the original feed
 */
function syncOriginalMessagesToFloatingFeed() {
  const originalMessages = document.getElementById('messages');
  if (!originalMessages) return;
  
  // Get all message elements from the original feed
  const messageElements = originalMessages.querySelectorAll('.message');
  if (!messageElements.length) return;
  
  // Add each message to our floating feed with appropriate type
  messageElements.forEach(message => {
    // Skip if the message is already in our feed (simple duplicate check by text content)
    if (floatingFeedItems.some(item => item.message === message.textContent)) {
      return;
    }
    
    let type = 'info';
    if (message.classList.contains('system-message')) {
      type = 'info';
    } else if (message.classList.contains('correct-answer')) {
      type = 'success';
    } else if (message.classList.contains('wrong-answer')) {
      type = 'error';
    } else if (message.classList.contains('player-message')) {
      type = 'info';
    }
    
    addToFloatingFeed(message.textContent, type);
  });
}

/**
 * Set up a mutation observer to watch for changes to the original game messages
 * This ensures we catch any messages added directly to the original feed
 */
function setupOriginalMessagesSyncObserver() {
  const originalMessages = document.getElementById('messages');
  if (!originalMessages) return;
  
  // Create a new observer
  const observer = new MutationObserver((mutations) => {
    // When changes are detected, sync messages to our floating feed
    syncOriginalMessagesToFloatingFeed();
  });
  
  // Start observing
  observer.observe(originalMessages, {
    childList: true,  // Watch for changes to child elements
    subtree: true,    // Watch the entire subtree
    characterData: true // Watch for character data changes
  });
}

// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    initializeGameController();
    
    // Setup event listeners after controller is ready
    setTimeout(listenForGameEvents, 1500);
    
    // Setup mutation observer for original messages
    setTimeout(setupOriginalMessagesSyncObserver, 2000);
  }, 100); // Small delay to ensure DOM is ready
} else {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      initializeGameController();
          // Don't show onboarding instructions yet, they will be shown when the game is opened
      // We'll move these messages to the GameUI openGameOverlay method
      
      // Setup event listeners after controller is ready
      setTimeout(listenForGameEvents, 1500);
      
      // Setup mutation observer for original messages
      setTimeout(setupOriginalMessagesSyncObserver, 2000);
    }, 100);
  });
}
