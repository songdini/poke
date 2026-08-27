// 🧱 Backend Tetris Game Socket Handler
import { connectedUsers } from '../gameManager.js';

export const tetrisRooms = new Map();

export function registerTetrisHandlers(io, socket) {
  // 방 참가
  socket.on('tetris-join', ({ room, username, rule = 'normal' }) => {
    if (!room || !username) return;

    socket.join(room);

    let game = tetrisRooms.get(room);
    if (!game) {
      game = {
        room,
        hostId: socket.id,
        rule, // 'normal' | 'item'
        phase: 'waiting', // 'waiting' | 'playing' | 'game-over'
        players: [],
        winner: null,
      };
      tetrisRooms.set(room, game);
    }

    // 기존 플레이어 체크 또는 추가
    const existingIndex = game.players.findIndex(p => p.username === username);
    if (existingIndex >= 0) {
      game.players[existingIndex].id = socket.id;
    } else if (game.players.length < 2) {
      game.players.push({
        id: socket.id,
        username,
        isReady: false,
        isAlive: true,
        score: 0,
        lines: 0,
        level: 1,
      });
    } else {
      // 3인 이상 관전
      socket.emit('tetris-message', { message: '방이 가득 차 관전자 모드로 입장합니다.' });
    }

    // 방장 갱신 (첫 번째 플레이어가 방장)
    if (!game.players.some(p => p.id === game.hostId) && game.players.length > 0) {
      game.hostId = game.players[0].id;
    }

    io.to(room).emit('tetris-update', {
      phase: game.phase,
      players: game.players,
      hostId: game.hostId,
      rule: game.rule,
      winner: game.winner,
      message: `${username}님이 입장하셨습니다.`
    });
  });

  // 룰 변경 (일반 vs 아이템)
  socket.on('tetris-set-rule', ({ room, rule }) => {
    const game = tetrisRooms.get(room);
    if (!game || game.hostId !== socket.id || game.phase === 'playing') return;

    game.rule = rule;
    io.to(room).emit('tetris-update', {
      phase: game.phase,
      players: game.players,
      hostId: game.hostId,
      rule: game.rule,
      winner: game.winner,
      message: `게임 모드가 [${rule === 'item' ? '🎁 아이템전' : '⚔️ 일반전'}]으로 변경되었습니다.`
    });
  });

  // 준비 상태 토글
  socket.on('tetris-ready', ({ room }) => {
    const game = tetrisRooms.get(room);
    if (!game || game.phase === 'playing') return;

    const player = game.players.find(p => p.id === socket.id);
    if (player) {
      player.isReady = !player.isReady;
      io.to(room).emit('tetris-update', {
        phase: game.phase,
        players: game.players,
        hostId: game.hostId,
        rule: game.rule,
        winner: null,
      });
    }
  });

  // 게임 시작 (방장)
  socket.on('tetris-start', ({ room }) => {
    const game = tetrisRooms.get(room);
    if (!game || game.hostId !== socket.id) return;
    if (game.players.length < 2) {
      return socket.emit('tetris-error', { message: '최소 2명의 플레이어가 필요합니다.' });
    }

    game.phase = 'playing';
    game.winner = null;
    game.players.forEach(p => {
      p.isAlive = true;
      p.score = 0;
      p.lines = 0;
      p.level = 1;
    });

    io.to(room).emit('tetris-start', {
      rule: game.rule,
      players: game.players,
      startTime: Date.now(),
    });
  });

  // 내 보드 상태 실시간 상대에게 전달
  socket.on('tetris-board-update', ({ room, board, score, lines, level }) => {
    socket.to(room).emit('tetris-opponent-board', {
      senderId: socket.id,
      board,
      score,
      lines,
      level,
    });
  });

  // 라인 클리어 시 상대에게 공격 전송
  socket.on('tetris-attack', ({ room, lines, combo, username }) => {
    socket.to(room).emit('tetris-opponent-attack', {
      senderId: socket.id,
      senderUsername: username,
      lines,
      combo,
    });
  });

  // 아이템 발동
  socket.on('tetris-item-use', ({ room, item, username, target = 'opponent' }) => {
    const game = tetrisRooms.get(room);
    if (!game || game.phase !== 'playing') return;

    io.to(room).emit('tetris-item-effect', {
      senderId: socket.id,
      senderUsername: username,
      item,
      target,
    });
  });

  // 게임 오버
  socket.on('tetris-gameover', ({ room, username }) => {
    const game = tetrisRooms.get(room);
    if (!game || game.phase !== 'playing') return;

    const deadPlayer = game.players.find(p => p.id === socket.id);
    if (deadPlayer) {
      deadPlayer.isAlive = false;
    }

    const alivePlayers = game.players.filter(p => p.isAlive);
    if (alivePlayers.length <= 1) {
      game.phase = 'game-over';
      game.winner = alivePlayers.length === 1 ? alivePlayers[0].username : null;

      io.to(room).emit('tetris-gameover', {
        winner: game.winner,
        loser: username,
        message: game.winner ? `🏆 [${game.winner}] 님이 승리하셨습니다!` : '무승부입니다!'
      });
    }
  });

  // 재경기 요청
  socket.on('tetris-rematch', ({ room }) => {
    const game = tetrisRooms.get(room);
    if (!game) return;

    game.phase = 'waiting';
    game.winner = null;
    game.players.forEach(p => {
      p.isReady = false;
      p.isAlive = true;
    });

    io.to(room).emit('tetris-update', {
      phase: game.phase,
      players: game.players,
      hostId: game.hostId,
      rule: game.rule,
      winner: null,
      message: '새 경기를 위해 준비해주세요!'
    });
  });

  // 퇴장 처리
  socket.on('tetris-leave', ({ room, username }) => {
    socket.leave(room);
    const game = tetrisRooms.get(room);
    if (!game) return;

    game.players = game.players.filter(p => p.id !== socket.id);
    if (game.players.length === 0) {
      tetrisRooms.delete(room);
      return;
    }

    if (game.hostId === socket.id) {
      game.hostId = game.players[0].id;
    }

    if (game.phase === 'playing' && game.players.length === 1) {
      game.phase = 'game-over';
      game.winner = game.players[0].username;
      io.to(room).emit('tetris-gameover', {
        winner: game.winner,
        message: `상대방이 퇴장하여 [${game.winner}] 님이 부전승을 거두었습니다!`
      });
    }

    io.to(room).emit('tetris-update', {
      phase: game.phase,
      players: game.players,
      hostId: game.hostId,
      rule: game.rule,
      winner: game.winner,
      message: `${username || '플레이어'}님이 퇴장하셨습니다.`
    });
  });

  // 연결 종료 시 처리
  socket.on('disconnect', () => {
    for (const [room, game] of tetrisRooms.entries()) {
      const idx = game.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        const leaving = game.players[idx];
        game.players.splice(idx, 1);

        if (game.players.length === 0) {
          tetrisRooms.delete(room);
          continue;
        }

        if (game.hostId === socket.id) {
          game.hostId = game.players[0].id;
        }

        if (game.phase === 'playing' && game.players.length === 1) {
          game.phase = 'game-over';
          game.winner = game.players[0].username;
          io.to(room).emit('tetris-gameover', {
            winner: game.winner,
            message: `상대방의 연결이 끊어져 [${game.winner}] 님이 승리하셨습니다!`
          });
        }

        io.to(room).emit('tetris-update', {
          phase: game.phase,
          players: game.players,
          hostId: game.hostId,
          rule: game.rule,
          winner: game.winner,
          message: `${leaving.username}님의 연결이 끊어졌습니다.`
        });
      }
    }
  });
}
