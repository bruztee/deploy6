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

Promise.all([
  connect(onGameOver),
  downloadAssets(),
]).then(() => {
  playMenu.classList.remove('hidden');
  usernameInput.focus();
  playButton.onclick = () => {
    play(usernameInput.value);
    playMenu.classList.add('hidden');
    initState();
    startCapturingInput();
    startRendering();
    setLeaderboardHidden(false);

    const chatContainer = document.getElementById('chat-container');
    chatContainer.classList.remove('hidden');

    const chatInput = document.getElementById('chat-input');
    const sendChatButton = document.getElementById('send-chat-button');

    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && chatInput.value.trim()) {
        sendChatMessage(chatInput.value, usernameInput.value);
        chatInput.value = '';
      }
    });

    sendChatButton.addEventListener('click', () => {
      if (chatInput.value.trim()) {
        sendChatMessage(chatInput.value, usernameInput.value);
        chatInput.value = '';
      }
    });
  };
}).catch(console.error);

function onGameOver(data) {
  stopCapturingInput();
  stopRendering();
  playMenu.classList.remove('hidden');
  setLeaderboardHidden(true);
  document.getElementById('chat-container').classList.add('hidden');

  // Показываем модальное окно с финальным счетом
  if (disconnectModal) {
    disconnectModal.classList.remove('hidden');
    const scoreDisplay = document.getElementById('final-score');
    if (scoreDisplay) {
      scoreDisplay.textContent = `Your Final Score: ${data.score}`;
    }

    const reconnectButton = document.getElementById('reconnect-button');
    if (reconnectButton) {
      reconnectButton.onclick = () => {
        disconnectModal.classList.add('hidden');
        playButton.click(); // Перезапуск игры
      };
    }
  }
}