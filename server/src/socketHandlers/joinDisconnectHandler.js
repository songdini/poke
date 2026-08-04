import { connectedUsers, sessions, mafiaGames, liarGames, telestrationsGames, checkMafiaGameEnd, roomMessages } from '../gameManager.js';
import { sanitizeString } from '../utils/sanitize.js';

export function registerJoinDisconnectHandlers(io, socket) {
  // 사용자 입장 및 세션 재접속 복구
  socket.on('join', (userData) => {
    if (!userData || typeof userData !== 'object') return;

    const rawUsername = userData.username;
    const rawRoom = userData.room;
    const { gameType, sessionToken } = userData;

    // 서버 측 입력값 검증 (최대 20자 제한 및 XSS 이스케이프)
    const username = sanitizeString(rawUsername, 20);
    const room = sanitizeString(rawRoom, 20);

    if (!username || username.length < 2 || !room || room.length < 2) {
      return socket.emit('join-error', { message: '유효한 이름과 방 이름을 2자 이상 입력해주세요.' });
    }

    const sessionKey = sessionToken ? `${sessionToken}_${gameType || 'chat'}` : null;

    // sessionToken이 존재하고 기존 세션이 있다면 세션 복구 처리
    if (sessionKey && sessions.has(sessionKey)) {
      const existingSession = sessions.get(sessionKey);

      // 같은 방/게임 세션 복구
      if (existingSession.room === room && existingSession.gameType === gameType) {
        // 기존 30초 유예 타임아웃 해제
        if (existingSession.disconnectTimeout) {
          clearTimeout(existingSession.disconnectTimeout);
          existingSession.disconnectTimeout = null;
        }

        const oldSocketId = existingSession.socketId;
        existingSession.socketId = socket.id;
        existingSession.isConnected = true;

        // connectedUsers 갱신
        if (oldSocketId) {
          connectedUsers.delete(oldSocketId);
        }
        connectedUsers.set(socket.id, existingSession);
        socket.join(room);

        // 게임 내 플레이어 socket ID 갱신 및 상태 동기화
        if (gameType === 'telestrations') {
          const game = telestrationsGames.get(room);
          if (game) {
            const player = game.players.find(p => p.id === oldSocketId || p.username === username);
            if (player) player.id = socket.id;
            if (game.hostId === oldSocketId) game.hostId = socket.id;

            io.to(room).emit('telestrations-update', {
              players: game.players,
              hostId: game.hostId,
              phase: game.phase,
            });
          }
        } else if (gameType === 'baseball') {
          const game = baseballGames.get(room);
          if (game) {
            const player = game.players.find(p => p.id === oldSocketId || p.username === username);
            if (player) player.id = socket.id;
            if (game.hostId === oldSocketId) game.hostId = socket.id;

            io.to(room).emit('baseball-update', {
              players: game.players,
              hostId: game.hostId,
              phase: game.phase,
              mode: game.mode || 'single',
              history: game.history || [],
            });
          }
        } else if (gameType === 'mafia') {
          const game = mafiaGames.get(room);
          if (game) {
            const player = game.players.find(p => p.id === oldSocketId || p.username === username);
            if (player) player.id = socket.id;
            if (game.hostId === oldSocketId) game.hostId = socket.id;

            socket.emit('mafia-update', {
              type: 'reconnect-sync',
              data: { players: game.players, phase: game.phase, gameStarted: game.gameStarted, timeLeft: game.timeLeft, voteUsed: game.voteUsed }
            });
          }
        } else if (gameType === 'liar') {
          const game = liarGames.get(room);
          if (game) {
            const player = game.players.find(p => p.id === oldSocketId || p.username === username);
            if (player) player.id = socket.id;
            if (game.host === oldSocketId) game.host = socket.id;

            socket.emit('liar-update', {
              type: 'reconnect-sync',
              data: {
                phase: game.phase,
                players: game.players,
                host: game.host,
                myWord: player ? player.word : null,
                isLiar: player ? player.isLiar : false
              }
            });
          }
        } else {
          const roomUsers = Array.from(connectedUsers.values())
            .filter(u => u.room === room)
            .map(u => u.username);
          io.to(room).emit('userList', roomUsers);
        }

        console.log(`[Session Reconnected] ${username} (Token: ${sessionKey}, NewSocket: ${socket.id})`);
        return;
      }
    }

    // 신규 입장 처리
    socket.join(room);
    const sessionObj = {
      sessionToken: sessionToken || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      sessionKey: sessionKey || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${gameType || 'chat'}`,
      socketId: socket.id,
      username,
      room,
      gameType,
      isConnected: true,
      disconnectTimeout: null
    };

    if (sessionKey) {
      sessions.set(sessionKey, sessionObj);
    }
    connectedUsers.set(socket.id, sessionObj);

    if (gameType === 'telestrations') {
      if (!telestrationsGames.has(room)) {
        telestrationsGames.set(room, {
          players: [],
          hostId: null,
          phase: 'waiting',
          mode: 'standard',
          gameBooks: [],
          turnSubmissions: new Map(),
          currentRound: 0,
        });
      }
      const game = telestrationsGames.get(room);
      const existingPlayer = game.players.find(p => p.username === username);
      if (existingPlayer) {
        existingPlayer.id = socket.id;
      } else {
        game.players.push({ id: socket.id, username });
      }

      if (!game.hostId) game.hostId = socket.id;

      io.to(room).emit('telestrations-update', {
        players: game.players,
        hostId: game.hostId,
        phase: game.phase,
        mode: game.mode || 'standard',
      });
    } else if (gameType === 'baseball') {
      if (!baseballGames.has(room)) {
        baseballGames.set(room, {
          players: [],
          hostId: socket.id,
          mode: 'single',
          phase: 'waiting',
          history: [],
          secretNumbers: {},
          currentTurnIndex: 0,
          winner: null,
        });
      }

      const game = baseballGames.get(room);
      const existingPlayer = game.players.find(p => p.username === username);
      if (existingPlayer) {
        existingPlayer.id = socket.id;
      } else {
        game.players.push({ id: socket.id, username });
      }

      if (!game.hostId) game.hostId = socket.id;

      io.to(room).emit('baseball-update', {
        players: game.players,
        hostId: game.hostId,
        phase: game.phase,
        mode: game.mode || 'single',
        history: game.history || [],
      });
    } else if (gameType === 'mafia') {
      if (!mafiaGames.has(room)) {
        mafiaGames.set(room, {
          players: [],
          gameStarted: false,
          phase: 'waiting',
          voteUsed: false,
          hostId: socket.id
        });
      }

      const game = mafiaGames.get(room);
      if (!game.hostId && game.players.length === 0) game.hostId = socket.id;

      const existingPlayer = game.players.find(p => p.username === username);
      if (existingPlayer) {
        existingPlayer.id = socket.id;
      } else {
        game.players.push({
          id: socket.id,
          username,
          role: 'citizen',
          isAlive: true,
          lives: 3,
          isProtected: false,
          jokerAttacked: false
        });
      }

      const joinedPlayer = existingPlayer || game.players[game.players.length - 1];

      io.to(room).emit('mafia-update', {
        type: 'join',
        data: { player: joinedPlayer, players: game.players }
      });

      socket.emit('mafia-update', {
        type: 'reconnect-sync',
        data: { players: game.players, phase: game.phase, gameStarted: game.gameStarted, timeLeft: game.timeLeft, voteUsed: game.voteUsed }
      });
    } else if (gameType === 'liar') {
      if (!liarGames.has(room)) {
        liarGames.set(room, {
          players: [],
          gameStarted: false,
          phase: 'waiting',
          host: null,
          wordProvider: null,
          word: '',
          liarWord: '',
          liar: null,
          timer: 180,
          votes: {},
          timerInterval: null
        });
      }

      const game = liarGames.get(room);
      const existingPlayer = game.players.find(p => p.username === username);
      if (existingPlayer) {
        existingPlayer.id = socket.id;
      } else {
        game.players.push({
          id: socket.id,
          username,
          isHost: game.players.length === 0,
          isLiar: false,
          word: null,
          voted: false
        });
      }
      if (game.players.length === 1) game.host = socket.id;

      io.to(room).emit('liar-update', {
        type: 'join',
        data: { 
          players: game.players,
          phase: game.phase,
          host: game.host,
          wordProvider: game.wordProvider
        }
      });
    } else {
      socket.to(room).emit('userJoined', {
        username,
        message: `${username}님이 입장하셨습니다.`,
        timestamp: new Date().toISOString()
      });

      const roomUsers = Array.from(connectedUsers.values())
        .filter(user => user.room === room)
        .map(user => user.username);

      io.to(room).emit('userList', roomUsers);

      if (roomMessages.has(room)) {
        socket.emit('chatHistory', roomMessages.get(room));
      }
    }
  });

  // 일시적 끊김 감지 ➔ 30초 유예 후 영구 퇴장 처리
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    user.isConnected = false;
    console.log(`[Socket Disconnected] ${user.username} (30s grace period started)`);

    // 마피아 게임 진행 중 플레이어가 끊어지면 승패 조건 즉시 재검토
    if (user.gameType === 'mafia') {
      checkMafiaGameEnd(io, user.room);
    }

    // 30초 유예 타이머 설정 (네트워크 흔들림/모바일 탭 전환 보호)
    user.disconnectTimeout = setTimeout(() => {
      executePermanentDisconnectCleanup(io, socket.id, user);
    }, 30000);
  });
}

function executePermanentDisconnectCleanup(io, socketId, user) {
  if (!user || user.isConnected) return;

  console.log(`[Grace Expired - Permanent Disconnect] ${user.username}`);

  if (user.sessionKey) {
    sessions.delete(user.sessionKey);
  } else if (user.sessionToken) {
    sessions.delete(user.sessionToken);
  }
  connectedUsers.delete(socketId);

  if (user.gameType === 'telestrations') {
    const game = telestrationsGames.get(user.room);
    if (game) {
      const wasHost = game.hostId === socketId;
      game.players = game.players.filter(p => p.id !== socketId && p.username !== user.username);

      if (game.players.length === 0) {
        telestrationsGames.delete(user.room);
      } else {
        if (game.phase !== 'waiting') {
          game.phase = 'waiting';
          game.gameBooks = [];
          game.turnSubmissions.clear();
          game.currentRound = 0;
          io.to(user.room).emit('telestrations-error', { message: '플레이어가 나가서 게임이 종료되었습니다.' });
        }

        if (wasHost && game.players.length > 0) {
          game.hostId = game.players[0].id;
        }

        io.to(user.room).emit('telestrations-update', {
          players: game.players,
          hostId: game.hostId,
          phase: game.phase,
        });
      }
    }
  } else if (user.gameType === 'baseball') {
    const game = baseballGames.get(user.room);
    if (game) {
      const wasHost = game.hostId === socketId;
      game.players = game.players.filter(p => p.id !== socketId && p.username !== user.username);
      if (game.secretNumbers) delete game.secretNumbers[socketId];

      if (game.players.length === 0) {
        baseballGames.delete(user.room);
      } else {
        if (wasHost && game.players.length > 0) {
          game.hostId = game.players[0].id;
        }
        io.to(user.room).emit('baseball-update', {
          players: game.players,
          hostId: game.hostId,
          phase: game.phase,
          mode: game.mode || 'single',
        });
      }
    }
  } else if (user.gameType === 'mafia') {
    const game = mafiaGames.get(user.room);
    if (game) {
      const wasHost = game.hostId === socketId;
      game.players = game.players.filter(p => p.id !== socketId && p.username !== user.username);

      if (game.players.length === 0) {
        mafiaGames.delete(user.room);
      } else {
        if (wasHost && game.players.length > 0) {
          game.hostId = game.players[0].id;
        }
        io.to(user.room).emit('mafia-update', {
          type: 'leave',
          data: { playerId: socketId }
        });
        if (game.gameStarted) {
          checkMafiaGameEnd(io, user.room);
        }
      }
    }
  } else if (user.gameType === 'liar') {
    const game = liarGames.get(user.room);
    if (game) {
      game.players = game.players.filter(p => p.id !== socketId && p.username !== user.username);

      if (game.host === socketId && game.players.length > 0) {
        game.host = game.players[0].id;
        game.players[0].isHost = true;
      }

      io.to(user.room).emit('liar-update', {
        type: 'leave',
        data: { 
          playerId: socketId,
          players: game.players,
          host: game.host
        }
      });

      if (game.players.length === 0) {
        if (game.timerInterval) clearInterval(game.timerInterval);
        liarGames.delete(user.room);
      }
    }
  } else {
    io.to(user.room).emit('userLeft', {
      username: user.username,
      message: `${user.username}님이 퇴장하셨습니다.`,
      timestamp: new Date().toISOString()
    });

    const roomUsers = Array.from(connectedUsers.values())
      .filter(u => u.room === user.room && u.isConnected)
      .map(u => u.username);

    io.to(user.room).emit('userList', roomUsers);
  }
}
