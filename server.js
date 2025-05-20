const express = require('express');
const bodyParser = require('body-parser');
const apiRouter = require('./router/apiRouter.js');
const http = require('http');
const { Server } = require('socket.io');
const { generateAIQuestions } = require('./controllers/gameController.js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// API routes
app.use('/api', apiRouter);

// Game state
const gameSessions = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create game session
  socket.on('createGame', ({ playerName }) => {
    const gameId = Math.random().toString(36).substring(2, 8).toLowerCase();
    const session = new GameSession(gameId, socket.id, playerName);
    gameSessions.set(gameId, session);
    socket.join(gameId);
    socket.emit('gameCreated', { gameId, isMaster: true });
    io.to(gameId).emit('updatePlayers', getPlayersData(session));
  });
  // Join game session
  socket.on('joinGame', ({ gameId, playerName }) => {
    const normalizedGameId = gameId.toLowerCase();
    const session = Array.from(gameSessions.entries()).find(
      ([id]) => id.toLowerCase() === normalizedGameId
    )?.[1];

    if (session && !session.isActive) {
      session.players.set(socket.id, { name: playerName, score: 0, attempts: 0 });
      socket.join(gameId);
      socket.emit('gameJoined', { gameId, isMaster: false });
      io.to(gameId).emit('updatePlayers', getPlayersData(session));
      
      // Automatically add AI player if there's only 2 players (game master + one human)
      // This makes the game more competitive
      if (session.players.size === 2 && Math.random() < 0.7) { // 70% chance to add AI
        // Create unique AI player ID
        const aiPlayerId = `ai-${Math.random().toString(36).substring(2, 8)}`;
        
        // Smart AI names
        const aiNames = [
          'QuizMaster Pro', 
          'BrainBot', 
          'Quizatron', 
          'TriviaWiz AI', 
          'NeuralNinja', 
          'MindMaster', 
          'EinsteinAI',
          'SmartAlec',
          'OmniQuiz',
          'GeniusGPT'
        ];
        const aiName = aiNames[Math.floor(Math.random() * aiNames.length)];
        
        // Add AI player to session with 0 initial score
        session.players.set(aiPlayerId, { 
          name: aiName, 
          score: 0, 
          attempts: 0, 
          isAI: true 
        });
        
        // Store AI player in session
        if (!session.aiPlayers) {
          session.aiPlayers = [];
        }
        session.aiPlayers.push(aiPlayerId);
        
        // Broadcast updated player list
        io.to(gameId).emit('updatePlayers', getPlayersData(session));
        io.to(gameId).emit('playerJoined', { name: aiName, isAI: true });
      }
    } else {
      socket.emit('error', session ? 'Game is already in progress' : 'Game not found');
    }
  });
  // Add questions from AI
  socket.on('addQuestions', ({ gameId, questions }) => {
    const normalizedGameId = gameId.toLowerCase();
    const session = Array.from(gameSessions.entries()).find(
      ([id]) => id.toLowerCase() === normalizedGameId
    )?.[1];
    if (session && socket.id === session.gameMaster && !session.isActive) {
      questions.forEach(q => {
        if (q.options && q.correctOption !== undefined) {
          // Multiple choice question
          session.addQuestion(q.question, q.options[q.correctOption], q.options, q.correctOption);
        } else {
          // Standard question
          session.addQuestion(q.question, q.answer);
        }
      });
      socket.emit('questionsAdded', { count: questions.length });
    }
  });

  // Start game
  socket.on('startGame', ({ gameId }) => {
    const normalizedGameId = gameId.toLowerCase();
    const session = Array.from(gameSessions.entries()).find(
      ([id]) => id.toLowerCase() === normalizedGameId
    )?.[1];    
    if (session && socket.id === session.gameMaster && session.questions.length > 0) {
      session.isActive = true;
      const question = session.nextQuestion();
      
      // For multiple choice questions, send options too
      if (question.isMultipleChoice) {
        io.to(gameId).emit('gameStarted', { 
          question: question.question,
          options: question.options,
          isMultipleChoice: true
        });
      } else {
        io.to(gameId).emit('gameStarted', { question: question.question });
      }

      let timeLeft = 10;
      // Set up timer updates
      const timerInterval = setInterval(() => {
        timeLeft--;
        io.to(gameId).emit('timerUpdate', { timeLeft });
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
        }
      }, 1000);

      // Store the interval to clear it if needed
      session.timerInterval = timerInterval;

      // Set game timer
      session.timer = setTimeout(() => {
        clearInterval(timerInterval);
        endRound(gameId, null);
      }, 10000); // 10 seconds
    }
  });
  // Handle guess
  socket.on('makeGuess', ({ gameId, guess, optionIndex }) => {
    const normalizedGameId = gameId.toLowerCase();
    const session = Array.from(gameSessions.entries()).find(
      ([id]) => id.toLowerCase() === normalizedGameId
    )?.[1];
    if (session && session.isActive) {
      const player = session.players.get(socket.id);
      const currentQuestion = session.getCurrentQuestion();
      if (player && player.attempts < 3 && currentQuestion && socket.id !== session.gameMaster) {
        player.attempts++;
        const remainingAttempts = 3 - player.attempts;
        
        let isCorrect = false;
        // Check if it's a multiple choice question
        if (currentQuestion.isMultipleChoice) {
          // For multiple choice, compare the selected option index
          isCorrect = optionIndex === currentQuestion.correctOption;
        } else {
          // For text-based questions, compare the text
          isCorrect = guess.toLowerCase() === currentQuestion.answer.toLowerCase();
        }
        
        if (isCorrect) {
          player.score += 10;
          if (session.timerInterval) {
            clearInterval(session.timerInterval);
          }
          endRound(gameId, socket.id);
        } else {
          // Inform the player about wrong guess
          socket.emit('wrongGuess', { 
            remainingAttempts,
            message: remainingAttempts > 0 
              ? `Wrong answer! You have ${remainingAttempts} attempts left.`
              : 'No more attempts left for this question!'
          });
          
          // Inform other players
          socket.to(gameId).emit('playerGuessed', {
            playerName: player.name,
            remainingAttempts
          });
        }
        io.to(gameId).emit('updatePlayers', getPlayersData(session));
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    gameSessions.forEach((session, gameId) => {
      if (session.players.has(socket.id)) {
        const playerName = session.players.get(socket.id).name;
        session.players.delete(socket.id);
        if (session.players.size === 0) {
          if (session.timer) {
            clearTimeout(session.timer);
          }
          gameSessions.delete(gameId);
        } else if (socket.id === session.gameMaster) {
          const [newMaster] = session.players.keys();
          session.gameMaster = newMaster;
          io.to(gameId).emit('newGameMaster', { 
            masterId: newMaster,
            masterName: session.players.get(newMaster).name 
          });
        }
        io.to(gameId).emit('updatePlayers', getPlayersData(session));
        io.to(gameId).emit('playerLeft', { name: playerName });
      }
    });
  });  
  
  // Get AI questions
  socket.on('getAIQuestions', async ({ course, topic, isMultipleChoice, questionCount }) => {
    try {
      // Use default question count of 5 if not specified
      const count = questionCount || 5;
      const aiQuestions = await generateAIQuestions(course, topic, isMultipleChoice, count);
      socket.emit('aiQuestionsGenerated', { questions: aiQuestions });
    } catch (error) {
      console.error('Error generating AI questions:', error);
      socket.emit('error', 'Failed to generate questions');
    }
  });
  
  // Add AI player to the game
  socket.on('addAIPlayer', ({ gameId }) => {
    const normalizedGameId = gameId.toLowerCase();
    const session = Array.from(gameSessions.entries()).find(
      ([id]) => id.toLowerCase() === normalizedGameId
    )?.[1];
    
    if (session && socket.id === session.gameMaster && !session.isActive) {
      // Create unique AI player ID
      const aiPlayerId = `ai-${Math.random().toString(36).substring(2, 8)}`;
      
      // Smart AI names
      const aiNames = [
        'QuizMaster Pro', 
        'BrainBot', 
        'Quizatron', 
        'TriviaWiz AI', 
        'NeuralNinja', 
        'MindMaster', 
        'EinsteinAI',
        'SmartAlec',
        'OmniQuiz',
        'GeniusGPT'
      ];
      const aiName = aiNames[Math.floor(Math.random() * aiNames.length)];
      
      // Add AI player to session with 0 initial score
      session.players.set(aiPlayerId, { 
        name: aiName, 
        score: 0, 
        attempts: 0, 
        isAI: true 
      });
      
      // Store AI player in session
      if (!session.aiPlayers) {
        session.aiPlayers = [];
      }
      session.aiPlayers.push(aiPlayerId);
        // Broadcast updated player list
      io.to(gameId).emit('updatePlayers', getPlayersData(session));
      io.to(gameId).emit('playerJoined', { name: aiName, isAI: true });
    }
  });
    // Request to restart the game
  socket.on('restartGame', ({ gameId }) => {
    const normalizedGameId = gameId.toLowerCase();
    const session = Array.from(gameSessions.entries()).find(
      ([id]) => id.toLowerCase() === normalizedGameId
    )?.[1];
    
    if (session) {
      // Reset the game state
      session.questions = [];
      session.currentQuestionIndex = -1;
      session.isActive = false;
      session.currentRound = 0;
      session.roundWinners = [];
      
      // Make sure current game master is removed from AI players list if it's an AI
      if (session.aiPlayers && session.players.get(session.gameMaster)?.isAI) {
        const aiIndex = session.aiPlayers.indexOf(session.gameMaster);
        if (aiIndex !== -1) {
          session.aiPlayers.splice(aiIndex, 1);
        }
      }
      
      // Reset player scores while keeping the players
      session.players.forEach(player => {
        player.score = 0;
        player.attempts = 0;
      });
      
      // Notify all players about the game restart
      io.to(gameId).emit('gameRestarted', {
        gameMaster: session.gameMaster,
        masterName: session.players.get(session.gameMaster).name,
        players: getPlayersData(session)
      });
    }
  });
});

// Game Session class
class GameSession {
  constructor(gameId, gameMaster, masterName) {
    this.gameId = gameId;
    this.gameMaster = gameMaster;
    this.players = new Map([[gameMaster, { name: masterName, score: 0, attempts: 0 }]]);
    this.questions = [];
    this.currentQuestionIndex = -1;
    this.isActive = false;
    this.timer = null;
    this.currentRound = 0;
    this.totalRounds = 3; // Each game consists of 3 rounds
    this.roundWinners = []; // Track winners of each round
  }
  
  addQuestion(question, answer, options = null, correctOption = null) {
    if (options && correctOption !== null) {
      // For multiple choice questions
      this.questions.push({ question, answer, options, correctOption, isMultipleChoice: true });
    } else {
      // For standard questions
      this.questions.push({ question, answer });
    }
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex < this.questions.length) {
      return this.questions[this.currentQuestionIndex];
    }
    return null;
  }

  getCurrentQuestion() {
    return this.questions[this.currentQuestionIndex];
  }
}

// Helper functions
function getPlayersData(session) {
  return Array.from(session.players.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    score: data.score,
    isMaster: id === session.gameMaster,
    isAI: !!data.isAI
  }));
}

function endRound(gameId, winnerId) {
  const session = gameSessions.get(gameId);
  if (!session) return; // Safety check
  
  clearTimeout(session.timer);
  if (session.timerInterval) {
    clearInterval(session.timerInterval);
  }
  
  const currentQuestion = session.getCurrentQuestion();
  if (!currentQuestion) return; // Safety check
  
  let winnerData = null;

  // If no winner (timeout or all attempts used), credit the game master
  if (!winnerId) {
    winnerData = session.players.get(session.gameMaster);
    winnerData.score += 10;
    winnerId = session.gameMaster;
  } else {
    winnerData = session.players.get(winnerId);
  }
  
  // Add winner to round winners
  session.roundWinners.push({
    id: winnerId,
    name: winnerData.name,
    isAI: !!winnerData.isAI
  });
  
  io.to(gameId).emit('roundEnded', {
    winner: {
      id: winnerId,
      name: winnerData.name
    },
    answer: currentQuestion.answer,
    scores: getPlayersData(session),
    currentRound: session.currentRound + 1,
    totalRounds: session.totalRounds
  });
  
  // Reset attempts for next question
  session.players.forEach(player => player.attempts = 0);
  
  // Check if there are more questions
  const nextQuestion = session.nextQuestion();
  
  if (nextQuestion) {
    setTimeout(() => {
      // For multiple choice questions, send options too
      if (nextQuestion.isMultipleChoice) {
        io.to(gameId).emit('gameStarted', { 
          question: nextQuestion.question,
          options: nextQuestion.options,
          isMultipleChoice: true
        });
      } else {
        io.to(gameId).emit('gameStarted', { question: nextQuestion.question });
      }
        // Handle AI players' guesses with random delay
      if (session.aiPlayers && session.aiPlayers.length > 0) {
        session.aiPlayers.forEach(aiPlayerId => {
          const aiPlayer = session.players.get(aiPlayerId);
          // Skip if this AI player is the game master
          if (aiPlayer && aiPlayer.isAI && aiPlayerId !== session.gameMaster) {
            // More strategic thinking time - faster when it "knows" the answer
            let thinkingTime;
            if (Math.random() < 0.9) { // When AI will answer correctly
              // Answer quickly (1-4 seconds) as if it knows the answer
              thinkingTime = Math.floor(Math.random() * 3000) + 1000;
            } else {
              // Take longer (4-8 seconds) when it will guess incorrectly
              thinkingTime = Math.floor(Math.random() * 4000) + 4000;
            }
            
            setTimeout(() => {
              // Get current question first
              const currentQ = session.getCurrentQuestion();
              
              // Smart AI with topic-specific knowledge
              let successRate = 0.9; // Default 90% success rate
              
              // Topic-specific knowledge adjustment
              if (currentQ && currentQ.question) {
                const question = currentQ.question.toLowerCase();
                
                // The AI is extremely good at certain topics
                if (question.includes('javascript') || 
                    question.includes('css') ||
                    question.includes('html') ||
                    question.includes('react') ||
                    question.includes('programming') ||
                    question.includes('algorithm')) {
                  successRate = 0.95; // 95% success rate for programming topics
                }
                // Slightly less confident on some topics
                else if (question.includes('history') ||
                         question.includes('geography') ||
                         question.includes('literature')) {
                  successRate = 0.85; // 85% success rate
                }
              }
              
              const willGuessCorrectly = Math.random() < successRate;
              
              if (currentQ && willGuessCorrectly) {
                // AI guesses correctly
                aiPlayer.score += 10;
                // Announce AI's correct guess with realistic response
                const correctResponses = [
                  `The answer is ${currentQ.answer}!`,
                  `I believe it's ${currentQ.answer}`,
                  `That would be ${currentQ.answer}`,
                  `${currentQ.answer}, without a doubt`,
                  `I'm confident it's ${currentQ.answer}`
                ];
                const responseText = correctResponses[Math.floor(Math.random() * correctResponses.length)];
                
                io.to(gameId).emit('aiGuessedCorrect', {
                  playerName: aiPlayer.name,
                  answer: responseText
                });
                
                // End the round with AI as winner
                endRound(gameId, aiPlayerId);
              } else if (currentQ) {
                // AI guesses incorrectly
                aiPlayer.attempts++;
                const remainingAttempts = 3 - aiPlayer.attempts;
                // Generate a plausible but wrong answer
                let wrongGuess;
                if (currentQ.isMultipleChoice && currentQ.options) {
                  // Pick a wrong option for multiple choice
                  const wrongOptions = currentQ.options.filter((_, index) => 
                    index !== currentQ.correctOption
                  );
                  wrongGuess = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
                } else {
                  // Generate more intelligent wrong answers based on correct answer
                  const answer = currentQ.answer.toLowerCase();
                  // Generate intelligent wrong answer based on the correct answer
                  if (answer === "javascript") wrongGuess = "TypeScript";
                  else if (answer === "python") wrongGuess = "Ruby";
                  else if (answer === "java") wrongGuess = "C#";
                  else if (answer === "margin") wrongGuess = "padding";
                  else if (answer === "flexbox") wrongGuess = "grid";
                  else if (!isNaN(answer)) {
                    // If answer is a number, guess a number close to it
                    wrongGuess = String(Number(answer) + (Math.random() > 0.5 ? 1 : -1));
                  } else {
                    // Default wrong answers
                    const defaultWrongs = [
                      "Hmm, I think it's " + answer.charAt(0) + "...", 
                      "Could it be " + answer.split('').reverse().join('') + "?",
                      answer.length > 3 ? answer.substring(0, Math.floor(answer.length/2)) + "..." : "Not sure"
                    ];
                    wrongGuess = defaultWrongs[Math.floor(Math.random() * defaultWrongs.length)];
                  }
                }
                
                // Announce AI's wrong guess
                io.to(gameId).emit('playerGuessed', {
                  playerName: aiPlayer.name,
                  remainingAttempts,
                  guess: wrongGuess,
                  isAI: true
                });
              }
              
              // Update scores
              io.to(gameId).emit('updatePlayers', getPlayersData(session));
            }, thinkingTime);
          }
        });
      }
      
      let timeLeft = 60; // Set back to 60 seconds for the full game timer
      const timerInterval = setInterval(() => {
        timeLeft--;
        io.to(gameId).emit('timerUpdate', { timeLeft });
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
        }
      }, 1000);

      session.timerInterval = timerInterval;
      session.timer = setTimeout(() => {
        clearInterval(timerInterval);
        endRound(gameId, null);
      }, 60000);
    }, 5000);
  } else {
    // Increment round counter
    session.currentRound++;
    
    // Check if we've reached the maximum number of rounds
    if (session.currentRound >= session.totalRounds) {
      // Game is fully complete, find the overall winner
      session.isActive = false;
      const winner = findGameWinner(session);
        // Set the winner as the new game master
      session.gameMaster = winner.id;
      session.questions = [];
      session.currentQuestionIndex = -1;
      session.currentRound = 0; // Reset round counter
      session.roundWinners = []; // Reset round winners
      
      // If winner is an AI, remove them from the aiPlayers list to prevent them from guessing
      if (session.aiPlayers && session.players.get(winner.id).isAI) {
        const aiIndex = session.aiPlayers.indexOf(winner.id);
        if (aiIndex !== -1) {
          session.aiPlayers.splice(aiIndex, 1);
        }
      }
      
      io.to(gameId).emit('gameEnded', {
        winner: {
          id: winner.id,
          name: winner.name,
          score: winner.score
        },
        finalScores: getPlayersData(session),
        newMaster: winner.id
      });
    } else {
      // Round is complete but game continues - set new host based on round winner
      const roundWinner = session.roundWinners[session.roundWinners.length - 1];
      const previousMaster = session.gameMaster;
      
      // Set the round winner as the new game master
      session.gameMaster = roundWinner.id;
      
      // Reset questions for next round
      session.questions = [];
      session.currentQuestionIndex = -1;
      
      // Notify clients of the new round and game master
      io.to(gameId).emit('newRound', {
        roundNumber: session.currentRound + 1,
        totalRounds: session.totalRounds,
        newMaster: roundWinner.id,
        newMasterName: roundWinner.name,
        isAIMaster: roundWinner.isAI
      });
        // If AI is the new game master, automatically generate questions
      if (session.players.get(roundWinner.id).isAI) {
        // Remove AI from the players who can make guesses since it's now the game master
        if (session.aiPlayers) {
          const aiIndex = session.aiPlayers.indexOf(roundWinner.id);
          if (aiIndex !== -1) {
            session.aiPlayers.splice(aiIndex, 1);
          }
        }
        
        // Wait a bit to simulate AI thinking about questions
        setTimeout(async () => {
          try {
            // Generate random topic for AI
            const aiTopics = [
              'JavaScript', 'CSS', 'HTML', 'React', 'Angular', 'Vue',
              'Node.js', 'Express', 'MongoDB', 'SQL', 'Python', 'Java',
              'Web Development', 'Frontend', 'Backend', 'Full Stack',
              'DevOps', 'UI/UX Design', 'Mobile Development'
            ];
            const aiCourses = [
              'Web Development', 'Programming', 'Computer Science', 'Software Engineering',
              'Frontend Development', 'Backend Development', 'Full Stack Development'
            ];
            
            const selectedTopic = aiTopics[Math.floor(Math.random() * aiTopics.length)];
            const selectedCourse = aiCourses[Math.floor(Math.random() * aiCourses.length)];
            
            // 50% chance to be multiple choice
            const isMultipleChoice = Math.random() > 0.5;
            
            // Generate 3-5 AI questions
            const questionCount = Math.floor(Math.random() * 3) + 3;
            const aiQuestions = await generateAIQuestions(selectedCourse, selectedTopic, isMultipleChoice, questionCount);
            
            // Add questions to session
            if (aiQuestions && aiQuestions.length > 0) {
              aiQuestions.forEach(q => {
                if (q.options && q.correctOption !== undefined) {
                  // Multiple choice question
                  session.addQuestion(q.question, q.options[q.correctOption], q.options, q.correctOption);
                } else {
                  // Standard question
                  session.addQuestion(q.question, q.answer);
                }
              });
              
              // Notify about the topic selected by AI
              io.to(gameId).emit('aiHostingRound', { 
                aiName: session.players.get(roundWinner.id).name,
                topic: selectedTopic,
                isMultipleChoice: isMultipleChoice,
                questionCount: aiQuestions.length
              });
              
              // Start the game automatically
              setTimeout(() => {
                session.isActive = true;
                const question = session.nextQuestion();
                
                // For multiple choice questions, send options too
                if (question.isMultipleChoice) {
                  io.to(gameId).emit('gameStarted', { 
                    question: question.question,
                    options: question.options,
                    isMultipleChoice: true
                  });
                } else {
                  io.to(gameId).emit('gameStarted', { question: question.question });
                }
          
                let timeLeft = 60;
                // Set up timer updates
                const timerInterval = setInterval(() => {
                  timeLeft--;
                  io.to(gameId).emit('timerUpdate', { timeLeft });
                  if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                  }
                }, 1000);
          
                // Store the interval to clear it if needed
                session.timerInterval = timerInterval;
          
                // Set game timer
                session.timer = setTimeout(() => {
                  clearInterval(timerInterval);
                  endRound(gameId, null);
                }, 60000); // 60 seconds
              }, 3000); // Wait 3 seconds before starting
            }
          } catch (error) {
            console.error('Error with AI host generating questions:', error);
            
            // If AI hosting fails, revert to previous game master
            session.gameMaster = previousMaster;
            io.to(gameId).emit('error', 'AI host had trouble creating questions. Game master role reverted.');
            io.to(gameId).emit('newGameMaster', { 
              masterId: previousMaster,
              masterName: session.players.get(previousMaster).name 
            });
          }
        }, 2000); // Wait 2 seconds before AI generates questions
      }
    }
  }
}

function findGameWinner(session) {
  let winner = { score: -1 };
  session.players.forEach((data, id) => {
    if (data.score > winner.score) {
      winner = { id, name: data.name, score: data.score };
    }
  });
  return winner;
}

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
