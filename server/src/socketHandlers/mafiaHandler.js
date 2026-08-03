import { mafiaGames, connectedUsers, checkMafiaGameEnd } from '../gameManager.js';
import { sanitizeChatMessage } from '../utils/sanitize.js';

export function registerMafiaHandlers(io, socket) {
  // 🤖 AI 봇 추가 이벤트
  socket.on('mafia-add-bot', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (!game || game.gameStarted) return;

    if (game.hostId && game.hostId !== socket.id) {
      return socket.emit('mafia-update', {
        type: 'message',
        data: { id: Date.now().toString(), type: 'system', content: '방장만 AI 봇을 추가할 수 있습니다.', timestamp: new Date() }
      });
    }

    if (game.players.length >= 6) {
      return socket.emit('mafia-update', {
        type: 'message',
        data: { id: Date.now().toString(), type: 'system', content: '최대 6명까지만 참여할 수 있습니다.', timestamp: new Date() }
      });
    }

    const botNames = ['AI_Copilot_Bot', 'AI_Analyst_Alpha', 'AI_Data_Bot', 'AI_Inspector_Beta', 'AI_Audit_Copilot'];
    const existingBotCount = game.players.filter(p => p.isBot).length;
    const botName = botNames[existingBotCount % botNames.length] + `_0${existingBotCount + 1}`;

    const botPlayer = {
      id: `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      username: botName,
      role: 'citizen',
      isAlive: true,
      lives: 3,
      isProtected: false,
      isBot: true
    };

    game.players.push(botPlayer);

    io.to(room).emit('mafia-update', {
      type: 'join',
      data: { player: botPlayer, players: game.players }
    });
  });

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

    // 낮 진입 시 AI 봇 멘트 발송
    triggerAiDayChat(io, room);
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

    // AI 봇 자동 투표 처리
    handleAiBotVotes(io, room);
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

    executeMafiaAttack(io, room, targetId, targetPlayer);
  });

  function executeMafiaAttack(io, room, targetId, targetPlayer) {
    const game = mafiaGames.get(room);
    if (!game) return;

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

      // 낮 진입 시 AI 봇 대화 멘트 발송
      triggerAiDayChat(io, room);
    }, 1000);
  }

  // 🤖 AI 봇 야간 공격 자동화 처리 함수
  function handleAiNightActions(io, room) {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'night') return;

    const aiMafia = game.players.find(p => p.role === 'mafia' && p.isAlive && p.isBot);
    if (!aiMafia) return;

    setTimeout(() => {
      const current = mafiaGames.get(room);
      if (!current || current.phase !== 'night') return;

      const aliveTargets = current.players.filter(p => p.isAlive && p.role !== 'mafia');
      if (aliveTargets.length === 0) return;

      const randomTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
      executeMafiaAttack(io, room, randomTarget.id, randomTarget);
    }, 4000);
  }

  // 🤖 AI 봇 낮 대화 멘트 발송
  function triggerAiDayChat(io, room) {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'day') return;

    const aliveBots = game.players.filter(p => p.isAlive && p.isBot);
    if (aliveBots.length === 0) return;

    aliveBots.forEach((bot, idx) => {
      setTimeout(() => {
        const current = mafiaGames.get(room);
        if (!current || current.phase !== 'day') return;

        const aliveOtherPlayers = current.players.filter(p => p.isAlive && p.id !== bot.id);
        if (aliveOtherPlayers.length === 0) return;

        const target = aliveOtherPlayers[Math.floor(Math.random() * aliveOtherPlayers.length)];
        const aiPhrases = [
          `로그 분석 결과, ${target.username}님의 패턴이 다소 의심스럽습니다.`,
          `저는 무고한 데이터 검증 봇입니다! 꼼꼼히 확인해봅시다.`,
          `밤 사이 공격 로그가 감지되었습니다. 이번 표결에서는 ${target.username}님을 지목해보는 것을 추천합니다.`,
          `시스템 감시 결과 이상 징후가 포착되었습니다.`
        ];
        const phrase = aiPhrases[Math.floor(Math.random() * aiPhrases.length)];

        io.to(room).emit('mafia-update', {
          type: 'message',
          data: {
            id: Date.now().toString() + '_' + bot.id,
            type: 'player',
            content: phrase,
            timestamp: new Date(),
            player: bot.username
          }
        });
      }, (idx + 1) * 3500);
    });
  }

  // 🤖 AI 봇 자동 투표 처리 함수
  function handleAiBotVotes(io, room) {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'day') return;

    const aliveBots = game.players.filter(p => p.isAlive && p.isBot);
    if (aliveBots.length === 0) return;

    aliveBots.forEach(bot => {
      setTimeout(() => {
        const current = mafiaGames.get(room);
        if (!current || !current.gameStarted) return;
        if (!current.votes) current.votes = [];

        if (current.votes.some(v => v.voterId === bot.id)) return;

        const aliveTargets = current.players.filter(p => p.isAlive && p.id !== bot.id);
        if (aliveTargets.length === 0) return;

        const randomTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
        current.votes.push({ targetId: randomTarget.id, voterId: bot.id });

        const aliveCount = current.players.filter(p => p.isAlive).length;
        if (current.votes.length >= aliveCount) {
          const voteCount = {};
          for (const vote of current.votes) {
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
            const votedTarget = current.players.find(p => p.id === maxIds[0]);
            votedTarget.lives = Math.max(0, votedTarget.lives - 1);
            votedTarget.isAlive = votedTarget.lives > 0;
            current.voteUsed = true;

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
            current.voteUsed = true;
            io.to(room).emit('mafia-update', {
              type: 'vote-skip',
              data: { message: '투표 결과: 아무도 지목되지 않았습니다.' }
            });
          }

          current.votes = [];
        }
      }, 2000 + Math.random() * 2000);
    });
  }
}
