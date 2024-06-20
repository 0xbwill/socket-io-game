// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

// Servir les fichiers statiques
app.use(express.static('public'));

// Route pour la page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

app.get('/create', (req, res) => {
  const gameId = uuidv4();
  games[gameId] = {
    id: gameId,
    players: [],
    choices: {}
  };
  res.redirect(`/game/${gameId}`);
});

app.get('/game/:gameId', (req, res) => {
  const { gameId } = req.params;
  if (games[gameId]) {
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
  } else {
    res.status(404).send('Game not found');
  }
});

let games = {};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinGame', ({ gameId, username }) => {
    const game = games[gameId];
    if (game && game.players.length < 2) {
      game.players.push({ id: socket.id, username });
      socket.join(gameId);
      io.to(gameId).emit('startGame', { players: game.players });
    } else {
      socket.emit('error', 'Game is full or does not exist.');
    }
  });

  socket.on('makeChoice', ({ gameId, choice }) => {
    const game = games[gameId];
    if (game) {
      game.choices[socket.id] = choice;
      if (Object.keys(game.choices).length === 2) {
        io.to(gameId).emit('gameResult', calculateResult(game));
        delete games[gameId];
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    // Handle player disconnection logic here if necessary
  });
});

const calculateResult = (game) => {
  const [player1, player2] = game.players;
  const choice1 = game.choices[player1.id];
  const choice2 = game.choices[player2.id];

  if (choice1 === choice2) {
    return { result: 'draw', choices: { [player1.username]: choice1, [player2.username]: choice2 } };
  }

  const winMap = {
    pierre: ['ciseaux'],
    papier: ['pierre', 'puit'],
    ciseaux: ['papier'],
    puit: ['pierre', 'ciseaux']
  };

  const winner = winMap[choice1].includes(choice2) ? player1.username : player2.username;
  return { result: winner, choices: { [player1.username]: choice1, [player2.username]: choice2 } };
};

server.listen(port, () => console.log(`Listening on port ${port}`));
