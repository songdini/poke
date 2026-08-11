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
        spectators: [],
        readyDrafts: {},
        currentTurn: 1,
        turnActions: {},
        logs: [],
        winner: null
      });
    }

    const game = pokeBattleGames.get(room);
    let player = game.players.find(p => p.username === user.username);
    let spectator = game.spectators.find(s => s.username === user.username);

    let role = 'player';

    if (player) {
      player.id = socket.id;
      role = 'player';
    } else if (spectator) {
      spectator.id = socket.id;
      role = 'spectator';
    } else {
      if (game.players.length < 2 && game.phase === 'draft') {
        player = {
          id: socket.id,
          username: user.username,
          isHost: game.players.length === 0,
          team: null,
          activeIndex: 0
        };
        game.players.push(player);
        role = 'player';
      } else {
        spectator = {
          id: socket.id,
          username: user.username
        };
        game.spectators.push(spectator);
        role = 'spectator';
      }
    }

    // Direct Sync to Socket
    socket.emit('pokebattle-role', { role });

    io.to(room).emit('pokebattle-update', {
      type: 'sync',
      data: {
        phase: game.phase,
        players: game.players,
        spectators: game.spectators,
        spectatorCount: game.spectators.length,
        currentTurn: game.currentTurn,
        logs: game.logs,
        winner: game.winner
      }
    });
  });

  socket.on('pokebattle-draft-submit', ({ room, pokemonList }) => {
    const game = pokeBattleGames.get(room);
    if (!game || game.phase !== 'draft') return;

    let player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    player.team = pokemonList;
    game.readyDrafts[socket.id] = true;

    io.to(room).emit('pokebattle-update', {
      type: 'draft-update',
      data: {
        readyCount: Object.keys(game.readyDrafts).length,
        totalPlayers: game.players.length,
        players: game.players,
        spectatorCount: game.spectators.length
      }
    });

    if (game.players.length >= 2 && Object.keys(game.readyDrafts).length >= 2) {
      game.phase = 'battle';
      game.currentTurn = 1;
      game.logs = [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          turn: 1,
          text: `⚔️ 1v1 실시간 포켓몬 3v3 배틀 시작! (${game.players[0].username} vs ${game.players[1].username})`,
          type: 'system'
        }
      ];

      io.to(room).emit('pokebattle-update', {
        type: 'battle-start',
        data: {
          phase: 'battle',
          players: game.players,
          spectators: game.spectators,
          spectatorCount: game.spectators.length,
          currentTurn: game.currentTurn,
          logs: game.logs
        }
      });
    }
  });

  socket.on('pokebattle-action-submit', ({ room, action }) => {
    const game = pokeBattleGames.get(room);
    if (!game || game.phase !== 'battle') return;

    // Reject spectator actions
    const isPlayer = game.players.some(p => p.id === socket.id);
    if (!isPlayer) return;

    game.turnActions[socket.id] = action;

    io.to(room).emit('pokebattle-update', {
      type: 'action-waiting',
      data: {
        submittedCount: Object.keys(game.turnActions).length,
        totalPlayers: game.players.length,
        spectatorCount: game.spectators.length
      }
    });

    if (Object.keys(game.turnActions).length >= game.players.length) {
      // All 2 players submitted turn actions -> Resolve Turn
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
        players: game.players,
        spectatorCount: game.spectators.length
      }
    });
  });
}

function resolveTurn(io, game) {
  const p1 = game.players[0];
  const p2 = game.players[1];

  if (!p1 || !p2) return;

  const a1 = game.turnActions[p1.id] || { type: 'move', moveIndex: 0 };
  const a2 = game.turnActions[p2.id] || { type: 'move', moveIndex: 0 };

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
