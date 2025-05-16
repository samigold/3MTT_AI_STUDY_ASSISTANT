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
    )?.[1];    if (session && socket.id === session.gameMaster && session.questions.length > 0) {
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
  socket.on('getAIQuestions', async ({ course, topic, isMultipleChoice }) => {
    try {
      const aiQuestions = await generateAIQuestions(course, topic, isMultipleChoice);
      socket.emit('aiQuestionsGenerated', { questions: aiQuestions });
    } catch (error) {
      console.error('Error generating AI questions:', error);
      socket.emit('error', 'Failed to generate questions');
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
    isMaster: id === session.gameMaster
  }));
}

function endRound(gameId, winnerId) {
  const session = gameSessions.get(gameId);
  if (session) {
    clearTimeout(session.timer);
    if (session.timerInterval) {
      clearInterval(session.timerInterval);
    }
    const currentQuestion = session.getCurrentQuestion();
    let winnerData = null;

    // If no winner (timeout or all attempts used), credit the game master
    if (!winnerId) {
      winnerData = session.players.get(session.gameMaster);
      winnerData.score += 10;
      winnerId = session.gameMaster;
    } else {
      winnerData = session.players.get(winnerId);
    }
    
    io.to(gameId).emit('roundEnded', {
      winner: {
        id: winnerId,
        name: winnerData.name
      },
      answer: currentQuestion.answer,
      scores: getPlayersData(session)
    });

    // Reset attempts for next question
    session.players.forEach(player => player.attempts = 0);

    // Check if there are more questions
    const nextQuestion = session.nextQuestion();    if (nextQuestion) {
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
        
        let timeLeft = 10;
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
      session.isActive = false;
      const winner = findGameWinner(session);
      
      // Set the winner as the new game master
      session.gameMaster = winner.id;
      session.questions = [];
      session.currentQuestionIndex = -1;
      
      io.to(gameId).emit('gameEnded', {
        winner: {
          id: winner.id,
          name: winner.name,
          score: winner.score
        },
        finalScores: getPlayersData(session),
        newMaster: winner.id
      });
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