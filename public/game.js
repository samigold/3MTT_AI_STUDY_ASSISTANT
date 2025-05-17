// Game integration for 3MTT Study Assistant

// Helper function to escape HTML special characters
function escapeHTML(unsafeText) {
  if (unsafeText === undefined || unsafeText === null) {
    return '';
  }
  return String(unsafeText)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize socket connection
  const socket = io();
  
  // Add error handler for socket
  socket.on('error', (errorMessage) => {
    console.error('Socket error:', errorMessage);
    addGameMessage(errorMessage || 'An error occurred. Please try again.', 'wrong-answer');
    // Re-enable buttons that might have been disabled
    if (window.generateAIQuestionsBtn) {
      window.generateAIQuestionsBtn.disabled = false;
    }
  });
  
  // Game variables
  let currentGameId = null;
  let isGameMaster = false;
  let currentQuestion = null;
  let playerName = '';
  let currentCourse = '';
  let currentTopic = '';
  
  // Create game UI elements
  const launchGameBtn = document.createElement('button');
  launchGameBtn.className = 'launch-game-btn';
  launchGameBtn.innerHTML = '<i class="bx bx-game"></i>';
  launchGameBtn.title = 'Launch Guessing Game';
  document.body.appendChild(launchGameBtn);
  
  // Game overlay and container (initially hidden)
  const gameOverlay = document.createElement('div');
  gameOverlay.className = 'game-overlay';
  gameOverlay.style.display = 'none';
  
  // Main game container
  const gameContainer = document.createElement('div');
  gameContainer.className = 'game-container';
  
  // Game UI structure
  gameContainer.innerHTML = `
    <div class="game-header">
      <h2>3MTT Guessing Game</h2>
      <p>Test your knowledge with friends!</p>
      <button class="close-game-btn">&times;</button>
    </div>
    <div class="game-content">
      <!-- Game setup section -->      <div id="game-setup" class="game-section game-setup-section">
        <h3>Start or Join a Game</h3>
        <input type="text" id="game-player-name" class="player-name-input" placeholder="Enter your name" required>
        <div class="game-topic-container">
          <div class="topic-input-row">
            <select id="game-course-select" class="course-select">
              <option value="Frontend">Frontend Development</option>
              <option value="Backend">Backend Development</option>
              <option value="Product">Product Management</option>
              <option value="UI/UX">UI/UX Design</option>
              <option value="Data Science">Data Science</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="Cloud Computing">Cloud Computing</option>
              <option value="DevOps">DevOps</option>
              <option value="General Knowledge">General Knowledge</option>
            </select>
            <input type="text" id="game-topic-input" class="topic-input" placeholder="Enter a topic for questions (e.g. JavaScript, React)">
          </div>
        </div>
        <div class="game-setup-buttons">
          <button id="create-game-btn" class="game-btn">Create New Game</button>
          <div class="join-game-row">
            <input type="text" id="game-id-input" placeholder="Enter Game ID">
            <button id="join-game-btn" class="game-btn game-btn-secondary">Join Game</button>
          </div>
        </div>
      </div>
      
      <!-- Game info section -->      <div id="game-info" class="game-section" style="display: none;">
        <div class="game-id-display">
          <span>Game ID:</span>
          <span id="game-id-display" class="game-id-text" title="Click to copy"></span>
          <button id="copy-game-id" class="copy-button">
            <i class="bx bx-copy"></i> Copy
          </button>
        </div>
        <div id="players-list" class="players-list">
          <h3>Players</h3>
          <div id="players-container"></div>
          <button id="add-ai-player-btn" class="game-btn game-btn-secondary">Add AI Player</button>
        </div>
      </div>
      
      <!-- Game area -->
      <div id="game-play-area" class="game-section" style="display: none;">
        <div class="game-question-area">
          <div id="game-timer" class="game-timer">Time: <span id="time-left">60</span>s</div>
          <h3>Question:</h3>
          <p id="game-question" class="game-question"></p>
        </div>
        
        <!-- Game master controls -->
        <div id="game-master-controls" class="game-master-controls" style="display: none;">
          <div id="question-inputs">
            <div class="question-input-row">
              <input type="text" class="question-input" placeholder="Enter your question">
              <input type="text" class="answer-input" placeholder="Enter the answer">
            </div>
          </div>          <button id="add-question-btn" class="game-btn game-btn-outline">Add Another Question</button>          <div class="question-controls">
            <div class="question-type-toggle">
              <label class="toggle-container">
                <span>Multiple Choice</span>
                <label class="switch">
                  <input type="checkbox" id="multiple-choice-toggle">
                  <span class="slider round"></span>
                </label>
              </label>
            </div>
            
            <div class="question-count-selector">
              <label for="question-count">Number of Questions:</label>
              <select id="question-count" class="question-count">
                <option value="3">3</option>
                <option value="5" selected>5</option>
                <option value="8">8</option>
                <option value="10">10</option>
                <option value="15">15</option>
              </select>
            </div>
          </div>
          <button id="generate-ai-questions-btn" class="game-btn game-btn-secondary">Generate AI Questions</button>
          <button id="start-game-btn" class="game-btn">Start Game</button>
        </div>
          <!-- Player controls -->
        <div id="player-guess-controls" class="player-controls" style="display: none;">
          <!-- Text input for regular questions -->
          <div class="guess-input-container">
            <input type="text" id="guess-input" class="guess-input" placeholder="Enter your guess">
            <button id="submit-guess-btn" class="game-btn">Submit Guess</button>
            <p class="attempts-counter">Attempts left: <span id="attempts-left">3</span></p>
          </div>
          
          <!-- Options for multiple choice questions -->
          <div id="options-container" class="options-container" style="display: none;">
            <div class="options-list">
              <!-- Options will be dynamically inserted here -->
            </div>
            <button id="submit-option-btn" class="game-btn">Submit Answer</button>
            <p class="attempts-counter">Attempts left: <span id="mc-attempts-left">3</span></p>
          </div>
        </div>
      </div>
      
      <!-- Game messages -->
      <div id="game-messages-section" class="game-section" style="display: none;">
        <h3>Game Feed</h3>
        <div id="game-messages" class="game-messages"></div>
      </div>
    </div>
  `;
  
  gameOverlay.appendChild(gameContainer);
  document.body.appendChild(gameOverlay);
  
  // Event listeners
  launchGameBtn.addEventListener('click', openGameOverlay);
  
  // Close button
  const closeGameBtn = gameContainer.querySelector('.close-game-btn');
  closeGameBtn.addEventListener('click', closeGameOverlay);
  
  // Game buttons
  const createGameBtn = gameContainer.querySelector('#create-game-btn');
  const joinGameBtn = gameContainer.querySelector('#join-game-btn');
  const gameIdInput = gameContainer.querySelector('#game-id-input');
  const playerNameInput = gameContainer.querySelector('#game-player-name');
  const copyGameIdBtn = gameContainer.querySelector('#copy-game-id');
  const gameIdDisplay = gameContainer.querySelector('#game-id-display');
  const addQuestionBtn = gameContainer.querySelector('#add-question-btn');
  const generateAIQuestionsBtn = gameContainer.querySelector('#generate-ai-questions-btn');
  const startGameBtn = gameContainer.querySelector('#start-game-btn');
  const submitGuessBtn = gameContainer.querySelector('#submit-guess-btn');
  const guessInput = gameContainer.querySelector('#guess-input');
  const attemptsLeft = gameContainer.querySelector('#attempts-left');
  
  // Sections
  const gameSetupSection = gameContainer.querySelector('#game-setup');
  const gameInfoSection = gameContainer.querySelector('#game-info');
  const gamePlayArea = gameContainer.querySelector('#game-play-area');
  const gameMasterControls = gameContainer.querySelector('#game-master-controls');
  const playerGuessControls = gameContainer.querySelector('#player-guess-controls');
  const gameMessagesSection = gameContainer.querySelector('#game-messages-section');
  const gameMessages = gameContainer.querySelector('#game-messages');
  
  // UI elements
  const gameQuestion = gameContainer.querySelector('#game-question');
  const playersContainer = gameContainer.querySelector('#players-container');
  const timeLeft = gameContainer.querySelector('#time-left');
  const gameTimer = gameContainer.querySelector('#game-timer');
  // Event listeners for game actions
  createGameBtn.addEventListener('click', createGame);
  joinGameBtn.addEventListener('click', joinGame);
  copyGameIdBtn.addEventListener('click', copyGameId);
  gameIdDisplay.addEventListener('click', copyGameId);
  addQuestionBtn.addEventListener('click', addQuestionInput);
  generateAIQuestionsBtn.addEventListener('click', generateQuestions);
  startGameBtn.addEventListener('click', startGame);
  submitGuessBtn.addEventListener('click', submitGuess);
  
  // AI player button
  const addAIPlayerBtn = gameContainer.querySelector('#add-ai-player-btn');
  if (addAIPlayerBtn) {
    addAIPlayerBtn.addEventListener('click', addAIPlayer);
  }
  
  // Multiple choice toggle
  const multipleChoiceToggle = document.querySelector('#multiple-choice-toggle');
  if (multipleChoiceToggle) {
    multipleChoiceToggle.addEventListener('change', updateQuestionInputs);
  }
  
  // Update question inputs based on multiple choice toggle
  function updateQuestionInputs() {
    const isMultipleChoice = document.querySelector('#multiple-choice-toggle')?.checked || false;
    
    // Clear question inputs and add a new one in the proper format
    const questionInputs = document.getElementById('question-inputs');
    questionInputs.innerHTML = '';
    addQuestionInput();
    
    // Update the message about question type
    addGameMessage(`Question type set to ${isMultipleChoice ? 'multiple-choice' : 'standard'} format.`, 'system-message');
  }
    // Function to open game overlay
  function openGameOverlay() {
    // Try to get current course and topic from the main app form first
    const appCourseSelect = document.getElementById('course');
    const questionInput = document.getElementById('question');
    
    if (appCourseSelect && questionInput && questionInput.value) {
      currentCourse = appCourseSelect.value || 'General Knowledge';
      currentTopic = questionInput.value;
      
      // Pre-fill the game topic fields with values from the main app
      const gameTopicInput = document.getElementById('game-topic-input');
      const gameCourseSelect = document.getElementById('game-course-select');
      
      if (gameTopicInput && gameCourseSelect) {
        gameTopicInput.value = currentTopic;
        
        // Try to match course selection
        for (let i = 0; i < gameCourseSelect.options.length; i++) {
          if (gameCourseSelect.options[i].value === currentCourse) {
            gameCourseSelect.selectedIndex = i;
            break;
          }
        }
      }
    }
    
    gameOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind overlay
    
    // Set player name from localStorage if available
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      playerNameInput.value = savedName;
    }
    
    // Check for existing game in session
    const existingGameId = localStorage.getItem('currentGameId');
    if (existingGameId) {
      gameIdInput.value = existingGameId;
    }
  }
    // Function to close game overlay
  function closeGameOverlay() {
    // Clean up any game state
    if (currentGameId) {
      // Leave the current game room if connected
      socket.emit('disconnect');
    }
    
    // Reset UI states
    gameSetupSection.style.display = 'block';
    gameInfoSection.style.display = 'none';
    gamePlayArea.style.display = 'none';
    gameMasterControls.style.display = 'none';
    playerGuessControls.style.display = 'none';
    gameMessagesSection.style.display = 'none';
    
    // Clear game messages
    if (gameMessages) {
      gameMessages.innerHTML = '';
    }
    
    // Reset game variables
    currentGameId = null;
    isGameMaster = false;
    currentQuestion = null;
    
    // Reset any modal or popup that might be visible
    const modals = document.querySelectorAll('.end-game-modal, .win-popup, .round-transition, .ai-hosting-notice');
    modals.forEach(modal => {
      if (modal) modal.remove();
    });
    
    // Hide overlay
    gameOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }
    // Create a new game
  function createGame() {
    playerName = playerNameInput.value.trim();
    if (!playerName) {
      addGameMessage('Please enter your name', 'wrong-answer');
      return;
    }
    
    // Get the current course and topic values
    const gameCourseSelect = document.getElementById('game-course-select');
    const gameTopicInput = document.getElementById('game-topic-input');
    
    if (gameCourseSelect && gameTopicInput) {
      currentCourse = gameCourseSelect.value;
      currentTopic = gameTopicInput.value.trim();
    }
    
    localStorage.setItem('playerName', playerName);
    socket.emit('createGame', { playerName });
    
    // Hide setup, show waiting screen
    gameSetupSection.style.display = 'none';
    gameInfoSection.style.display = 'block';
    gamePlayArea.style.display = 'block';
    gameMessagesSection.style.display = 'block';
    
    addGameMessage('Game created! Share the Game ID with friends to let them join.', 'system-message');
  }
  
  // Join existing game
  function joinGame() {
    playerName = playerNameInput.value.trim();
    const gameId = gameIdInput.value.trim();
    
    if (!playerName) {
      addGameMessage('Please enter your name', 'wrong-answer');
      return;
    }
    
    if (!gameId) {
      addGameMessage('Please enter a Game ID', 'wrong-answer');
      return;
    }
    
    localStorage.setItem('playerName', playerName);
    socket.emit('joinGame', { gameId, playerName });
    
    // Hide setup, show waiting screen
    gameSetupSection.style.display = 'none';
  }
  
  // Copy game ID to clipboard
  function copyGameId() {
    if (!currentGameId) return;
    
    navigator.clipboard.writeText(currentGameId)
      .then(() => {
        showCopyFeedback('Game ID copied!');
      })
      .catch(() => {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = currentGameId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopyFeedback('Game ID copied!');
      });
  }
    // Add a new question input row
  function addQuestionInput() {
    const questionInputs = document.getElementById('question-inputs');
    const row = document.createElement('div');
    row.className = 'question-input-row';
    
    // Check if multiple choice toggle is on
    const isMultipleChoice = document.querySelector('#multiple-choice-toggle')?.checked || false;
    
    if (isMultipleChoice) {
      row.innerHTML = `
        <input type="text" class="question-input" placeholder="Enter your question">
        <div class="mc-options-container">
          <div class="mc-option">
            <input type="radio" name="correct-option-new" value="0" checked>
            <input type="text" class="option-input" data-index="0" placeholder="Correct option">
          </div>
          <div class="mc-option">
            <input type="radio" name="correct-option-new" value="1">
            <input type="text" class="option-input" data-index="1" placeholder="Option 2">
          </div>
          <div class="mc-option">
            <input type="radio" name="correct-option-new" value="2">
            <input type="text" class="option-input" data-index="2" placeholder="Option 3">
          </div>
        </div>
      `;
      
      // Update the radio button names to be unique
      const timestamp = Date.now();
      const radios = row.querySelectorAll('input[type="radio"]');
      radios.forEach(radio => {
        radio.name = `correct-option-${timestamp}`;
      });
      
    } else {
      row.innerHTML = `
        <input type="text" class="question-input" placeholder="Enter your question">
        <input type="text" class="answer-input" placeholder="Enter the answer">
      `;
    }
    
    questionInputs.appendChild(row);
  }
  // Generate questions using AI based on current topic
  function generateQuestions() {
    // Get the latest values from our game topic fields
    const gameCourseSelect = document.getElementById('game-course-select');
    const gameTopicInput = document.getElementById('game-topic-input');
    
    if (gameCourseSelect && gameTopicInput) {
      currentCourse = gameCourseSelect.value;
      currentTopic = gameTopicInput.value.trim();
    }
    
    if (!currentTopic) {
      addGameMessage('Please enter a topic for your questions', 'wrong-answer');
      return;
    }    // Check if multiple choice option is selected
    const isMultipleChoice = document.querySelector('#multiple-choice-toggle')?.checked || false;
    
    // Get the selected question count
    const questionCountSelect = document.getElementById('question-count');
    const questionCount = questionCountSelect ? parseInt(questionCountSelect.value) : 5;
    
    addGameMessage(`Generating ${questionCount} ${isMultipleChoice ? 'multiple-choice' : ''} questions about "${currentTopic}"...`, 'system-message');
    generateAIQuestionsBtn.disabled = true;
    
    socket.emit('getAIQuestions', { 
      course: currentCourse, 
      topic: currentTopic,
      isMultipleChoice: isMultipleChoice,
      questionCount: questionCount
    });
  }
    // Start the game with the current questions
  function startGame() {
    const questions = [];
    const questionRows = document.querySelectorAll('.question-input-row');
    const isMultipleChoice = document.querySelector('#multiple-choice-toggle')?.checked || false;
    
    questionRows.forEach(row => {
      const question = row.querySelector('.question-input').value.trim();
      const answer = row.querySelector('.answer-input').value.trim();
      
      if (question && answer) {
        if (isMultipleChoice) {
          // Get options if they exist
          const optionsInput = row.querySelector('.options-input');
          const correctOptionInput = row.querySelector('.correct-option-input');
          
          if (optionsInput && correctOptionInput) {
            try {
              const options = JSON.parse(optionsInput.value);
              const correctOption = parseInt(correctOptionInput.value);
              
              questions.push({ 
                question, 
                answer, 
                options, 
                correctOption
              });
            } catch (error) {
              // If parsing fails, add as regular question
              questions.push({ question, answer });
            }
          } else {
            // Create default multiple choice if no options exist
            const options = [answer, "Alternative 1", "Alternative 2"];
            questions.push({ 
              question, 
              answer, 
              options, 
              correctOption: 0 
            });
          }
        } else {
          // Regular question
          questions.push({ question, answer });
        }
      }
    });
    
    if (questions.length === 0) {
      addGameMessage('Please add at least one question and answer', 'wrong-answer');
      return;
    }
    
    socket.emit('addQuestions', { gameId: currentGameId, questions });
    socket.emit('startGame', { gameId: currentGameId });
  }
    // Submit a guess for the current question
  function submitGuess() {
    // Check if we're in multiple-choice mode
    const optionsContainer = document.getElementById('options-container');
    
    if (optionsContainer && optionsContainer.style.display !== 'none') {
      // Multiple choice mode - get selected option
      const selectedOption = document.querySelector('input[name="mc-option"]:checked');
      
      if (!selectedOption) {
        addGameMessage('Please select an option', 'wrong-answer');
        return;
      }
      
      const optionIndex = parseInt(selectedOption.value);
      const optionText = document.querySelector(`label[for="option-${optionIndex}"]`).textContent;
      
      socket.emit('makeGuess', { 
        gameId: currentGameId, 
        guess: optionText,
        optionIndex: optionIndex
      });
      
      addGameMessage('You selected: ' + optionText, 'player-message');
    } else {
      // Text input mode
      const guess = guessInput.value.trim();
      if (!guess) {
        addGameMessage('Please enter a guess', 'wrong-answer');
        return;
      }
      
      socket.emit('makeGuess', { gameId: currentGameId, guess });
      addGameMessage('You guessed: ' + guess, 'player-message');
      guessInput.value = '';
    }
  }
  
  // Add message to game feed
  function addGameMessage(text, className = '') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `game-message ${className || ''}`;
    messageDiv.textContent = text;
    gameMessages.appendChild(messageDiv);
    gameMessages.scrollTop = gameMessages.scrollHeight;
  }
    // Update players list
  function updatePlayersList(players) {
    playersContainer.innerHTML = '';
    
    // Sort players by score
    const sortedPlayers = players.sort((a, b) => b.score - a.score);
    
    sortedPlayers.forEach(player => {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'player-item';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = player.name;
      
      if (player.isMaster) {
        const masterBadge = document.createElement('span');
        masterBadge.className = 'game-master-indicator';
        masterBadge.textContent = 'Game Master';
        nameSpan.appendChild(masterBadge);
      }
      
      if (player.isAI) {
        const aiBadge = document.createElement('span');
        aiBadge.className = 'ai-player-indicator';
        aiBadge.textContent = 'AI';
        nameSpan.appendChild(aiBadge);
      }
      
      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'player-score';
      scoreSpan.textContent = `${player.score} points`;
      
      playerDiv.appendChild(nameSpan);
      playerDiv.appendChild(scoreSpan);
      playersContainer.appendChild(playerDiv);
    });
  }
    // Show copy feedback
  function showCopyFeedback(message) {
    const feedback = document.createElement('div');
    feedback.className = 'copy-feedback';
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.remove();
    }, 2000);
  }
  
  // Add AI player to the game
  function addAIPlayer() {
    if (!currentGameId || !isGameMaster) {
      addGameMessage('You need to be the game master to add an AI player', 'wrong-answer');
      return;
    }
    
    socket.emit('addAIPlayer', { gameId: currentGameId });
    addGameMessage('Adding an AI player to the game...', 'system-message');
  }
  
  // Socket event handlers
  socket.on('gameCreated', ({ gameId, isMaster }) => {
    currentGameId = gameId;
    isGameMaster = isMaster;
    gameIdDisplay.textContent = gameId;
    
    localStorage.setItem('currentGameId', gameId);
    
    gameInfoSection.style.display = 'block';
    gamePlayArea.style.display = 'block';
    gameMessagesSection.style.display = 'block';
    
    if (isMaster) {
      gameMasterControls.style.display = 'block';
      addGameMessage('Game created! Share the Game ID with others to join.', 'system-message');
      startGameBtn.disabled = true; // Disable until we have players and questions
    }
  });
  
  socket.on('gameJoined', ({ gameId, isMaster }) => {
    currentGameId = gameId;
    isGameMaster = isMaster;
    gameIdDisplay.textContent = gameId;
    
    localStorage.setItem('currentGameId', gameId);
    
    gameInfoSection.style.display = 'block';
    gamePlayArea.style.display = 'block';
    gameMessagesSection.style.display = 'block';
    
    addGameMessage('You joined the game!', 'system-message');
    addGameMessage('Waiting for the game to start...', 'system-message');
  });
  
  socket.on('updatePlayers', (players) => {
    updatePlayersList(players);
    
    // At least 2 players (including game master) to start
    if (isGameMaster && players.length > 1) {
      startGameBtn.disabled = false;
    }
  });  socket.on('aiQuestionsGenerated', ({ questions }) => {
    // Re-enable the generate button
    generateAIQuestionsBtn.disabled = false;
    
    // Check if we received questions
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      addGameMessage('No questions were generated. Please try a different topic.', 'wrong-answer');
      return;
    }
    
    // Clear existing questions
    const questionInputs = document.getElementById('question-inputs');
    questionInputs.innerHTML = '';
    
    try {
      // Determine if we have multiple choice questions by safely checking the first question
      const isMultipleChoice = questions[0] && questions[0].options && Array.isArray(questions[0].options);
      
      // Add each AI-generated question
      questions.forEach(q => {
        const row = document.createElement('div');
        row.className = 'question-input-row';
        
        if (isMultipleChoice) {
          // Format the multiple choice question and sanitize data
          try {
            const optionsJson = JSON.stringify(q.options);
            row.innerHTML = `
              <input type="text" class="question-input" value="${escapeHTML(q.question)}" placeholder="Enter your question">
              <input type="text" class="answer-input" value="${escapeHTML(q.options[q.correctOption])}" placeholder="Enter the answer">
              <input type="hidden" class="options-input" value='${escapeHTML(optionsJson)}'>
              <input type="hidden" class="correct-option-input" value="${q.correctOption}">
            `;
          } catch (optionError) {
            console.error("Error processing multiple choice question:", optionError);
            // Create a simple fallback
            row.innerHTML = `
              <input type="text" class="question-input" value="${escapeHTML(q.question || 'Question unavailable')}" placeholder="Enter your question">
              <input type="text" class="answer-input" value="Answer unavailable" placeholder="Enter the answer">
            `;
          }
        } else {
          // Regular question
          row.innerHTML = `
            <input type="text" class="question-input" value="${escapeHTML(q.question)}" placeholder="Enter your question">
            <input type="text" class="answer-input" value="${escapeHTML(q.answer)}" placeholder="Enter the answer">
          `;
        }
        
        questionInputs.appendChild(row);
      });
      
      generateAIQuestionsBtn.disabled = false;      addGameMessage(`${questions.length} ${isMultipleChoice ? 'multiple-choice' : ''} questions generated about "${currentTopic}"!`, 'system-message');
      
      // Update the multiple choice toggle to match
      const multipleChoiceToggle = document.querySelector('#multiple-choice-toggle');
      if (multipleChoiceToggle) {
        multipleChoiceToggle.checked = isMultipleChoice;
      }
    } catch (error) {
      console.error('Error processing AI generated questions:', error);
      addGameMessage('Error processing questions. Please try again.', 'wrong-answer');
    }
  });
    socket.on('questionsAdded', ({ count }) => {
    try {
      addGameMessage(`${count} questions ready for the game!`, 'system-message');
    } catch (error) {
      console.error('Error handling questions added event:', error);
      addGameMessage('Questions have been added to the game.', 'system-message');
    }
  });
    socket.on('gameStarted', ({ question, options, isMultipleChoice }) => {
    currentQuestion = question;
    gameQuestion.textContent = question;
    
    if (isGameMaster) {
      gameMasterControls.style.display = 'none';
      addGameMessage('Game started! Players are guessing now.', 'system-message');
    } else {
      playerGuessControls.style.display = 'block';
      
      // Handle multiple choice questions
      const optionsContainer = document.getElementById('options-container');
      const guessInputContainer = document.querySelector('.guess-input-container');
      const submitOptionBtn = document.getElementById('submit-option-btn');
      const optionsList = document.querySelector('.options-list');
      const mcAttemptsLeft = document.getElementById('mc-attempts-left');
      
      if (isMultipleChoice && options) {
        // Show multiple choice options
        optionsContainer.style.display = 'block';
        guessInputContainer.style.display = 'none';
        
        // Generate option elements
        optionsList.innerHTML = '';
        options.forEach((option, index) => {
          const optionItem = document.createElement('div');
          optionItem.className = 'option-item';
          
          optionItem.innerHTML = `
            <input type="radio" id="option-${index}" name="mc-option" value="${index}">
            <label for="option-${index}">${option}</label>
          `;
          
          optionsList.appendChild(optionItem);
        });
        
        // Set up submit button
        submitOptionBtn.disabled = false;
        submitOptionBtn.onclick = submitGuess;
        
        mcAttemptsLeft.textContent = '3';
        addGameMessage('Game started! Select the correct answer.', 'system-message');
      } else {
        // Show text input for regular questions
        optionsContainer.style.display = 'none';
        guessInputContainer.style.display = 'block';
        submitGuessBtn.disabled = false;
        guessInput.disabled = false;
        attemptsLeft.textContent = '3';
        addGameMessage('Game started! Try to guess the answer.', 'system-message');
      }
    }
  });
  
  socket.on('timerUpdate', ({ timeLeft: time }) => {
    timeLeft.textContent = time;
    if (time <= 10) {
      gameTimer.classList.add('urgent');
    } else {
      gameTimer.classList.remove('urgent');
    }
  });
  
  socket.on('wrongGuess', ({ remainingAttempts, message }) => {
    addGameMessage(message, 'wrong-answer');
    attemptsLeft.textContent = remainingAttempts;
    
    if (remainingAttempts === 0) {
      submitGuessBtn.disabled = true;
      guessInput.disabled = true;
    }
  });
  
  socket.on('playerGuessed', ({ playerName: name, remainingAttempts }) => {
    addGameMessage(`${name} made a wrong guess (${remainingAttempts} attempts left)`, 'system-message');
  });
  socket.on('roundEnded', ({ winner, answer, scores, currentRound, totalRounds }) => {
    // Create and show the popup for round winner
    const popup = document.createElement('div');
    popup.className = 'win-popup';
    popup.textContent = winner.id === socket.id ? 
        '🎉 You won this round!' : 
        `🎉 ${winner.name} won this round!`;
    document.body.appendChild(popup);

    // Remove popup after animation
    setTimeout(() => {
        popup.remove();
    }, 3000);
    
    addGameMessage(`${winner.name} won this round! The answer was: ${answer}`, 'correct-answer');
    addGameMessage(`Round ${currentRound} of ${totalRounds} completed.`, 'system-message');
    
    // Display transition message
    if (currentRound < totalRounds) {
      addGameMessage('The winner will be the game master for the next round.', 'system-message');
    } else {
      addGameMessage('All rounds completed! Determining the final winner...', 'system-message');
    }
    
    updatePlayersList(scores);
    
    // Reset controls for next round
    playerGuessControls.style.display = 'none';
    guessInput.disabled = true;
    submitGuessBtn.disabled = true;
    
    // Reset other controls
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
      optionsContainer.style.display = 'none';
    }
    const guessInputContainer = document.querySelector('.guess-input-container');
    if (guessInputContainer) {
      guessInputContainer.style.display = 'none';
    }
  });
    socket.on('gameEnded', ({ winner, finalScores, newMaster }) => {
    // Create end game modal with winner announcement and options
    const endGameModal = document.createElement('div');
    endGameModal.className = 'end-game-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'end-game-modal-content';
    
    const winnerAnnouncement = document.createElement('h2');
    winnerAnnouncement.className = 'winner-title';
    winnerAnnouncement.innerHTML = `🏆 ${winner.name} wins! 🏆`;
    
    const scoreDisplay = document.createElement('p');
    scoreDisplay.className = 'winner-score';
    scoreDisplay.textContent = `Final score: ${winner.score} points`;
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'end-game-options';
      const restartBtn = document.createElement('button');
    restartBtn.className = 'game-btn restart-game-btn';
    restartBtn.textContent = '🔄 Start New Game';
    restartBtn.onclick = () => {
      endGameModal.remove();
      
      // Two options: completely new game or restart current game
      const newGameOptions = document.createElement('div');
      newGameOptions.className = 'new-game-options-modal';
      
      const optionsContent = document.createElement('div');
      optionsContent.className = 'new-game-options-content';
      
      optionsContent.innerHTML = `
        <h3>Start a New Game</h3>
        <p>Choose an option:</p>
        <button id="brand-new-game" class="game-btn">Create Brand New Game</button>
        <button id="restart-current-game" class="game-btn">Restart Current Game (Keep Players)</button>
        <button id="cancel-restart" class="game-btn game-btn-secondary">Cancel</button>
      `;
      
      newGameOptions.appendChild(optionsContent);
      document.body.appendChild(newGameOptions);
      
      // Brand new game button
      document.getElementById('brand-new-game').addEventListener('click', () => {
        newGameOptions.remove();
        // Reset UI to prepare for a completely new game
        playerGuessControls.style.display = 'none';
        gameMasterControls.style.display = 'none';
        gameMessagesSection.style.display = 'none';
        gameInfoSection.style.display = 'none';
        gamePlayArea.style.display = 'none';
        gameSetupSection.style.display = 'block';
        gameMessages.innerHTML = '';
        currentGameId = null;
        addGameMessage('Ready to start a new game!', 'system-message');
      });
      
      // Restart current game button
      document.getElementById('restart-current-game').addEventListener('click', () => {
        newGameOptions.remove();
        // Request server to restart the current game
        if (currentGameId) {
          socket.emit('restartGame', { gameId: currentGameId });
          addGameMessage('Requesting game restart...', 'system-message');
        }
      });
      
      // Cancel button
      document.getElementById('cancel-restart').addEventListener('click', () => {
        newGameOptions.remove();
      });
    };
    
    const continueBtn = document.createElement('button');
    continueBtn.className = 'game-btn continue-game-btn';
    continueBtn.textContent = '👑 Continue as Game Master';
    continueBtn.onclick = () => {
      endGameModal.remove();
      if (isGameMaster) {
        gameMasterControls.style.display = 'block';
        document.getElementById('question-inputs').innerHTML = `
          <div class="question-input-row">
            <input type="text" class="question-input" placeholder="Enter your question">
            <input type="text" class="answer-input" placeholder="Enter the answer">
          </div>
        `;
        addGameMessage('You are now the game master. Create new questions!', 'system-message');
      }
    };
    
    const exitBtn = document.createElement('button');
    exitBtn.className = 'game-btn exit-game-btn';
    exitBtn.textContent = '❌ Exit Game';
    exitBtn.onclick = () => {
      endGameModal.remove();
      closeGameOverlay();
    };
    
    // Build the modal structure
    optionsContainer.appendChild(restartBtn);
    optionsContainer.appendChild(continueBtn);
    optionsContainer.appendChild(exitBtn);
    
    modalContent.appendChild(winnerAnnouncement);
    modalContent.appendChild(scoreDisplay);
    modalContent.appendChild(optionsContainer);
    endGameModal.appendChild(modalContent);
    
    // Add to page
    document.body.appendChild(endGameModal);
    
    // Also add winner message to game feed
    const winnerMessage = document.createElement('div');
    winnerMessage.className = 'winner-announcement';
    winnerMessage.textContent = `🏆 ${winner.name} wins the game with ${winner.score} points! 🏆`;
    gameMessages.appendChild(winnerMessage);
    
    updatePlayersList(finalScores);
    
    // Reset game state
    playerGuessControls.style.display = 'none';
    gameMasterControls.style.display = 'none';
    
    // Update game master
    isGameMaster = socket.id === newMaster;
  });
  
  socket.on('newGameMaster', ({ masterId, masterName }) => {
    isGameMaster = socket.id === masterId;
    
    if (isGameMaster) {
      gameMasterControls.style.display = 'block';
      playerGuessControls.style.display = 'none';
      document.getElementById('question-inputs').innerHTML = `
        <div class="question-input-row">
          <input type="text" class="question-input" placeholder="Enter your question">
          <input type="text" class="answer-input" placeholder="Enter the answer">
        </div>
      `;
      addGameMessage('You are now the game master. Create new questions!', 'system-message');
    } else {
      playerGuessControls.style.display = 'none';
      gameMasterControls.style.display = 'none';
      addGameMessage(`${masterName} is now the game master`, 'system-message');
    }
  });
  
  socket.on('playerLeft', ({ name }) => {
    addGameMessage(`${name} has left the game`, 'system-message');
  });
    socket.on('error', (message) => {
    addGameMessage(message, 'wrong-answer');
  });
  
  socket.on('playerJoined', ({ name, isAI }) => {
    const message = isAI ? `${name} has joined the game as an AI player` : `${name} has joined the game`;
    addGameMessage(message, 'system-message');
  });
  
  socket.on('gameRestarted', ({ gameMaster, masterName, players }) => {
    // Create a game restart notification
    const restartNotice = document.createElement('div');
    restartNotice.className = 'restart-notice';
    restartNotice.innerHTML = `
      <h3>Game Restarted!</h3>
      <p>All scores have been reset</p>
      <p>${masterName} is the game master</p>
    `;
    document.body.appendChild(restartNotice);
    
    setTimeout(() => {
      restartNotice.remove();
    }, 3000);
    
    // Update game state
    isGameMaster = socket.id === gameMaster;
    
    // Reset game UI
    gameMessages.innerHTML = '';
    playerGuessControls.style.display = 'none';
    gameMasterControls.style.display = 'none';
    
    addGameMessage('🔄 Game has been restarted! All scores are reset to 0.', 'system-message');
    addGameMessage(`${masterName} is the game master.`, 'system-message');
    
    // Update player list with reset scores
    updatePlayersList(players);
    
    if (isGameMaster) {
      gameMasterControls.style.display = 'block';
      document.getElementById('question-inputs').innerHTML = `
        <div class="question-input-row">
          <input type="text" class="question-input" placeholder="Enter your question">
          <input type="text" class="answer-input" placeholder="Enter the answer">
        </div>
      `;
      addGameMessage('You are now the game master. Create new questions!', 'system-message');
    }
  });
    socket.on('newRound', ({ roundNumber, totalRounds, newMaster, newMasterName, isAIMaster }) => {
    // Create a round transition notification
    const roundTransition = document.createElement('div');
    roundTransition.className = 'round-transition';
    roundTransition.innerHTML = `
      <h3>Round ${roundNumber} of ${totalRounds}</h3>
      <p>${newMasterName} is the new game master!</p>
    `;
    document.body.appendChild(roundTransition);
    
    setTimeout(() => {
      roundTransition.remove();
    }, 3000);
    
    addGameMessage(`Round ${roundNumber} of ${totalRounds} - ${newMasterName} is the new game master!`, 'system-message');
    
    // Update game state
    isGameMaster = socket.id === newMaster;
    
    // Reset controls
    playerGuessControls.style.display = 'none';
    gameMasterControls.style.display = 'none';
    
    // Reset guessing controls
    guessInput.disabled = true;
    submitGuessBtn.disabled = true;
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
      optionsContainer.style.display = 'none';
    }
    
    if (isGameMaster) {
      // Show game master controls with slight delay for better UX
      setTimeout(() => {
        gameMasterControls.style.display = 'block';
        document.getElementById('question-inputs').innerHTML = `
          <div class="question-input-row">
            <input type="text" class="question-input" placeholder="Enter your question">
            <input type="text" class="answer-input" placeholder="Enter the answer">
          </div>
        `;
        addGameMessage('You are now the game master for this round. Create new questions!', 'system-message');
      }, 1000);
    } else {
      if (isAIMaster) {
        addGameMessage(`${newMasterName} (AI) is thinking of questions for this round...`, 'system-message');
      } else {
        addGameMessage('Waiting for the game master to create questions...', 'system-message');
      }
    }
  });
    socket.on('aiHostingRound', ({ aiName, topic, isMultipleChoice, questionCount }) => {
    const questionType = isMultipleChoice ? 'multiple-choice' : 'standard';
    
    // Create a more prominent notification for AI hosting
    const aiHostingNotice = document.createElement('div');
    aiHostingNotice.className = 'ai-hosting-notice';
    aiHostingNotice.innerHTML = `
      <h3>AI Taking Control!</h3>
      <p>${aiName} is now hosting the next round</p>
      <p>Topic: ${topic}</p>
      <p>${questionCount} ${questionType} questions</p>
      <p>Get ready!</p>
    `;
    document.body.appendChild(aiHostingNotice);
    
    setTimeout(() => {
      aiHostingNotice.remove();
    }, 4000);
    
    addGameMessage(`${aiName} is hosting this round with ${questionCount} ${questionType} questions about ${topic}!`, 'system-message');
    addGameMessage('Get ready - the game will start automatically in 3 seconds!', 'system-message');
  });
  
  socket.on('aiGuessedCorrect', ({ playerName, answer }) => {
    addGameMessage(`${playerName} guessed correctly: ${answer}`, 'correct-answer');
  });
});
