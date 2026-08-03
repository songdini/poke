import { mafiaGames, connectedUsers, checkMafiaGameEnd } from '../gameManager.js';
import { sanitizeChatMessage } from '../utils/sanitize.js';

export function registerMafiaHandlers(io, socket) {
  socket.on('mafia-message', (messageData) => {
    if (!messageData || typeof messageData !== 'object') return;
    const { room, message: rawMessage } = messageData;
    const user = connectedUsers.get(socket.id);

    if (user && user.gameType === 'mafia' && user.room === room && rawMessage) {
      const sanitizedContent = typeof rawMessage.content === 'string'
        ? sanitizeChatMessage(rawMessage.content, 500)
        : '';
      if (!sanitizedContent) return;

      const safeMessage = {
        ...rawMessage,
        content: sanitizedContent
      };

      io.to(room).emit('mafia-update', {
        type: 'message',
        data: safeMessage
      });
    }
  });

  socket.on('mafia-game-start', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (!game || game.gameStarted) return;

    if (game.hostId && game.hostId !== socket.id) {
      return socket.emit('mafia-update', {
        type: 'message',
        data: { id: Date.now().toString(), type: 'system', content: '방장만 게임을 시작할 수 있습니다.', timestamp: new Date() }
      });
    }

    if (game.players.length < 3) {
      return socket.emit('mafia-update', {
        type: 'message',
        data: { id: Date.now().toString(), type: 'system', content: '최소 3명 이상이어야 시작할 수 있습니다.', timestamp: new Date() }
      });
    }

    const shuffled = [...game.players].sort(() => Math.random() - 0.5);
    let mafiaAssigned = false, jokerAssigned = false;

    shuffled.forEach((player) => {
      if (!mafiaAssigned) {
        player.role = 'mafia';
        mafiaAssigned = true;
      } else if (!jokerAssigned) {
        player.role = 'joker';
        jokerAssigned = true;
      } else {
        player.role = 'citizen';
      }
      player.isAlive = true;
      player.lives = 3;
      player.isProtected = false;
      player.jokerAttacked = false;
    });

    game.gameStarted = true;
    game.phase = 'day';
    game.voteUsed = false;

    io.to(room).emit('mafia-update', {
      type: 'game-start',
      data: { players: game.players }
    });
  });

  socket.on('mafia-vote-start', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'day' || game.voteUsed) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player || !player.isAlive) return;

    game.votes = [];
    io.to(room).emit('mafia-vote-popup');
  });

  socket.on('mafia-vote', ({ room, targetId }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'day' || game.voteUsed) return;

    const voterId = socket.id;
    const voterPlayer = game.players.find(p => p.id === voterId);
    if (!voterPlayer || !voterPlayer.isAlive) return;

    const targetPlayer = game.players.find(p => p.id === targetId);
    if (!targetPlayer || !targetPlayer.isAlive) return;

    if (!game.votes) game.votes = [];

    const alreadyVoted = game.votes.find(vote => vote.voterId === voterId);
    if (alreadyVoted) return;

    game.votes.push({ targetId, voterId });

    const aliveCount = game.players.filter(p => p.isAlive).length;

    if (game.votes.length >= aliveCount) {
      const voteCount = {};
      for (const vote of game.votes) {
        if (!voteCount[vote.targetId]) voteCount[vote.targetId] = 0;
        voteCount[vote.targetId]++;
      }

      let max = 0, maxIds = [];
      for (const id in voteCount) {
        if (voteCount[id] > max) {
          max = voteCount[id];
          maxIds = [id];
        } else if (voteCount[id] === max) {
          maxIds.push(id);
        }
      }

      if (maxIds.length === 1 && max > 1) {
        const votedTarget = game.players.find(p => p.id === maxIds[0]);
        votedTarget.lives = Math.max(0, votedTarget.lives - 1);
        votedTarget.isAlive = votedTarget.lives > 0;
        game.voteUsed = true;

        io.to(room).emit('mafia-update', {
          type: 'vote',
          data: {
            targetId: votedTarget.id,
            player: votedTarget,
            message: `${votedTarget.username}이(가) 투표받아 생명이 1 감소했습니다.`
          }
        });

        checkMafiaGameEnd(io, room);
      } else {
        game.voteUsed = true;
        io.to(room).emit('mafia-update', {
          type: 'vote-skip',
          data: { message: '투표 결과: 아무도 지목되지 않았습니다.' }
        });
      }

      game.votes = [];
    }
  });

  socket.on('mafia-attack', ({ room, targetId }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'night') return;

    const attacker = game.players.find(p => p.id === socket.id);
    if (!attacker || !attacker.isAlive || attacker.role !== 'mafia') return;

    const targetPlayer = game.players.find(p => p.id === targetId && p.isAlive);
    if (!targetPlayer) return;

    if (targetPlayer.role === 'joker' && !targetPlayer.jokerAttacked) {
      targetPlayer.jokerAttacked = true;
      const mafia = game.players.find(p => p.role === 'mafia' && p.isAlive);
      if (mafia) {
        mafia.lives = Math.max(0, mafia.lives - 1);
        mafia.isAlive = mafia.lives > 0;
      }
      io.to(room).emit('mafia-update', {
        type: 'attack',
        data: {
          targetId: mafia ? mafia.id : null,
          player: mafia,
          message: `조커가 마피아에게 공격당했지만, 오히려 마피아가 피해를 입었습니다!`
        }
      });
    } else {
      targetPlayer.lives = Math.max(0, targetPlayer.lives - 1);
      targetPlayer.isAlive = targetPlayer.lives > 0;
      io.to(room).emit('mafia-update', {
        type: 'attack',
        data: {
          targetId,
          player: targetPlayer,
          message: `${targetPlayer.username}이(가) 마피아의 공격을 받았습니다.`
        }
      });
    }

    game.phase = 'day';
    game.voteUsed = false;

    setTimeout(() => {
      io.to(room).emit('mafia-update', {
        type: 'phase-change',
        data: {
          phase: 'day',
          message: '밤이 끝나고 낮이 되었습니다! 모두 대화하고 투표하세요.'
        }
      });
      checkMafiaGameEnd(io, room);
    }, 1000);
  });
}
