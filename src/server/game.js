const Constants = require('../shared/constants');
const Player = require('./player');
const applyCollisions = require('./collisions');

class Game {
  constructor() {
    this.sockets = {};
    this.players = {};
    this.bullets = [];
    this.bots = {};
    this.lastUpdateTime = Date.now();
    this.shouldSendUpdate = false;
    setInterval(this.update.bind(this), 1000 / 60);

    this.addBot("Bot_1");
    this.addBot("Bot_2");
  }

  addPlayer(socket, username) {
    this.sockets[socket.id] = socket;
    const x = Constants.MAP_SIZE * (0.25 + Math.random() * 0.5);
    const y = Constants.MAP_SIZE * (0.25 + Math.random() * 0.5);
    this.players[socket.id] = new Player(socket.id, username, x, y);
  }

  addBot(botName) {
    const botID = `bot_${Object.keys(this.bots).length}`;
    const x = Constants.MAP_SIZE * Math.random();
    const y = Constants.MAP_SIZE * Math.random();
    const bot = new Player(botID, botName, x, y);
    this.bots[botID] = bot;
  }

  removePlayer(socket) {
    delete this.sockets[socket.id];
    delete this.players[socket.id];
  }

  handleInput(socket, dir) {
    if (this.players[socket.id]) {
      this.players[socket.id].setDirection(dir);
    }
  }

  update() {
    const now = Date.now();
    const dt = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    this.bullets = this.bullets.filter(bullet => !bullet.update(dt));

    Object.values(this.players).forEach(player => {
      const newBullet = player.update(dt);
      if (newBullet) this.bullets.push(newBullet);
    });

    Object.values(this.bots).forEach(bot => {
      if (Math.random() < 0.02) {
        bot.setDirection(Math.random() * Math.PI * 2);
      }
      const newBullet = bot.update(dt);
      if (newBullet) {
        this.bullets.push(newBullet);
      } else if (Math.random() < 0.03) {
        bot.fireCooldown = 0;
      }
      if (bot.score > 1500) {
        bot.score = 0;
      }
    });

    const destroyedBullets = applyCollisions([...Object.values(this.players), ...Object.values(this.bots)], this.bullets);
    destroyedBullets.forEach(b => {
      if (this.players[b.parentID]) this.players[b.parentID].onDealtDamage();
      else if (this.bots[b.parentID]) this.bots[b.parentID].onDealtDamage();
    });

    Object.entries(this.players).forEach(([playerID, player]) => {
      if (player.hp <= 0) {
        this.sockets[playerID].emit(Constants.MSG_TYPES.GAME_OVER);
        this.removePlayer(this.sockets[playerID]);
      }
    });

    Object.entries(this.bots).forEach(([botID, bot]) => {
      if (bot.hp <= 0) {
        bot.hp = Constants.PLAYER_MAX_HP;
        bot.x = Constants.MAP_SIZE * Math.random();
        bot.y = Constants.MAP_SIZE * Math.random();
        bot.score = 0; // Сбрасываем очки при смерти бота
      }
    });

    if (this.shouldSendUpdate) {
      const leaderboard = this.getLeaderboard();
      Object.entries(this.sockets).forEach(([playerID, socket]) => {
        const player = this.players[playerID];
        if (player) { // Добавлена проверка на существование игрока
          const update = this.createUpdate(player, leaderboard);
          socket.emit(Constants.MSG_TYPES.GAME_UPDATE, update);
        }
      });
      this.shouldSendUpdate = false;
    } else {
      this.shouldSendUpdate = true;
    }
  }

  getLeaderboard() {
    return [...Object.values(this.players), ...Object.values(this.bots)]
      .sort((p1, p2) => p2.score - p1.score)
      .slice(0, 5)
      .map(p => ({ username: p.username || 'Unnamed', score: Math.round(p.score) }));
  }

  createUpdate(player, leaderboard) {
    const nearbyPlayers = [...Object.values(this.players), ...Object.values(this.bots)]
      .filter(p => p !== player && p.distanceTo(player) <= Constants.MAP_SIZE / 2);
    
    const nearbyBullets = this.bullets.filter(b => b.distanceTo(player) <= Constants.MAP_SIZE / 2);

    return {
      t: Date.now(),
      me: player.serializeForUpdate(),
      others: nearbyPlayers.map(p => p.serializeForUpdate()),
      bullets: nearbyBullets.map(b => b.serializeForUpdate()),
      leaderboard,
      myScore: Math.round(player.score),
    };
  }
}

module.exports = Game;