import io from 'socket.io-client';
import { throttle } from 'throttle-debounce';
import { processGameUpdate } from './state';

const Constants = require('../shared/constants');

const socketProtocol = window.location.protocol.includes('https') ? 'wss' : 'ws';
const socket = io(`${socketProtocol}://${window.location.host}`, {
  transports: ['websocket'],
});

const connectedPromise = new Promise(resolve => {
  socket.on('connect', () => {
    console.log('✅ Connected to server! Socket ID:', socket.id);
    resolve();
  });

  socket.on('connect_error', (error) => console.error('❌ Connection error:', error));
  socket.on('disconnect', (reason) => console.log('❌ Disconnected from server. Reason:', reason));
});

export const connect = onGameOver => (
  connectedPromise.then(() => {
    socket.on(Constants.MSG_TYPES.GAME_UPDATE, processGameUpdate);
    socket.on(Constants.MSG_TYPES.GAME_OVER, (data) => onGameOver(data));
    socket.on('chatHistory', (history) => {
      history.forEach(displayChatMessage);
      setTimeout(scrollChatToBottom, 0);
    });
    socket.on('chatMessage', (data) => {
      displayChatMessage(data);
      scrollChatToBottom();
    });
  }).catch(error => console.error('Error in connect promise:', error))
);

export const sendChatMessage = (message, username) => {
  connectedPromise.then(() => {
    if (!socket.connected) {
      console.warn('⚠️ Cannot send message: Socket is not connected');
      return;
    }
    const payload = { message: message.trim(), username: username.trim() };
    console.log(`📤 Sending chat message:`, JSON.stringify(payload));
    socket.emit('chatMessage', payload);
    sendChatMessage.counter = (sendChatMessage.counter || 0) + 1;
  }).catch(error => console.error('❌ Error sending chat message:', error));
};

export const displayChatMessage = (data) => {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) {
    console.error('⚠️ Chat box not found in DOM!');
    return;
  }
  const messageElement = document.createElement('div');
  messageElement.textContent = `${data.username}: ${data.message}`;
  chatBox.appendChild(messageElement);
  while (chatBox.children.length > 50) {
    chatBox.removeChild(chatBox.firstChild);
  }
};

export const scrollChatToBottom = () => {
  const chatBox = document.getElementById('chat-box');
  if (chatBox) {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};

export const play = username => {
  if (!socket.connected) {
    console.warn('⚠️ Cannot join game: Socket is not connected');
    return;
  }
  socket.emit(Constants.MSG_TYPES.JOIN_GAME, username);
  setTimeout(scrollChatToBottom, 0);
};

export const updateDirection = throttle(20, dir => {
  if (!socket.connected) {
    console.warn('⚠️ Cannot update direction: Socket is not connected');
    return;
  }
  socket.emit(Constants.MSG_TYPES.INPUT, dir);
});