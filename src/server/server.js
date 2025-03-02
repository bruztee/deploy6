const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const socketio = require('socket.io');

const Constants = require('../shared/constants');
const Game = require('./game');
const webpackConfig = require('../../webpack.dev.js');

const app = express();
app.use(express.static('public'));

if (process.env.NODE_ENV === 'development') {
  const compiler = webpack(webpackConfig);
  app.use(webpackDevMiddleware(compiler));
} else {
  app.use(express.static('dist'));
}

const port = process.env.PORT || 3000;
const server = app.listen(port);
console.log(`Server listening on port ${port}`);

const io = socketio(server);
const chatHistory = [];
const game = new Game(io); // Передаём io в Game

io.on('connection', socket => {
  console.log('Player connected!', socket.id);

  // Отправляем историю чата и топ-10 новому пользователю
  socket.emit('chatHistory', chatHistory);
  socket.emit('allTimeLeaderboard', game.getAllTimeLeaderboard());

  socket.on(Constants.MSG_TYPES.JOIN_GAME, joinGame);
  socket.on(Constants.MSG_TYPES.INPUT, handleInput);
  socket.on('disconnect', onDisconnect);

  socket.on('chatMessage', (data) => {
    console.log('Received chat message on server:', JSON.stringify(data));
    if (data && typeof data === 'object' && data.message && data.message.trim() && data.username) {
      const chatMsg = {
        username: data.username,
        message: data.message.substr(0, 100),
      };
      chatHistory.push(chatMsg);
      if (chatHistory.length > 50) chatHistory.shift();
      io.emit('chatMessage', chatMsg);
      console.log('Broadcasting chat message:', chatMsg);
    } else {
      console.log('Invalid chat message format or content:', JSON.stringify(data));
    }
  });
});

function joinGame(username) {
  if (typeof username !== 'string') return;

  username = username.trim(); // Убираем пробелы в начале и конце

  if (username.length === 0) {
    this.emit('errorMessage', 'Username cannot be empty'); // Можно отправить ошибку клиенту
    return;
  }

  if (username.length > 10) {
    username = username.substring(0, 10); // Обрезаем до 10 символов
  }

  game.addPlayer(this, username);
}

function handleInput(dir) {
  game.handleInput(this, dir);
}

function onDisconnect() {
  game.removePlayer(this);
}