/**
 * Game Debug Module
 * Handles debugging, recovery, and emergency fixes for the game system
 */

// Export utility functions that can help repair system issues
export function checkGameSystem() {
  console.log('Checking game system health...');
  
  // Check controller
  const hasController = window.gameController !== undefined;
  
  // Check UI
  const hasUI = hasController && window.gameController.ui !== undefined;
  
  // Check socket
  const hasSocket = hasController && window.gameController.socket !== undefined;
  
  // Check DOM elements
  const hasGameButton = document.getElementById('game-launcher-btn') !== null;
  
  return {
    hasController,
    hasUI,
    hasSocket,
    hasGameButton,
    allSystemsGo: hasController && hasUI && hasGameButton
  };
}

/**
 * Attempts to fix the game button if missing
 * @returns {Promise} Promise that resolves when the button is fixed
 */
export async function fixGameButton() {
  console.log('Attempting to fix game button...');
  return new Promise((resolve, reject) => {
    try {
      // Check if button already exists
      let gameBtn = document.getElementById('game-launcher-btn');
      
      if (!gameBtn) {
        console.log('Creating new game button...');
        // Create the button with all the necessary styles and positioning
        gameBtn = document.createElement('button');
        gameBtn.id = 'game-launcher-btn';
        gameBtn.className = 'launch-game-btn';
        gameBtn.title = 'Launch Game';
        gameBtn.innerHTML = '🎮';
        gameBtn.style.cssText = `
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          background-color: #5cb85c;
          color: white;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          border: none;
          font-size: 1.5rem;
          z-index: 990;
        `;
        
        // Add hover effect
        gameBtn.onmouseover = function() {
          this.style.transform = 'translateY(-5px) rotate(10deg)';
          this.style.backgroundColor = '#4caf50';
          this.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.15)';
        };
        
        gameBtn.onmouseout = function() {
          this.style.transform = '';
          this.style.backgroundColor = '#5cb85c';
          this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        };
        
        // Default click behavior (will be overridden by GameController)
        gameBtn.onclick = function() {
          console.log('Game button clicked - default handler');
          alert('Game controller not initialized. Please refresh the page and try again.');
        };
        
        // Add to document body
        document.body.appendChild(gameBtn);
      }
      
      console.log('Game button ready');
      resolve(gameBtn);
    } catch (err) {
      console.error('Error fixing game button:', err);
      reject(err);
    }
  });
}

/**
 * Force load the entire game system as an emergency measure
 */
export function forceLoadGameSystem() {
  console.log('Force loading game system...');
  
  try {
    // Try to create the button first
    fixGameButton()
      .then(() => {
        console.log('Button created, now initializing controller');
        // Try to initialize controller if missing
        if (!window.gameController) {
          // This assumes GameController is properly imported in game.js
          console.log('Game controller missing, attempting to create');
          // This would normally be handled by initializeGameController in game.js
        }
      })
      .catch(err => {
        console.error('Error during emergency recovery:', err);
      });
  } catch (err) {
    console.error('Critical error in force load:', err);
  }
}