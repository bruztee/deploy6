import io from 'socket.io-client';
import { throttle } from 'throttle-debounce';
import { processGameUpdate } from './state';

const Constants = require('../shared/constants');

// Определяем протокол для WebSocket (ws или wss)
const socketProtocol = (window.location.protocol.includes('https')) ? 'wss' : 'ws';
const socket = io(`${socketProtocol}://${window.location.host}`, {
  transports: ['websocket'], // Только WebSocket
});

// Промис для ожидания подключения
const connectedPromise = new Promise(resolve => {
  socket.on('connect', () => {
    console.log('✅ Connected to server! Socket ID:', socket.id);
    resolve();
  });

  socket.on('connect_error', (error) => console.error('❌ Connection error:', error));
  socket.on('disconnect', (reason) => console.log('❌ Disconnected from server. Reason:', reason));
});

// Подключение к серверу
export const connect = onGameOver => (
  connectedPromise.then(() => {
    socket.on(Constants.MSG_TYPES.GAME_UPDATE, processGameUpdate);
    socket.on(Constants.MSG_TYPES.GAME_OVER, onGameOver);

    // 🔹 Получаем историю чата при подключении
    socket.on('chatHistory', (history) => {
      console.log('📜 Received chat history:', history);
      history.forEach(displayChatMessage);

      // Прокрутка вниз после отрисовки всех сообщений
      setTimeout(scrollChatToBottom, 0); // Используем setTimeout для гарантии отрисовки
    });

    // 🔹 Обработчик новых сообщений
    socket.on('chatMessage', (data) => {
      console.log('💬 Received chat message:', data);
      displayChatMessage(data);
      scrollChatToBottom(); // Прокрутка вниз после нового сообщения
    });
  }).catch(error => console.error('Error in connect promise:', error))
);

// 🔹 Отправка сообщения в чат
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

// 🔹 Функция отображения сообщений в чате
export const displayChatMessage = (data) => {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) {
    console.error('⚠️ Chat box not found in DOM!');
    return;
  }
  const messageElement = document.createElement('div');
  messageElement.textContent = `${data.username}: ${data.message}`;
  chatBox.appendChild(messageElement);

  // Ограничиваем до 50 сообщений
  while (chatBox.children.length > 50) {
    chatBox.removeChild(chatBox.firstChild);
  }
};

// 🔹 Функция прокрутки чата вниз
export const scrollChatToBottom = () => {
  const chatBox = document.getElementById('chat-box');
  if (chatBox) {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};

// 🔹 Функция входа в игру
export const play = username => {
  if (!socket.connected) {
    console.warn('⚠️ Cannot join game: Socket is not connected');
    return;
  }
  socket.emit(Constants.MSG_TYPES.JOIN_GAME, username);

  // Прокрутка вниз после входа в игру
  setTimeout(scrollChatToBottom, 0); // Используем setTimeout для гарантии отрисовки
};

// 🔹 Функция обновления направления игрока (throttle)
export const updateDirection = throttle(20, dir => {
  if (!socket.connected) {
    console.warn('⚠️ Cannot update direction: Socket is not connected');
    return;
  }
  socket.emit(Constants.MSG_TYPES.INPUT, dir);
});