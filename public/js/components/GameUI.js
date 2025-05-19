/**
 * Game UI Component
 * Handles UI elements and interactions for the game
 */

/**
 * Game UI Class
 */
export class GameUI {
  /**
   * Constructor
   * @param {Object} controller - The game controller instance
   */
  constructor(controller) {
    this.controller = controller;
    this.gameOverlay = null;
    this.gameContainer = null;
    this.isOpen = false;
    this.currentGameId = null; // Store the current game ID
    
    // Setup event handlers
    this._setupLaunchButton();
    this._setupControllerEvents(); // Add controller event listeners
  }
  
  /**
   * Setup the game launch button
   * @private
   */
  _setupLaunchButton() {
    const launchBtn = document.getElementById('game-launcher-btn');
    if (launchBtn) {
      console.log('Setting up game launch button');
      launchBtn.onclick = () => {
        this.openGameOverlay();
      };
    } else {
      console.warn('Game launch button not found!');
    }
  }
    /**
   * Open the game overlay
   */
  openGameOverlay() {
    if (this.isOpen) return;
    this.isOpen = true;
    
    // Create overlay if it doesn't exist
    if (!this.gameOverlay) {
      this._createGameOverlay();
    }

    // Show overlay
    this.gameOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind overlay
    
    // Set animation to fade in
    setTimeout(() => {
      this.gameOverlay.style.opacity = '1';
      
      // Show welcome messages when game is actually opened
      if (typeof window.addToFloatingFeed === 'function') {
        window.addToFloatingFeed('Welcome to the 3MTT Guessing Game!', 'info');
        window.addToFloatingFeed('This floating feed will keep you updated on game events', 'info');
        window.addToFloatingFeed('Click the X to hide the feed, and the 💬 icon to bring it back', 'info');
      }
    }, 10);
  }
  
  /**
   * Close the game overlay
   */
  closeGameOverlay() {
    if (!this.isOpen || !this.gameOverlay) return;
    
    // Set animation to fade out
    this.gameOverlay.style.opacity = '0';
    
    // Remove after animation completes
    setTimeout(() => {
      this.gameOverlay.style.display = 'none';
      document.body.style.overflow = ''; // Restore scrolling
      this.isOpen = false;
    }, 300);
  }
  
  /**
   * Create the game overlay elements
   * @private
   */
  _createGameOverlay() {
    // Create overlay
    this.gameOverlay = document.createElement('div');
    this.gameOverlay.className = 'game-overlay';
    this.gameOverlay.style.opacity = '0';
    this.gameOverlay.style.transition = 'opacity 0.3s ease';
    
    // Create container
    this.gameContainer = document.createElement('div');
    this.gameContainer.className = 'game-container';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'game-header';
    
    const title = document.createElement('h2');
    title.textContent = '3MTT Guessing Game';
    
    const description = document.createElement('p');
    description.textContent = 'Test your knowledge with fun, interactive questions!';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-game-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close Game';
    closeBtn.onclick = () => this.closeGameOverlay();
    
    header.appendChild(title);
    header.appendChild(description);
    header.appendChild(closeBtn);
    
    // Create content area
    const content = document.createElement('div');
    content.className = 'game-content';
    
    // Create game sections
    
    // Game Setup Section
    const setupSection = document.createElement('div');
    setupSection.className = 'game-section game-setup-section';
    setupSection.innerHTML = `
      <h3>Let's Play!</h3>
      <p>Enter your name to start or join a game.</p>
      <input type="text" class="player-name-input" placeholder="Your Name" id="game-player-name">
      
      <div class="game-setup-buttons">
        <button class="game-btn" id="create-game-btn">Create New Game</button>
        
        <div class="join-game-row">
          <input type="text" class="player-name-input" placeholder="Game ID" id="game-id-input">
          <button class="game-btn" id="join-game-btn">Join Game</button>
        </div>
      </div>
      
      <p>Or try our AI generated questions!</p>
      
      <div class="topic-input-row">
        <select class="course-select" id="game-course-select">
          <option value="">Select a course/topic</option>
          <option value="Web Development">Web Development</option>
          <option value="JavaScript">JavaScript</option>
          <option value="Python">Python</option>
          <option value="Data Science">Data Science</option>
          <option value="Machine Learning">Machine Learning</option>
        </select>
        
        <input type="text" class="topic-input" placeholder="Specific Topic (Optional)" id="game-topic-input">
      </div>
      
      <div class="question-controls">
        <div class="toggle-container">
          <span>Multiple Choice:</span>
          <label class="switch">
            <input type="checkbox" id="multiple-choice-toggle">
            <span class="slider round"></span>
          </label>
        </div>
        
        <div class="question-count-selector">
          <span>Questions:</span>
          <select class="question-count" id="question-count-select">
            <option value="3">3</option>
            <option value="5" selected>5</option>
            <option value="10">10</option>
          </select>
        </div>
      </div>
      
      <div class="game-setup-buttons">
        <button class="game-btn" id="generate-ai-questions">Generate AI Questions</button>
      </div>
    `;
    
    // Assemble game UI
    content.appendChild(setupSection);
    
    // Game messages section (will be populated dynamically)
    const messagesSection = document.createElement('div');
    messagesSection.className = 'game-section';
    messagesSection.innerHTML = `
      <h3>Game Messages</h3>
      <div class="game-messages" id="gameMessages"></div>
    `;
    content.appendChild(messagesSection);
    
    // Add to container and overlay
    this.gameContainer.appendChild(header);
    this.gameContainer.appendChild(content);
    this.gameOverlay.appendChild(this.gameContainer);
    
    // Add to DOM
    document.body.appendChild(this.gameOverlay);
    
    // Setup event handlers
    this._setupEventHandlers();
  }
  
  /**
   * Setup event handlers for game UI elements
   * @private
   */
  _setupEventHandlers() {
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const generateAIBtn = document.getElementById('generate-ai-questions');
    
    if (createGameBtn) {
      createGameBtn.onclick = () => {
        const playerName = document.getElementById('game-player-name').value.trim();
        if (playerName) {
          this.controller.createGame(playerName);
        } else {
          this._addMessage('Please enter your name first', 'system-message');
        }
      };
    }
    
    if (joinGameBtn) {
      joinGameBtn.onclick = () => {
        const playerName = document.getElementById('game-player-name').value.trim();
        const gameId = document.getElementById('game-id-input').value.trim();
        
        if (!playerName) {
          this._addMessage('Please enter your name first', 'system-message');
          return;
        }
        
        if (!gameId) {
          this._addMessage('Please enter a game ID', 'system-message');
          return;
        }
        
        this.controller.joinGame(gameId, playerName);
      };
    }
    
    if (generateAIBtn) {
      generateAIBtn.onclick = () => {
        const playerName = document.getElementById('game-player-name').value.trim();
        
        if (!playerName) {
          this._addMessage('Please enter your name first', 'system-message');
          return;
        }
        
        const course = document.getElementById('game-course-select').value;
        const topic = document.getElementById('game-topic-input').value.trim();
        const isMultipleChoice = document.getElementById('multiple-choice-toggle').checked;
        const questionCount = parseInt(document.getElementById('question-count-select').value, 10);
        
        if (!course) {
          this._addMessage('Please select a course/topic', 'system-message');
          return;
        }
        
        // Show loading message
        this._addMessage('Generating AI questions...', 'system-message');
        
        // Disable button during generation
        generateAIBtn.disabled = true;
        generateAIBtn.textContent = 'Generating...';
        
        // Generate questions
        this.controller.generateAIQuestions(course, topic, isMultipleChoice, questionCount)
          .then(questions => {
            // Create a new game with the generated questions
            this.controller.createGame(playerName);
            
            // Short timeout to ensure game is created before adding questions
            setTimeout(() => {
              // We'll handle this in the controller via events
            }, 500);
          })
          .catch(error => {
            this._addMessage('Error generating questions: ' + error.message, 'wrong-answer');
          })
          .finally(() => {
            // Re-enable button
            generateAIBtn.disabled = false;
            generateAIBtn.textContent = 'Generate AI Questions';
          });
      };
    }
  }
  
  /**
   * Setup controller event listeners
   * @private
   */
  _setupControllerEvents() {
    // Handle game creation response
    this.controller.on('gameCreated', (data) => {
      console.log('Game created successfully:', data);
      this.currentGameId = data.gameId;
      
      // Update UI to show the game has been created
      this._showGameCreatedUI(data);
      
      // Add to floating feed if available
      if (typeof window.addToFloatingFeed === 'function') {
        window.addToFloatingFeed(`Game created! Your game ID is: ${data.gameId}`, 'success');
      }
    });
    
    // Handle game started event
    this.controller.on('gameStarted', (data) => {
      console.log('Game started:', data);
      
      // Update UI to show the game has started
      this._showGameStartedUI(data);
      
      // Add to floating feed if available
      if (typeof window.addToFloatingFeed === 'function') {
        window.addToFloatingFeed(`Game started! First question: ${data.question.substring(0, 30)}...`, 'success');
      }
    });
      // Handle player updates
    this.controller.on('updatePlayers', (data) => {
      this._updatePlayersList(data);
    });
    
    // Handle timer updates
    this.controller.on('timerUpdate', (data) => {
      this._updateTimerDisplay(data);
    });
    
    // Handle errors
    this.controller.on('error', (error) => {
      this._addMessage(`Error: ${error}`, 'system-message error');
      if (typeof window.addToFloatingFeed === 'function') {
        window.addToFloatingFeed(`Error: ${error}`, 'error');
      }
    });
  }
  
  /**
   * Show UI for when a game is successfully created
   * @param {Object} data - Data from gameCreated event
   * @private
   */
  _showGameCreatedUI(data) {
    // Hide setup section
    const setupSection = document.querySelector('.game-setup-section');
    if (setupSection) {
      setupSection.style.display = 'none';
    }
    
    // Show or create the game lobby section
    let lobbySection = document.querySelector('.game-lobby-section');
    if (!lobbySection) {
      lobbySection = this._createLobbySection(data.gameId);
      
      // Add it to the game content
      const gameContent = document.querySelector('.game-content');
      if (gameContent) {
        gameContent.appendChild(lobbySection);
      }
    } else {
      lobbySection.style.display = 'block';
      
      // Update game ID display
      const gameIdDisplay = lobbySection.querySelector('.game-id-display');
      if (gameIdDisplay) {
        gameIdDisplay.textContent = data.gameId;
      }
    }
    
    // Add system message
    this._addMessage(`Game created! Your game ID is: ${data.gameId}`, 'system-message success');
  }
  
  /**
   * Show UI for when a game is successfully started
   * @param {Object} data - Data from gameStarted event
   * @private
   */
  _showGameStartedUI(data) {
    // Hide the lobby section
    const lobbySection = document.querySelector('.game-lobby-section');
    if (lobbySection) {
      lobbySection.style.display = 'none';
    }
    
    // Show or create the game play section
    let gamePlaySection = document.querySelector('.game-play-section');
    if (!gamePlaySection) {
      gamePlaySection = this._createGamePlaySection();
      
      // Add it to the game content
      const gameContent = document.querySelector('.game-content');
      if (gameContent) {
        gameContent.appendChild(gamePlaySection);
      }
    } else {
      gamePlaySection.style.display = 'block';
    }
    
    // Update the question display
    this._updateQuestionDisplay(data);
    
    // Add system message
    this._addMessage('The game has started!', 'system-message success');
    this._addMessage(`Question: ${data.question}`, 'system-message');
  }
  
  /**
   * Creates the game play section UI
   * @returns {HTMLElement} The created game play section
   * @private
   */  _createGamePlaySection() {
    const gamePlaySection = document.createElement('div');
    gamePlaySection.className = 'game-section game-play-section';
    
    // Create a scoreboard container
    const scoreboardContainer = document.createElement('div');
    scoreboardContainer.className = 'scoreboard-container';
    scoreboardContainer.innerHTML = `
      <h3>Players Scoreboard</h3>
      <div class="players-scoreboard"></div>
    `;
    
    // Style the scoreboard
    scoreboardContainer.style.marginBottom = '15px';
    scoreboardContainer.style.padding = '10px';
    scoreboardContainer.style.borderRadius = '5px';
    scoreboardContainer.style.backgroundColor = '#f5f5f5';
    
    // Create the question container
    const questionContainer = document.createElement('div');
    questionContainer.className = 'question-container';
    questionContainer.innerHTML = `
      <h3>Current Question</h3>
      <div class="question-text"></div>
      <div class="options-container"></div>
      <div class="timer-container">
        <div class="timer-bar"></div>
        <div class="timer-text">60</div>
      </div>
    `;
    
    // Create answer input
    const answerContainer = document.createElement('div');
    answerContainer.className = 'answer-container';
    answerContainer.innerHTML = `
      <input type="text" class="answer-input" placeholder="Type your answer here..." id="answer-input">
      <button class="game-btn submit-answer-btn" id="submit-answer-btn">Submit Answer</button>
    `;
    
    // Create game messages
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    messagesContainer.innerHTML = `
      <div class="messages-header">Game Messages</div>
      <div class="messages-list" id="gameMessages"></div>
    `;
    
    // Assemble the game play section
    gamePlaySection.appendChild(scoreboardContainer);
    gamePlaySection.appendChild(questionContainer);
    gamePlaySection.appendChild(answerContainer);
    gamePlaySection.appendChild(messagesContainer);
    
    // Setup game play event handlers
    this._setupGamePlayEventHandlers(gamePlaySection);
    
    return gamePlaySection;
  }
  
  /**
   * Setup the game play event handlers
   * @param {HTMLElement} gamePlaySection - The game play section element
   * @private
   */
  _setupGamePlayEventHandlers(gamePlaySection) {
    const submitBtn = gamePlaySection.querySelector('#submit-answer-btn');
    const answerInput = gamePlaySection.querySelector('#answer-input');
    
    if (submitBtn && answerInput) {
      submitBtn.onclick = () => {
        const answer = answerInput.value.trim();
        if (!answer) {
          this._addMessage('Please enter an answer', 'system-message');
          return;
        }
        
        if (!this.currentGameId) {
          this._addMessage('Game ID not found', 'system-message error');
          return;
        }
        
        // Send the answer to the server
        this.controller.makeGuess(this.currentGameId, answer);
        
        // Clear the input
        answerInput.value = '';
        
        // Add message
        this._addMessage(`You submitted: ${answer}`, 'player-message');
      };
      
      // Allow submitting with Enter key
      answerInput.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitBtn.click();
        }
      };
    }
      // Set up option click handlers for multiple choice
    const optionsContainer = gamePlaySection.querySelector('.options-container');
    if (optionsContainer) {
      optionsContainer.addEventListener('click', (e) => {
        const optionEl = e.target.closest('.question-option');
        if (optionEl) {
          // Visual feedback - clear previous selections and highlight this one
          const allOptions = optionsContainer.querySelectorAll('.question-option');
          allOptions.forEach(opt => opt.classList.remove('selected'));
          optionEl.classList.add('selected');
          
          const optionIndex = parseInt(optionEl.dataset.index, 10);
          if (!isNaN(optionIndex) && this.currentGameId) {
            // Add a small delay to show the selection before submitting
            setTimeout(() => {
              this.controller.makeGuess(this.currentGameId, '', optionIndex);
              this._addMessage(`You selected: ${optionEl.textContent}`, 'player-message');
            }, 300);
          }
        }
      });
    }
  }
  
  /**
   * Update the question display with the current question
   * @param {Object} data - Question data
   * @private
   */  _updateQuestionDisplay(data) {
    const questionText = document.querySelector('.question-text');
    const optionsContainer = document.querySelector('.options-container');
    const answerInput = document.querySelector('#answer-input');
    const submitAnswerBtn = document.querySelector('#submit-answer-btn');
    
    if (questionText) {
      questionText.textContent = data.question;
    }
    
    // Clear existing options
    if (optionsContainer) {
      optionsContainer.innerHTML = '';
      
      // Add options if it's a multiple choice question
      if (data.isMultipleChoice && data.options) {
        // Hide the text input for multiple choice questions
        if (answerInput) answerInput.style.display = 'none';
        if (submitAnswerBtn) submitAnswerBtn.style.display = 'none';
        
        // Make options container visible
        optionsContainer.style.display = 'flex';
        optionsContainer.style.flexDirection = 'column';
        optionsContainer.style.gap = '10px';
        optionsContainer.style.marginTop = '15px';
        
        // Add options with improved styling
        data.options.forEach((option, index) => {
          const optionEl = document.createElement('div');
          optionEl.className = 'question-option';
          optionEl.textContent = option;
          optionEl.dataset.index = index;
          optionEl.style.cursor = 'pointer';
          optionEl.style.padding = '10px 15px';
          optionEl.style.border = '1px solid #ddd';
          optionEl.style.borderRadius = '5px';
          optionEl.style.backgroundColor = '#f9f9f9';
          
          // Hover effect
          optionEl.onmouseover = () => {
            optionEl.style.backgroundColor = '#e9e9e9';
          };
          
          optionEl.onmouseout = () => {
            optionEl.style.backgroundColor = '#f9f9f9';
          };
          
          optionsContainer.appendChild(optionEl);
        });
      } else {
        // Text input for regular questions
        if (answerInput) answerInput.style.display = 'block';
        if (submitAnswerBtn) submitAnswerBtn.style.display = 'inline-block';
        optionsContainer.style.display = 'none';
      }
    }
    
    // Reset timer
    this._resetTimer();
  }
    /**
   * Reset the timer display
   * @private
   */
  _resetTimer() {
    const timerBar = document.querySelector('.timer-bar');
    const timerText = document.querySelector('.timer-text');
    
    if (timerBar) {
      timerBar.style.width = '100%';
      timerBar.style.backgroundColor = '#4CAF50';
    }
    
    if (timerText) {
      timerText.textContent = '60'; // Server uses 60 seconds
    }
  }
  /**
   * Update the timer display
   * @param {Object} data - Timer data
   * @private
   */
  _updateTimerDisplay(data) {
    const timerBar = document.querySelector('.timer-bar');
    const timerText = document.querySelector('.timer-text');
    const timeLeft = data.timeLeft;
    const totalTime = 60; // The total time in seconds (server uses 60 seconds)
    
    if (timerBar) {
      const percentage = (timeLeft / totalTime) * 100;
      timerBar.style.width = `${percentage}%`;
      
      // Change color based on time left with smooth transitions
      if (timeLeft <= 10) {
        timerBar.style.backgroundColor = '#F44336'; // Red
        
        // Add pulse animation when time is critical
        if (timeLeft <= 5) {
          timerBar.style.animation = 'pulse 1s infinite';
        }
      } else if (timeLeft <= 20) {
        timerBar.style.backgroundColor = '#FF9800'; // Orange
        timerBar.style.animation = 'none'; // Remove animation if it was added
      } else {
        timerBar.style.backgroundColor = '#4CAF50'; // Green
        timerBar.style.animation = 'none'; // Remove animation if it was added
      }
    }
    
    if (timerText) {
      timerText.textContent = timeLeft;
      
      // Add visual emphasis on timer text when time is running low
      if (timeLeft <= 10) {
        timerText.style.color = '#F44336';
        timerText.style.fontWeight = 'bold';
      } else {
        timerText.style.color = '';
        timerText.style.fontWeight = '';
      }
    }
    
    // Add an audio beep when time is running low (last 5 seconds)
    if (timeLeft <= 5 && timeLeft > 0) {
      // Create a short beep sound using Web Audio API
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // frequency in hertz
        gainNode.gain.value = 0.1; // lower volume
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 100); // short beep
      } catch (e) {
        console.log('Audio notification failed:', e);
      }
    }
  }
  
  /**
   * Creates the lobby section UI
   * @param {string} gameId - The ID of the created game
   * @returns {HTMLElement} The created lobby section
   * @private
   */
  _createLobbySection(gameId) {
    const lobbySection = document.createElement('div');
    lobbySection.className = 'game-section game-lobby-section';
    
    // Create lobby header
    const lobbyHeader = document.createElement('div');
    lobbyHeader.innerHTML = `
      <h3>Game Lobby</h3>
      <p>Share this Game ID with friends to let them join:</p>
      <div class="game-id-container">
        <span class="game-id-display">${gameId}</span>
        <button class="copy-id-btn" title="Copy Game ID">📋</button>
      </div>
    `;
    
    // Create players list
    const playersList = document.createElement('div');
    playersList.className = 'players-list';
    playersList.innerHTML = '<h4>Players</h4><ul></ul>';
    
    // Create game controls
    const gameControls = document.createElement('div');
    gameControls.className = 'game-controls';
    gameControls.innerHTML = `
      <button class="game-btn start-game-btn" id="start-game-btn">Start Game</button>
      <button class="game-btn add-ai-btn" id="add-ai-btn">Add AI Player</button>
    `;
    
    // Assemble the lobby section
    lobbySection.appendChild(lobbyHeader);
    lobbySection.appendChild(playersList);
    lobbySection.appendChild(gameControls);
    
    // Add event handlers
    this._setupLobbyEventHandlers(lobbySection);
    
    return lobbySection;
  }
  
  /**
   * Sets up event handlers for the lobby UI elements
   * @param {HTMLElement} lobbySection - The lobby section element
   * @private
   */
  _setupLobbyEventHandlers(lobbySection) {
    // Set up copy button
    const copyBtn = lobbySection.querySelector('.copy-id-btn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const gameIdDisplay = lobbySection.querySelector('.game-id-display');
        if (gameIdDisplay) {
          // Copy to clipboard
          navigator.clipboard.writeText(gameIdDisplay.textContent)
            .then(() => {
              this._addMessage('Game ID copied to clipboard!', 'system-message');
              copyBtn.textContent = '✓';
              setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
            })
            .catch(err => {
              console.error('Failed to copy:', err);
              this._addMessage('Failed to copy Game ID', 'system-message error');
            });
        }
      };
    }
    
    // Set up start game button
    const startGameBtn = lobbySection.querySelector('#start-game-btn');
    if (startGameBtn) {
      startGameBtn.onclick = () => {
        if (!this.currentGameId) {
          this._addMessage('Game ID not found. Please create a new game.', 'system-message error');
          return;
        }
        
        // Make sure we have questions before starting the game
        if (this._hasQuestions()) {
          this.controller.startGame(this.currentGameId);
        } else {
          this._addMessage('Please add questions before starting the game', 'system-message warning');
        }
      };
    }
    
    // Set up add AI player button
    const addAIBtn = lobbySection.querySelector('#add-ai-btn');
    if (addAIBtn) {
      addAIBtn.onclick = () => {
        if (!this.currentGameId) {
          this._addMessage('Game ID not found. Please create a new game.', 'system-message error');
          return;
        }
        
        this.controller.addAIPlayer(this.currentGameId);
        this._addMessage('AI player added to the game', 'system-message');
      };
    }
  }
  /**
   * Check if questions have been added to the game
   * If no questions have been added, add some default questions
   * @returns {boolean} Whether questions exist
   * @private
   */
  _hasQuestions() {
    // Always add default questions - this ensures there are questions to play with
    if (this.currentGameId) {
      // Add some default questions for better user experience
      const defaultQuestions = [
        { question: "What programming language is primarily used for front-end web development?", answer: "JavaScript" },
        { question: "What does CSS stand for?", answer: "Cascading Style Sheets" },
        { question: "What does HTML stand for?", answer: "HyperText Markup Language" },
        { question: "Which JavaScript framework is developed by Facebook?", answer: "React" },
        { question: "What is the most popular version control system?", answer: "Git" }
      ];
      
      this.controller.addQuestions(this.currentGameId, defaultQuestions);
      this._addMessage("Default questions have been added", "system-message");
      
      if (typeof window.addToFloatingFeed === 'function') {
        window.addToFloatingFeed("Default questions have been added to the game", "info");
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Add a message to the game messages element
   * @param {string} message - The message content
   * @param {string} className - CSS class for styling the message
   * @private
   */
  _addMessage(message, className = 'system-message') {
    const messagesElement = document.getElementById('gameMessages');
    if (messagesElement) {
      const messageElement = document.createElement('div');
      messageElement.className = `game-message ${className}`;
      messageElement.textContent = message;
      messagesElement.appendChild(messageElement);
      messagesElement.scrollTop = messagesElement.scrollHeight;
    }
  }
  /**
   * Update the players list UI with current players
   * @param {Array} players - List of player objects
   * @private
   */
  _updatePlayersList(players) {
    // Update lobby player list if it exists
    const lobbyPlayersList = document.querySelector('.players-list ul');
    if (lobbyPlayersList) {
      // Clear current list
      lobbyPlayersList.innerHTML = '';
      
      // Add each player
      players.forEach(player => {
        const playerItem = document.createElement('li');
        playerItem.className = 'player-item';
        
        // Add player info
        playerItem.innerHTML = `
          <span class="player-name">${player.name}</span>
          ${player.isMaster ? '<span class="player-role master">🎲 Game Master</span>' : ''}
          ${player.isAI ? '<span class="player-role ai">🤖 AI</span>' : ''}
          <span class="player-score">Score: ${player.score || 0}</span>
        `;
        
        lobbyPlayersList.appendChild(playerItem);
      });
    }
    
    // Also update the in-game scoreboard if it exists
    const gameScoreboard = document.querySelector('.players-scoreboard');
    if (gameScoreboard) {
      // Sort players by score (highest first)
      const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
      
      // Clear current scoreboard
      gameScoreboard.innerHTML = '';
      
      // Create and style the table
      const scoreTable = document.createElement('table');
      scoreTable.className = 'score-table';
      scoreTable.style.width = '100%';
      scoreTable.style.borderCollapse = 'collapse';
      scoreTable.style.marginTop = '10px';
      
      // Create table header
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Player</th>
          <th style="text-align: center; padding: 8px; border-bottom: 2px solid #ddd;">Role</th>
          <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Score</th>
        </tr>
      `;
      scoreTable.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement('tbody');
      
      // Add each player to the table
      sortedPlayers.forEach(player => {
        const row = document.createElement('tr');
        
        // Highlight current player's row
        if (player.id === this.controller.socket.id) {
          row.style.backgroundColor = '#f0f8ff';
        }
        
        // Determine player role icon
        let roleIcon = '';
        if (player.isMaster) roleIcon = '🎲';
        else if (player.isAI) roleIcon = '🤖';
        
        row.innerHTML = `
          <td style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">
            ${player.name}
            ${player.id === this.controller.socket.id ? ' (You)' : ''}
          </td>
          <td style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">
            ${roleIcon}
          </td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">
            ${player.score || 0}
          </td>
        `;
        
        tbody.appendChild(row);
      });
      
      scoreTable.appendChild(tbody);
      gameScoreboard.appendChild(scoreTable);
    }
  }
}