import { pokeBattleGames, connectedUsers } from '../gameManager.js';

export function registerPokeBattleHandlers(io, socket) {
  socket.on('pokebattle-join', ({ room }) => {
    if (!room) return;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    if (!pokeBattleGames.has(room)) {
      pokeBattleGames.set(room, {
        room,
        phase: 'draft',
        players: [],
        readyDrafts: {},
        currentTurn: 1,
        turnActions: {},
        logs: [],
        winner: null
      });
    }

    const game = pokeBattleGames.get(room);
    let player = game.players.find(p => p.username === user.username);
    if (player) {
      player.id = socket.id;
    } else {
      if (game.players.length >= 2) {
        socket.emit('pokebattle-error', { message: '이미 2명의 플레이어가 배틀 중입니다.' });
        return;
      }
      player = {
        id: socket.id,
        username: user.username,
        isHost: game.players.length === 0,
        team: null,
        activeIndex: 0
      };
      game.players.push(player);
    }

    io.to(room).emit('pokebattle-update', {
      type: 'sync',
      data: {
        phase: game.phase,
        players: game.players,
        currentTurn: game.currentTurn,
        logs: game.logs,
        winner: game.winner
      }
    });
  });

  socket.on('pokebattle-draft-submit', ({ room, pokemonList }) => {
    const game = pokeBattleGames.get(room);
    if (!game || game.phase !== 'draft') return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    player.team = pokemonList;
    game.readyDrafts[socket.id] = true;

    io.to(room).emit('pokebattle-update', {
      type: 'draft-update',
      data: {
        readyCount: Object.keys(game.readyDrafts).length,
        totalPlayers: game.players.length,
        players: game.players
      }
    });

    if (game.players.length === 2 && Object.keys(game.readyDrafts).length === 2) {
      game.phase = 'battle';
      game.currentTurn = 1;
      game.logs = [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          turn: 1,
          text: `⚔️ 실시간 1v1 포켓몬 3v3 배틀 시작! (${game.players[0].username} vs ${game.players[1].username})`,
          type: 'system'
        }
      ];

      io.to(room).emit('pokebattle-update', {
        type: 'battle-start',
        data: {
          phase: 'battle',
          players: game.players,
          currentTurn: game.currentTurn,
          logs: game.logs
        }
      });
    }
  });

  socket.on('pokebattle-action-submit', ({ room, action }) => {
    const game = pokeBattleGames.get(room);
    if (!game || game.phase !== 'battle') return;

    game.turnActions[socket.id] = action;

    io.to(room).emit('pokebattle-update', {
      type: 'action-waiting',
      data: {
        submittedCount: Object.keys(game.turnActions).length,
        totalPlayers: game.players.length
      }
    });

    if (Object.keys(game.turnActions).length === 2) {
      // Both players submitted turn actions -> Resolve Turn
      resolveTurn(io, game);
    }
  });

  socket.on('pokebattle-restart', ({ room }) => {
    const game = pokeBattleGames.get(room);
    if (!game) return;

    game.phase = 'draft';
    game.readyDrafts = {};
    game.currentTurn = 1;
    game.turnActions = {};
    game.logs = [];
    game.winner = null;
    game.players.forEach(p => {
      p.team = null;
      p.activeIndex = 0;
    });

    io.to(room).emit('pokebattle-update', {
      type: 'restart',
      data: {
        phase: 'draft',
        players: game.players
      }
    });
  });
}

function resolveTurn(io, game) {
  const p1 = game.players[0];
  const p2 = game.players[1];

  const a1 = game.turnActions[p1.id];
  const a2 = game.turnActions[p2.id];

  // Clear turn actions for next turn
  game.turnActions = {};

  io.to(game.room).emit('pokebattle-update', {
    type: 'turn-resolved',
    data: {
      p1Action: { playerId: p1.id, username: p1.username, action: a1 },
      p2Action: { playerId: p2.id, username: p2.username, action: a2 },
      turn: game.currentTurn
    }
  });

  game.currentTurn += 1;
}
