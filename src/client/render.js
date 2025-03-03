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
// Store the last game state to continue rendering after death
let lastGameState = null;

function render() {
  const { me, others, bullets } = getCurrentState();
  
  // If we have a current game state, store it for use after death
  if (me) {
    lastGameState = { me, others, bullets };
    
    // Draw background
    renderBackground(me.x, me.y);

    // Draw boundaries
    context.strokeStyle = 'white';
    context.lineWidth = 5;
    context.strokeRect(canvas.width / 2 - me.x, canvas.height / 2 - me.y, MAP_SIZE, MAP_SIZE);
    
    // Draw all bullets
    bullets.forEach(renderBullet.bind(null, me));

    // Draw all other players first
    if (others && Array.isArray(others)) {
      others.forEach(player => renderPlayer(me, player, false));
    }
    
    // Draw my player last (on top)
    renderPlayer(me, me, true);
  } else if (lastGameState) {
    // If player is dead but we have a last game state, continue rendering the game world
    // but without the player
    const { me, others, bullets } = lastGameState;
    
    // Draw background
    renderBackground(me.x, me.y);

    // Draw boundaries
    context.strokeStyle = 'white';
    context.lineWidth = 5;
    context.strokeRect(canvas.width / 2 - me.x, canvas.height / 2 - me.y, MAP_SIZE, MAP_SIZE);
    
    // Draw all bullets
    bullets.forEach(renderBullet.bind(null, me));

    // Draw all other players
    if (others && Array.isArray(others)) {
      others.forEach(player => renderPlayer(me, player, false));
    }
    
    // Don't draw the player (they're dead)
  }

  // Rerun this render function on the next frame
  animationFrameRequestId = requestAnimationFrame(render);
}

function renderBackground(x, y) {
  // Очищаем canvas, делая его полностью прозрачным
  context.clearRect(0, 0, canvas.width, canvas.height);
}

// Helper function for rounded rectangles
function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (width <= 0 || height <= 0) return; // Prevent drawing with invalid dimensions
  
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Renders a ship at the given coordinates
function renderPlayer(me, player, isMe = false) {
  if (!player || typeof player.x !== 'number' || typeof player.y !== 'number') {
    console.warn('Invalid player data:', player);
    return; // Skip rendering if player data is invalid
  }
  
  const { x, y, direction, hp, username } = player;
  const canvasX = canvas.width / 2 + x - me.x;
  const canvasY = canvas.height / 2 + y - me.y;

  // Draw complex glow effect around player
  try {
    // Create multiple layers of glow with different sizes and opacities
    const time = Date.now() * 0.001;
    
    // Dynamic color cycling based on time for more complex visual effect
    const hueShift = Math.sin(time * 0.5) * 20; // Shift hue by ±20 degrees
    
    // Base colors with dynamic hue shift
    const baseHue = isMe ? 120 + hueShift : 0 + hueShift; // Green for me, red for others
    const secondaryHue = (baseHue + 40) % 360; // Complementary color
    const accentHue = (baseHue + 180) % 360; // Opposite color
    
    // Convert HSL to RGB for the glow effects
    const baseColor = hslToRgb(baseHue / 360, 1, 0.5);
    const secondaryColor = hslToRgb(secondaryHue / 360, 1, 0.6);
    const accentColor = hslToRgb(accentHue / 360, 0.8, 0.6);
    
    // Multiple pulsating effects with different frequencies
    const pulseSize1 = Math.sin(time * 2) * 0.15 + 1.0; // Slower pulse
    const pulseSize2 = Math.sin(time * 3.5) * 0.1 + 1.0; // Faster pulse
    const pulseSize3 = Math.sin(time * 5) * 0.05 + 1.0; // Very fast subtle pulse
    
    // Layered glow effects with multiple sizes and opacities
    // Outer glow layers (5 layers with decreasing opacity)
    const outerGlowLayers = 5;
    for (let i = 0; i < outerGlowLayers; i++) {
      const layerSize = PLAYER_RADIUS * (2.5 - i * 0.3) * pulseSize1;
      // Ensure layerSize is always positive
      if (layerSize <= 0) continue;
      
      const opacity = 0.12 - (i * 0.02);
      
      context.beginPath();
      context.arc(canvasX, canvasY, layerSize, 0, Math.PI * 2);
      context.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${opacity})`;
      context.fill();
    }
    
    // Middle glow layers (3 layers with medium opacity)
    const middleGlowLayers = 3;
    for (let i = 0; i < middleGlowLayers; i++) {
      const layerSize = PLAYER_RADIUS * (1.8 - i * 0.2) * pulseSize2;
      // Ensure layerSize is always positive
      if (layerSize <= 0) continue;
      
      const opacity = 0.25 - (i * 0.05);
      
      context.beginPath();
      context.arc(canvasX, canvasY, layerSize, 0, Math.PI * 2);
      context.fillStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${opacity})`;
      context.fill();
    }
    
    // Inner glow layers (2 layers with higher opacity)
    const innerGlowLayers = 2;
    for (let i = 0; i < innerGlowLayers; i++) {
      const layerSize = PLAYER_RADIUS * (1.4 - i * 0.2) * pulseSize3;
      // Ensure layerSize is always positive
      if (layerSize <= 0) continue;
      
      const opacity = 0.4 - (i * 0.1);
      
      context.beginPath();
      context.arc(canvasX, canvasY, layerSize, 0, Math.PI * 2);
      context.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${opacity})`;
      context.fill();
    }
    
    // Add complex orbital particle system
    const numParticleGroups = 3; // Three groups of particles
    const particlesPerGroup = 8; // 8 particles per group
    
    for (let group = 0; group < numParticleGroups; group++) {
      // Each group has different orbit radius and speed
      const orbitRadius = PLAYER_RADIUS * (1.6 + group * 0.3);
      const orbitSpeed = time * (1.2 - group * 0.3); // Different speeds
      const groupOffset = (Math.PI * 2 / numParticleGroups) * group; // Offset each group
      
      for (let i = 0; i < particlesPerGroup; i++) {
        const angle = (i / particlesPerGroup) * Math.PI * 2 + orbitSpeed + groupOffset;
        
        // Add wobble to orbit
        const wobble = Math.sin(time * 4 + i + group) * (5 + group * 2);
        const adjustedRadius = orbitRadius + wobble;
        
        const particleX = canvasX + Math.cos(angle) * adjustedRadius;
        const particleY = canvasY + Math.sin(angle) * adjustedRadius;
        
        // Particle size varies with time and position
        const particleSize = 2 + Math.sin(time * 3 + i + group * 2) * 1.5;
        
        // Draw particle with dynamic color based on position
        const particleHue = (baseHue + (i * 15) + (group * 40)) % 360;
        const particleColor = hslToRgb(particleHue / 360, 0.9, 0.6);
        
        context.beginPath();
        context.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        context.fillStyle = `rgba(${particleColor.r}, ${particleColor.g}, ${particleColor.b}, 0.8)`;
        context.fill();
        
        // Add glow to particles
        context.beginPath();
        context.arc(particleX, particleY, particleSize * 2, 0, Math.PI * 2);
        context.fillStyle = `rgba(${particleColor.r}, ${particleColor.g}, ${particleColor.b}, 0.2)`;
        context.fill();
        
        // Connect particles with energy lines (within same group)
        if (i > 0) {
          const prevAngle = ((i - 1) / particlesPerGroup) * Math.PI * 2 + orbitSpeed + groupOffset;
          const prevWobble = Math.sin(time * 4 + (i-1) + group) * (5 + group * 2);
          const prevRadius = orbitRadius + prevWobble;
          
          const prevX = canvasX + Math.cos(prevAngle) * prevRadius;
          const prevY = canvasY + Math.sin(prevAngle) * prevRadius;
          
          // Create gradient for line
          const lineGradient = context.createLinearGradient(particleX, particleY, prevX, prevY);
          lineGradient.addColorStop(0, `rgba(${particleColor.r}, ${particleColor.g}, ${particleColor.b}, 0.6)`);
          lineGradient.addColorStop(0.5, `rgba(${particleColor.r}, ${particleColor.g}, ${particleColor.b}, 0.2)`);
          lineGradient.addColorStop(1, `rgba(${particleColor.r}, ${particleColor.g}, ${particleColor.b}, 0.6)`);
          
          context.beginPath();
          context.moveTo(particleX, particleY);
          context.lineTo(prevX, prevY);
          context.strokeStyle = lineGradient;
          context.lineWidth = 0.8;
          context.stroke();
        }
        
        // Connect to next group occasionally for cross-connections
        if (group < numParticleGroups - 1 && i % 3 === 0) {
          const nextGroupAngle = (i / particlesPerGroup) * Math.PI * 2 + orbitSpeed + 
                                ((Math.PI * 2 / numParticleGroups) * (group + 1));
          const nextGroupRadius = PLAYER_RADIUS * (1.6 + (group + 1) * 0.3);
          const nextGroupX = canvasX + Math.cos(nextGroupAngle) * nextGroupRadius;
          const nextGroupY = canvasY + Math.sin(nextGroupAngle) * nextGroupRadius;
          
          // Pulsating opacity for cross-connections
          const crossOpacity = Math.sin(time * 6 + i + group) * 0.2 + 0.3;
          
          context.beginPath();
          context.moveTo(particleX, particleY);
          context.lineTo(nextGroupX, nextGroupY);
          context.strokeStyle = `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, ${crossOpacity})`;
          context.lineWidth = 0.5;
          context.stroke();
        }
      }
    }
    
    // Add energy field effect (multiple concentric circles with varying opacity and thickness)
    const numRings = 6; // More rings for complexity
    const maxRingRadius = PLAYER_RADIUS * 2.2;
    const minRingRadius = PLAYER_RADIUS * 1.1;
    
    for (let i = 0; i < numRings; i++) {
      // Non-linear distribution of rings for more interesting pattern
      const t = i / (numRings - 1);
      const ringRadius = minRingRadius + (maxRingRadius - minRingRadius) * Math.pow(t, 1.5);
      
      // Pulsating ring size
      const ringPulse = Math.sin(time * 2 + i * 0.7) * 5;
      const adjustedRadius = ringRadius + ringPulse;
      
      // Skip if radius is negative
      if (adjustedRadius <= 0) continue;
      
      // Dynamic opacity based on time and ring index
      const baseOpacity = 0.2 - (i / numRings) * 0.15;
      const opacityPulse = Math.sin(time * 3 + i) * 0.1;
      const ringOpacity = Math.max(0.05, baseOpacity + opacityPulse);
      
      // Dynamic width based on time and ring index
      const baseWidth = 1.5 - (i / numRings) * 0.5;
      const widthPulse = Math.sin(time * 4 + i * 2) * 0.5;
      const ringWidth = Math.max(0.5, baseWidth + widthPulse);
      
      // Dynamic color for each ring
      const ringHue = (accentHue + i * 30) % 360;
      const ringColor = hslToRgb(ringHue / 360, 0.8, 0.6);
      
      context.beginPath();
      context.arc(canvasX, canvasY, adjustedRadius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(${ringColor.r}, ${ringColor.g}, ${ringColor.b}, ${ringOpacity})`;
      context.lineWidth = ringWidth;
      context.stroke();
      
      // Add occasional dashed rings for variety
      if (i % 2 === 1) {
        // Skip if radius is negative
        if (adjustedRadius + 3 <= 0) continue;
        
        context.beginPath();
        context.arc(canvasX, canvasY, adjustedRadius + 3, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${ringColor.r}, ${ringColor.g}, ${ringColor.b}, ${ringOpacity * 0.7})`;
        context.lineWidth = ringWidth * 0.7;
        context.setLineDash([5, 10]); // Dashed line pattern
        context.stroke();
        context.setLineDash([]); // Reset to solid line
      }
    }
    
    // Add energy flares that shoot out from the player occasionally
    const numFlares = 3;
    const flareFrequency = 0.7; // How often flares appear (0-1)
    
    for (let i = 0; i < numFlares; i++) {
      // Only show flare sometimes based on time
      const flareTime = (time * 0.5 + i * 0.33) % 1;
      if (flareTime < flareFrequency) {
        // Flare angle changes over time
        const flareAngle = (time * 0.2 + i * Math.PI * 2 / numFlares) % (Math.PI * 2);
        const flareLength = PLAYER_RADIUS * (2 + Math.random() * 1.5);
        
        // Flare progress (0 at start, 1 at end of animation)
        const flareProgress = flareTime / flareFrequency;
        const flareWidth = PLAYER_RADIUS * 0.4 * (1 - flareProgress);
        
        // Flare start and end points
        const flareStartX = canvasX + Math.cos(flareAngle) * PLAYER_RADIUS;
        const flareStartY = canvasY + Math.sin(flareAngle) * PLAYER_RADIUS;
        const flareEndX = canvasX + Math.cos(flareAngle) * (PLAYER_RADIUS + flareLength * flareProgress);
        const flareEndY = canvasY + Math.sin(flareAngle) * (PLAYER_RADIUS + flareLength * flareProgress);
        
        // Create gradient for flare
        const flareGradient = context.createLinearGradient(flareStartX, flareStartY, flareEndX, flareEndY);
        
        // Flare color based on player color
        const flareHue = (baseHue + i * 30) % 360;
        const flareColor = hslToRgb(flareHue / 360, 1, 0.7);
        
        flareGradient.addColorStop(0, `rgba(${flareColor.r}, ${flareColor.g}, ${flareColor.b}, 0.8)`);
        flareGradient.addColorStop(1, `rgba(${flareColor.r}, ${flareColor.g}, ${flareColor.b}, 0)`);
        
        // Draw flare
        context.beginPath();
        context.moveTo(flareStartX, flareStartY);
        context.lineTo(flareEndX + Math.cos(flareAngle + Math.PI/2) * flareWidth, 
                       flareEndY + Math.sin(flareAngle + Math.PI/2) * flareWidth);
        context.lineTo(flareEndX - Math.cos(flareAngle + Math.PI/2) * flareWidth,
                       flareEndY - Math.sin(flareAngle + Math.PI/2) * flareWidth);
        context.closePath();
        context.fillStyle = flareGradient;
        context.fill();
        
        // Add particles along the flare
        const numFlareParticles = 5;
        for (let j = 0; j < numFlareParticles; j++) {
          const particleProgress = j / numFlareParticles;
          const particleX = flareStartX + (flareEndX - flareStartX) * particleProgress;
          const particleY = flareStartY + (flareEndY - flareStartY) * particleProgress;
          
          // Offset from flare center line
          const offsetAngle = flareAngle + Math.PI/2;
          const offsetDistance = (Math.random() - 0.5) * flareWidth * 2 * (1 - particleProgress);
          
          const finalX = particleX + Math.cos(offsetAngle) * offsetDistance;
          const finalY = particleY + Math.sin(offsetAngle) * offsetDistance;
          
          const particleSize = 1 + Math.random() * 2 * (1 - particleProgress);
          
          context.beginPath();
          context.arc(finalX, finalY, particleSize, 0, Math.PI * 2);
          context.fillStyle = `rgba(${flareColor.r}, ${flareColor.g}, ${flareColor.b}, ${0.7 * (1 - particleProgress)})`;
          context.fill();
        }
      }
    }
    
    // Add energy aura (inner glow with noise effect)
    const auraRadius = PLAYER_RADIUS * 1.1;
    const numAuraPoints = 30;
    const auraNoiseAmplitude = 5;
    
    context.beginPath();
    for (let i = 0; i <= numAuraPoints; i++) {
      const angle = (i / numAuraPoints) * Math.PI * 2;
      
      // Add noise to radius based on time and angle
      const noise = Math.sin(angle * 5 + time * 3) * auraNoiseAmplitude;
      const auraX = canvasX + Math.cos(angle) * (auraRadius + noise);
      const auraY = canvasY + Math.sin(angle) * (auraRadius + noise);
      
      if (i === 0) {
        context.moveTo(auraX, auraY);
      } else {
        context.lineTo(auraX, auraY);
      }
    }
    
    context.closePath();
    
    // Create radial gradient for aura
    const auraGradient = context.createRadialGradient(
      canvasX, canvasY, PLAYER_RADIUS * 0.5,
      canvasX, canvasY, auraRadius + auraNoiseAmplitude
    );
    
    auraGradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.5)`);
    auraGradient.addColorStop(0.5, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 0.3)`);
    auraGradient.addColorStop(1, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0)`);
    
    context.fillStyle = auraGradient;
    context.fill();
    
  } catch (error) {
    console.error('Error rendering player glow:', error);
    
    // Fallback to simple glow if complex one fails
    try {
      const glowRadius = PLAYER_RADIUS * 1.2;
      const glowColor = isMe ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 0, 0, 0.4)';
      
      context.beginPath();
      context.arc(canvasX, canvasY, glowRadius, 0, Math.PI * 2);
      context.fillStyle = glowColor;
      context.fill();
    } catch (fallbackError) {
      console.error('Even fallback glow failed:', fallbackError);
    }
  }

  // Draw ship
  try {
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
  } catch (error) {
    console.error('Error rendering player ship:', error);
  }

  // Draw modern health bar
  try {
    const healthBarWidth = PLAYER_RADIUS * 2;
    const healthBarHeight = 6;
    const healthBarY = canvasY + PLAYER_RADIUS + 10;
    const healthBarX = canvasX - PLAYER_RADIUS;
    
    // Health bar background with rounded corners
    drawRoundedRect(
      context,
      healthBarX,
      healthBarY,
      healthBarWidth,
      healthBarHeight,
      3 // border radius
    );
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fill();
    
    // Health bar border
    drawRoundedRect(
      context,
      healthBarX,
      healthBarY,
      healthBarWidth,
      healthBarHeight,
      3
    );
    context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    context.lineWidth = 1;
    context.stroke();
    
    // Health bar fill
    const healthPercent = hp / PLAYER_MAX_HP;
    const healthBarFillWidth = Math.max(0, healthBarWidth * healthPercent);
    
    // Create gradient based on health percentage
    let healthGradient;
    if (healthPercent > 0.6) {
      // Green to yellow gradient for high health
      healthGradient = context.createLinearGradient(healthBarX, 0, healthBarX + healthBarFillWidth, 0);
      healthGradient.addColorStop(0, 'rgba(0, 255, 100, 0.9)');
      healthGradient.addColorStop(1, 'rgba(120, 255, 0, 0.9)');
    } else if (healthPercent > 0.3) {
      // Yellow to orange gradient for medium health
      healthGradient = context.createLinearGradient(healthBarX, 0, healthBarX + healthBarFillWidth, 0);
      healthGradient.addColorStop(0, 'rgba(255, 200, 0, 0.9)');
      healthGradient.addColorStop(1, 'rgba(255, 120, 0, 0.9)');
    } else {
      // Red gradient for low health
      healthGradient = context.createLinearGradient(healthBarX, 0, healthBarX + healthBarFillWidth, 0);
      healthGradient.addColorStop(0, 'rgba(255, 0, 0, 0.9)');
      healthGradient.addColorStop(1, 'rgba(255, 50, 0, 0.9)');
    }
    
    // Draw health bar fill with rounded corners
    if (healthPercent > 0 && healthBarFillWidth > 0) {
      drawRoundedRect(
        context,
        healthBarX,
        healthBarY,
        healthBarFillWidth,
        healthBarHeight,
        3
      );
      context.fillStyle = healthGradient;
      context.fill();
      
      // Add shine effect to health bar
      if (healthBarFillWidth > 2) { // Only add shine if there's enough width
        const shineWidth = healthBarFillWidth * 0.8;
        const shineHeight = healthBarHeight * 0.4;
        
        drawRoundedRect(
          context,
          healthBarX + (healthBarFillWidth - shineWidth) / 2,
          healthBarY,
          shineWidth,
          shineHeight,
          2
        );
        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        context.fill();
      }
    }
  } catch (error) {
    console.error('Error rendering health bar:', error);
  }

  // Draw username above the player
  try {
    // Add glow effect to username text
    const time = Date.now() * 0.001;
    const glowIntensity = Math.sin(time * 2) * 0.3 + 0.7; // Pulsate between 0.4 and 1.0
    
    // Text shadow for glow effect
    context.shadowColor = isMe ? 
      `rgba(0, 255, 100, ${glowIntensity})` : 
      `rgba(255, 100, 100, ${glowIntensity})`;
    context.shadowBlur = 5;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    
    // Draw username text
    context.font = 'bold 14px Rajdhani, sans-serif';
    context.fillStyle = isMe ? '#AAFFAA' : 'white';
    context.textAlign = 'center';
    const displayName = username || 'Unnamed'; // Защита от undefined
    context.fillText(displayName, canvasX, canvasY - PLAYER_RADIUS - 15);
    
    // Reset shadow
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    
  } catch (error) {
    console.error('Error rendering username:', error);
  }
}

// Render bullet as a small cosmic star (3-4 pixels)
function renderBullet(me, bullet) {
  if (!bullet || typeof bullet.x !== 'number' || typeof bullet.y !== 'number') {
    return; // Skip rendering if bullet data is invalid
  }
  
  try {
    const { x, y } = bullet;
    const bulletX = canvas.width / 2 + x - me.x;
    const bulletY = canvas.height / 2 + y - me.y;
    
    // Create a random color for each bullet based on its ID
    // This ensures the same bullet keeps the same color
    const bulletId = parseInt(bullet.id.replace(/[^\d]/g, '0') || '0', 10);
    const hue = (bulletId * 137.5) % 360; // Golden ratio to distribute colors nicely
    
    // Time-based animation
    const time = Date.now() * 0.001;
    const pulseSize = Math.sin(time * 8 + bulletId) * 0.5 + 1.0; // Faster pulsation
    
    // Small star core (3-4 pixels)
    const starSize = 2 * pulseSize; // Base size of 2 pixels, pulsing between 1-3 pixels
    
    // Draw the star core with bright center
    context.beginPath();
    context.arc(bulletX, bulletY, starSize, 0, Math.PI * 2);
    context.fillStyle = `hsla(${hue}, 100%, 90%, 1.0)`;
    context.fill();
    
    // Add tiny glow around the star
    context.beginPath();
    context.arc(bulletX, bulletY, starSize * 2, 0, Math.PI * 2);
    context.fillStyle = `hsla(${hue}, 100%, 80%, 0.5)`;
    context.fill();
    
    // Add even smaller outer glow
    context.beginPath();
    context.arc(bulletX, bulletY, starSize * 3, 0, Math.PI * 2);
    context.fillStyle = `hsla(${hue}, 100%, 70%, 0.2)`;
    context.fill();
    
    // Add star points (4-point star)
    const starRays = 4;
    const rayLength = starSize * 3 * pulseSize;
    
    for (let i = 0; i < starRays; i++) {
      const angle = (i / starRays) * Math.PI * 2 + time * 2; // Rotating rays
      
      // Create gradient for ray
      const rayGradient = context.createLinearGradient(
        bulletX, bulletY,
        bulletX + Math.cos(angle) * rayLength,
        bulletY + Math.sin(angle) * rayLength
      );
      
      rayGradient.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.9)`);
      rayGradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
      
      // Draw ray
      context.beginPath();
      context.moveTo(bulletX, bulletY);
      context.lineTo(
        bulletX + Math.cos(angle) * rayLength,
        bulletY + Math.sin(angle) * rayLength
      );
      context.strokeStyle = rayGradient;
      context.lineWidth = 1;
      context.stroke();
    }
    
    // Add tiny sparkles around the star
    const numSparkles = 3;
    for (let i = 0; i < numSparkles; i++) {
      const sparkleAngle = Math.random() * Math.PI * 2;
      const sparkleDistance = starSize * (2 + Math.random() * 2);
      const sparkleX = bulletX + Math.cos(sparkleAngle) * sparkleDistance;
      const sparkleY = bulletY + Math.sin(sparkleAngle) * sparkleDistance;
      const sparkleSize = 0.5 + Math.random() * 0.5; // Tiny sparkles
      
      context.beginPath();
      context.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
      context.fillStyle = `hsla(${hue}, 100%, 90%, ${0.3 + Math.random() * 0.4})`; // Random opacity
      context.fill();
    }
    
    // Add twinkling effect
    if (Math.random() < 0.1) { // 10% chance each frame
      const twinkleSize = starSize * (1 + Math.random());
      context.beginPath();
      context.arc(bulletX, bulletY, twinkleSize, 0, Math.PI * 2);
      context.fillStyle = `hsla(${hue}, 100%, 100%, ${0.5 + Math.random() * 0.5})`;
      context.fill();
    }
    
  } catch (error) {
    console.error('Error rendering bullet:', error);
    
    // Fallback to simple bullet rendering if complex one fails
    try {
      const { x, y } = bullet;
      const bulletX = canvas.width / 2 + x - me.x;
      const bulletY = canvas.height / 2 + y - me.y;
      
      context.beginPath();
      context.arc(bulletX, bulletY, 2, 0, Math.PI * 2);
      context.fillStyle = 'white';
      context.fill();
    } catch (fallbackError) {
      console.error('Even fallback bullet rendering failed:', fallbackError);
    }
  }
}

// Helper function to convert HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
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
  // Instead of switching to menu rendering, continue with the game rendering
  // but using the last known game state
  animationFrameRequestId = requestAnimationFrame(render);
}