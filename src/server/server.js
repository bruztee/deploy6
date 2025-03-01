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
const chatHistory = []; // Храним историю чата

io.on('connection', socket => {
  console.log('Player connected!', socket.id);

  // Отправляем историю чата новому пользователю
  socket.emit('chatHistory', chatHistory);

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

      // Добавляем сообщение в историю
      chatHistory.push(chatMsg);
      if (chatHistory.length > 50) chatHistory.shift(); // Ограничиваем до 50 сообщений

      // Отправляем сообщение всем пользователям
      io.emit('chatMessage', chatMsg);
      console.log('Broadcasting chat message:', chatMsg);
    } else {
      console.log('Invalid chat message format or content:', JSON.stringify(data));
    }
  });
});

const game = new Game();

function joinGame(username) {
  game.addPlayer(this, username);
}

function handleInput(dir) {
  game.handleInput(this, dir);
}

function onDisconnect() {
  game.removePlayer(this);
}