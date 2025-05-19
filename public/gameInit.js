/**
 * Game Initialization Script
 * Prepares the initial game button and sets up the basic event handlers
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Game initialization script loaded');
  
  // Make sure the game button exists (it should be in the HTML already)
  const gameButton = document.getElementById('game-launcher-btn');
  
  if (!gameButton) {
    // Create it if it doesn't exist
    console.log('Creating game launcher button');
    const newButton = document.createElement('button');
    newButton.id = 'game-launcher-btn';
    newButton.className = 'launch-game-btn';
    newButton.title = 'Launch Guessing Game';
    newButton.innerHTML = '🎮';
    
    // Add it to the body
    document.body.appendChild(newButton);
  } else {
    console.log('Game launcher button already exists');
  }
  
  // We don't add any click handlers here - that will be done by the GameUI component
});