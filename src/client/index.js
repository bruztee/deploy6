import { connect, play, sendChatMessage } from './networking';
import { startRendering, stopRendering } from './render';
import { startCapturingInput, stopCapturingInput } from './input';
import { downloadAssets } from './assets';
import { initState } from './state';
import { setLeaderboardHidden } from './leaderboard';

import './css/bootstrap-reboot.css';
import './css/main.css';

const playMenu = document.getElementById('play-menu');
const playButton = document.getElementById('play-button');
const usernameInput = document.getElementById('username-input');
const disconnectModal = document.getElementById('disconnect-modal');
const username = document.getElementById('dead-username');
const allTimeLeaderboard = document.getElementById('all-time-leaderboard');

Promise.all([
  connect(onGameOver),
  downloadAssets(),
]).then(() => {
  playMenu.classList.remove('hidden');
  if (allTimeLeaderboard) allTimeLeaderboard.classList.remove('hidden'); // Показываем топ-10 при запуске
  usernameInput.focus();
  playButton.onclick = () => {
    let username = usernameInput.value.trim();  // Получаем никнейм и обрезаем пробелы
    
    // Если ник пустой, присваиваем 'anonym'
    if (username.length === 0) {
      username = 'anonym';
    }
  
    // Проверка на слишком длинный ник
    if (username.length > 10) {
      username = username.substring(0, 10);  // Обрезаем до 10 символов
      usernameInput.value = username;  // Обновляем input
    }
  
    // Запускаем игру с корректным ником
    play(username);
    
    // Скрываем меню игры и показываем игру
    playMenu.classList.add('hidden');
    if (allTimeLeaderboard) allTimeLeaderboard.classList.add('hidden'); // Скрываем топ-10 в игре
    initState();
    startCapturingInput();
    startRendering();
    setLeaderboardHidden(false);
  
    // Отображение чата
    const chatContainer = document.getElementById('chat-container');
    chatContainer.classList.remove('hidden');
  
    const chatInput = document.getElementById('chat-input');
    const sendChatButton = document.getElementById('send-chat-button');
  
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && chatInput.value.trim()) {
        sendChatMessage(chatInput.value, username);
        chatInput.value = '';
      }
    });
  
    sendChatButton.addEventListener('click', () => {
      if (chatInput.value.trim()) {
        sendChatMessage(chatInput.value, username);
        chatInput.value = '';
      }
    });
  };
}).catch(console.error);

function onGameOver(data) {
  stopCapturingInput();
  stopRendering();
  setLeaderboardHidden(true);
  document.getElementById('chat-container').classList.add('hidden');

  if (disconnectModal) {
    disconnectModal.classList.remove('hidden');
    const scoreDisplay = document.getElementById('final-score');
    if (scoreDisplay) {
      scoreDisplay.textContent = `Final Score: ${data.score}`;
      username.textContent = `Player: ${data.username}`;
    }

    const reconnectButton = document.getElementById('reconnect-button');
    if (reconnectButton) {
      reconnectButton.onclick = () => {
        disconnectModal.classList.add('hidden');
        playMenu.classList.remove('hidden');
        if (allTimeLeaderboard) allTimeLeaderboard.classList.remove('hidden'); // Показываем топ-10 после смерти
        usernameInput.focus();
      };
    }
  }
}