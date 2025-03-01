// Learn more about this file at:
// https://victorzhou.com/blog/build-an-io-game-part-1/#5-client-rendering
import { debounce } from 'throttle-debounce';
import { getAsset } from './assets';
import { getCurrentState } from './state';

const Constants = require('../shared/constants');

const { PLAYER_RADIUS, PLAYER_MAX_HP, BULLET_RADIUS, MAP_SIZE } = Constants;

// Get the canvas graphics context
const canvas = document.getElementById('game-canvas');
const context = canvas.getContext('2d');
setCanvasDimensions();

function setCanvasDimensions() {
  // On small screens (e.g. phones), we want to "zoom out" so players can still see at least
  // 800 in-game units of width.
  const scaleRatio = Math.max(1, 800 / window.innerWidth);
  canvas.width = scaleRatio * window.innerWidth;
  canvas.height = scaleRatio * window.innerHeight;
}

window.addEventListener('resize', debounce(40, setCanvasDimensions));

let animationFrameRequestId;

function render() {
  const { me, others, bullets } = getCurrentState();
  if (me) {
    // Draw background
    renderBackground(me.x, me.y);

    // Draw boundaries
    context.strokeStyle = 'white';
    context.lineWidth = 5;
    context.strokeRect(canvas.width / 2 - me.x, canvas.height / 2 - me.y, MAP_SIZE, MAP_SIZE);
    
    // Draw all bullets
    bullets.forEach(renderBullet.bind(null, me));

    // Draw all players
    renderPlayer(me, me);
    others.forEach(renderPlayer.bind(null, me));
  }

  // Rerun this render function on the next frame
  animationFrameRequestId = requestAnimationFrame(render);
}

function renderBackground(x, y) {
  // Очищаем canvas, делая его полностью прозрачным
  context.clearRect(0, 0, canvas.width, canvas.height);
}
// Renders a ship at the given coordinates
function renderPlayer(me, player) {
  const { x, y, direction } = player;
  const canvasX = canvas.width / 2 + x - me.x;
  const canvasY = canvas.height / 2 + y - me.y;

  // Draw ship
  context.save();
  context.translate(canvasX, canvasY);
  context.rotate(direction);
  context.drawImage(
    getAsset('ship.svg'),
    -PLAYER_RADIUS,
    -PLAYER_RADIUS,
    PLAYER_RADIUS * 2,
    PLAYER_RADIUS * 2,
  );
  context.restore();

  // Draw health bar
  context.fillStyle = 'white';
  context.fillRect(
    canvasX - PLAYER_RADIUS,
    canvasY + PLAYER_RADIUS + 8,
    PLAYER_RADIUS * 2,
    2,
  );
  context.fillStyle = 'red';
  context.fillRect(
    canvasX - PLAYER_RADIUS + PLAYER_RADIUS * 2 * player.hp / PLAYER_MAX_HP,
    canvasY + PLAYER_RADIUS + 8,
    PLAYER_RADIUS * 2 * (1 - player.hp / PLAYER_MAX_HP),
    2,
  );
}

function renderBullet(me, bullet) {
  const { x, y, direction } = bullet;

  // Вычисление координат пули
  const bulletX = canvas.width / 2 + x - me.x;
  const bulletY = canvas.height / 2 + y - me.y;

  // Устанавливаем параметры пули (ширина, высота)
  const bulletWidth = BULLET_RADIUS * 2;
  const bulletHeight = BULLET_RADIUS * 4;

  // Рисуем пулю
  context.save();
  context.translate(bulletX, bulletY);

  // Рассчитываем угол поворота пули по направлению вектора
  const angle = Math.atan2(bullet.y - me.y, bullet.x - me.x); // Вычисление угла между игроком и пулей

  // Поворачиваем пулю на вычисленный угол и добавляем дополнительный поворот на 90°
  context.rotate(angle + Math.PI / 2);  // Поворачиваем пулю на вычисленный угол и дополнительно на 90°

  context.fillStyle = 'orange'; // Оранжевая заливка
  context.strokeStyle = 'black'; // Черные границы
  context.lineWidth = 2; // Толщина границы

  // Рисуем прямоугольник (основная часть пули)
  context.fillRect(-bulletWidth / 2, -bulletHeight / 2, bulletWidth, bulletHeight);
  context.strokeRect(-bulletWidth / 2, -bulletHeight / 2, bulletWidth, bulletHeight);

  // Рисуем конус (треугольник) на конце пули
  context.beginPath();
  context.moveTo(0, -bulletHeight / 2); // Начальная точка (верх пули)
  context.lineTo(-bulletWidth / 2, -bulletHeight / 2 - 5); // Левый угол конуса
  context.lineTo(bulletWidth / 2, -bulletHeight / 2 - 5); // Правый угол конуса
  context.closePath();
  context.fillStyle = 'orange'; // Оранжевая заливка для конуса
  context.fill();
  context.stroke();

  context.restore();
}

function renderMainMenu() {
  const t = Date.now() / 7500;
  const x = MAP_SIZE / 2 + 800 * Math.cos(t);
  const y = MAP_SIZE / 2 + 800 * Math.sin(t);
  renderBackground(x, y);

  // Rerun this render function on the next frame
  animationFrameRequestId = requestAnimationFrame(renderMainMenu);
}

animationFrameRequestId = requestAnimationFrame(renderMainMenu);

// Replaces main menu rendering with game rendering.
export function startRendering() {
  cancelAnimationFrame(animationFrameRequestId);
  animationFrameRequestId = requestAnimationFrame(render);
}

// Replaces game rendering with main menu rendering.
export function stopRendering() {
  cancelAnimationFrame(animationFrameRequestId);
  animationFrameRequestId = requestAnimationFrame(renderMainMenu);
}
