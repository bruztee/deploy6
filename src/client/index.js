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
const deadUsername = document.getElementById('dead-username');
const allTimeLeaderboard = document.getElementById('all-time-leaderboard');
const socialLinks = document.getElementById('social-links');

// Create matrix particles for social links
function createMatrixParticles() {
  const particlesContainer = document.querySelector('#social-links .particles');
  if (!particlesContainer) return;
  
  // Clear existing particles
  particlesContainer.innerHTML = '';
  
  // Create new particles
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 10}s`;
    particle.style.animationDuration = `${5 + Math.random() * 10}s`;
    particlesContainer.appendChild(particle);
  }
}

Promise.all([
  connect(onGameOver),
  downloadAssets(),
]).then(() => {
  playMenu.classList.remove('hidden');
  socialLinks.classList.remove('hidden'); // Show social links at startup
  if (allTimeLeaderboard) allTimeLeaderboard.classList.remove('hidden'); // Показываем топ-10 при запуске
  usernameInput.focus();
  
  // Create matrix particles
  createMatrixParticles();
  
  playButton.addEventListener('click', () => {
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
    socialLinks.classList.add('hidden'); // Hide social links during gameplay
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
  });
  
  // Add event listener to reconnect button
  const reconnectButton = document.getElementById('reconnect-button');
  if (reconnectButton) {
    reconnectButton.addEventListener('click', () => {
      disconnectModal.classList.add('hidden');
      playMenu.classList.remove('hidden');
      socialLinks.classList.remove('hidden'); // Show social links when returning to menu
      if (allTimeLeaderboard) allTimeLeaderboard.classList.remove('hidden');
      usernameInput.focus();
      
      // Recreate matrix particles
      createMatrixParticles();
    });
  }
  
}).catch(console.error);

function onGameOver(data) {
  stopCapturingInput();
  // We don't call stopRendering() anymore to keep the game background visible
  // stopRendering();
  setLeaderboardHidden(true);
  document.getElementById('chat-container').classList.add('hidden');

  if (disconnectModal) {
    disconnectModal.classList.remove('hidden');
    
    // Display username in death screen
    if (deadUsername) {
      deadUsername.textContent = `Player: ${data.username}`;
    }
    
    const scoreDisplay = document.getElementById('final-score');
    if (scoreDisplay) {
      scoreDisplay.textContent = `Final Score: ${data.score}`;
    }
  }
}