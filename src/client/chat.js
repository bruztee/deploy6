const socket = io(); // Подключаем сокет
const chatBox = document.getElementById('chat-box'); // Блок чата

// Функция для отправки сообщений
export function sendChatMessage(message, username) {
  const messageObj = { message, username };
  
  // Первое сообщение отправляем дважды (если сервер не принимает)
  socket.emit('chatMessage', messageObj);
  setTimeout(() => socket.emit('chatMessage', messageObj), 300); 

  appendChatMessage(messageObj);
}

// Функция для отображения сообщений в чате
function appendChatMessage({ message, username }) {
  const messageElement = document.createElement('p');
  messageElement.textContent = `${username}: ${message}`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight; // Прокрутка вниз
}

// 🔹 Загружаем историю чата при подключении
socket.on('chatHistory', (history) => {
    console.log('Received chat history:', history); // Проверяем в консоли
    chatBox.innerHTML = ''; // Очистка перед загрузкой истории
    history.forEach(appendChatMessage);
  });

// 🔹 Слушаем новые сообщения
socket.on('chatMessage', appendChatMessage);