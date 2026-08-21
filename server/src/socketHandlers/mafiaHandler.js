import { mafiaGames, connectedUsers, checkMafiaGameEnd } from '../gameManager.js';
import { sanitizeChatMessage } from '../utils/sanitize.js';
import {
  generateMafiaDayChat,
  generateMafiaVoteTarget,
  generateMafiaNightAction,
  isGeminiConfigured,
  getGeminiModelName
} from '../aiService.js';

export function clearMafiaBotTimers(game) {
  if (game && game.botTimeouts && Array.isArray(game.botTimeouts)) {
    game.botTimeouts.forEach(t => clearTimeout(t));
  }
  if (game) game.botTimeouts = [];
}

export function registerMafiaHandlers(io, socket) {
  // 🤖 AI 봇 추가 이벤트
  socket.on('mafia-add-bot', ({ room }) => {
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
    if (!room || !rawMessage) return;

    const game = mafiaGames.get(room);
    if (!game) return;

    if (game.gameStarted && game.phase !== 'game-over') {
      const player = game.players.find(p => p.id === socket.id || p.username === rawMessage.player);
      if (player && !player.isAlive) {
        return socket.emit('mafia-update', {
          type: 'message',
          data: { id: Date.now().toString(), type: 'system', content: '💀 사망한 플레이어는 게임 진행 중 대화에 참여할 수 없습니다 (관전 전용).', timestamp: new Date() }
        });
      }
    }

    const sanitizedContent = typeof rawMessage.content === 'string'
      ? sanitizeChatMessage(rawMessage.content, 500)
      : '';
    if (!sanitizedContent) return;

    const safeMessage = {
      ...rawMessage,
      content: sanitizedContent
    };

    // 📝 AI 봇 컨텍스트용 채팅 히스토리 기록
    if (!game.chatHistory) game.chatHistory = [];
    game.chatHistory.push({
      player: safeMessage.player || '익명',
      content: safeMessage.content,
      timestamp: Date.now()
    });
    if (game.chatHistory.length > 40) game.chatHistory.shift();

    io.to(room).emit('mafia-update', {
      type: 'message',
      data: safeMessage
    });
  });

  socket.on('mafia-set-mafia-count', ({ room, count }) => {
    const game = mafiaGames.get(room);
    if (!game || game.hostId !== socket.id || game.gameStarted) return;
    const mafiaCount = Math.max(1, Math.min(2, count));
    game.requestedMafiaCount = mafiaCount;
    io.to(room).emit('mafia-update', {
      type: 'reconnect-sync',
      data: {
        players: game.players,
        phase: 'waiting',
        gameStarted: false,
        mafiaCount: game.requestedMafiaCount
      }
    });
  });

  socket.on('mafia-game-start', ({ room }) => {
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

    clearMafiaBotTimers(game);

    const shuffled = [...game.players].sort(() => Math.random() - 0.5);
    const playerCount = shuffled.length;
    const targetMafiaCount = playerCount >= 6 ? (game.requestedMafiaCount || 1) : 1;

    let assignedMafia = 0;
    let idx = 0;

    // 1. 마피아 할당 (6인 이상 설정값 반영)
    while (assignedMafia < targetMafiaCount && idx < playerCount) {
      shuffled[idx++].role = 'mafia';
      assignedMafia++;
    }

    // 2. 5인 이상: 경찰, 의사 할당
    if (playerCount >= 5) {
      if (idx < playerCount) shuffled[idx++].role = 'police';
      if (idx < playerCount) shuffled[idx++].role = 'doctor';
    } else if (playerCount === 4) {
      if (idx < playerCount) shuffled[idx++].role = 'police';
    }

    // 3. 남은 플레이어: 시민 할당
    while (idx < playerCount) {
      shuffled[idx++].role = 'citizen';
    }

    shuffled.forEach((player) => {
      player.isAlive = true;
      player.lives = 3;
      player.isProtected = false;
    });

    game.gameStarted = true;
    game.phase = 'day';
    game.timeLeft = 90;
    game.voteUsed = false;
    game.votes = [];
    game.doctorTargetId = null;
    game.chatHistory = [];
    game.botKnowledge = {}; // 각 AI 봇의 비밀 기억(경찰 조사 결과 등)

    const aiStatusMsg = isGeminiConfigured()
      ? `🧠 [AI 시스템] Google Gemini LLM (${getGeminiModelName()}) 지능형 봇 엔진이 가동되었습니다.`
      : `🤖 [AI 시스템] 기본 템플릿 모드로 봇이 동작합니다 (GEMINI_API_KEY 설정 시 실시간 추리 가능).`;

    io.to(room).emit('mafia-update', {
      type: 'game-start',
      data: { players: game.players, phase: 'day', timeLeft: 90 }
    });

    io.to(room).emit('mafia-update', {
      type: 'message',
      data: { id: Date.now().toString(), type: 'system', content: aiStatusMsg, timestamp: new Date() }
    });

    startMafiaServerTimer(io, room);
    triggerAiDayChat(io, room);
  });

  socket.on('mafia-vote-start', ({ room }) => {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'day' || game.voteUsed) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player || !player.isAlive) return;

    startVotingPhase(io, room);
  });

  socket.on('mafia-vote', ({ room, targetId }) => {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || (game.phase !== 'day' && game.phase !== 'voting')) return;

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
      tallyVotesAndTransitionToNight(io, room);
    }
  });

  // 🗡️ 마피아 야간 공격
  socket.on('mafia-attack', ({ room, targetId }) => {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'night') return;

    const attacker = game.players.find(p => p.id === socket.id);
    if (!attacker || !attacker.isAlive || attacker.role !== 'mafia') return;

    const targetPlayer = game.players.find(p => p.id === targetId && p.isAlive);
    if (!targetPlayer) return;

    executeMafiaAttack(io, room, targetId, targetPlayer);
  });

  // 🩺 의사 야간 치료
  socket.on('mafia-doctor-heal', ({ room, targetId }) => {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'night') return;

    const doctor = game.players.find(p => p.id === socket.id);
    if (!doctor || !doctor.isAlive || doctor.role !== 'doctor') return;

    game.doctorTargetId = targetId;

    const target = game.players.find(p => p.id === targetId);
    if (target) {
      socket.emit('mafia-update', {
        type: 'message',
        data: { id: Date.now().toString(), type: 'system', content: `🩺 [의사 치료] ${target.username}님을 오늘 밤 보호 대상으로 지정했습니다.`, timestamp: new Date() }
      });
    }
  });

  // 🔍 경찰 야간 조사
  socket.on('mafia-police-investigate', ({ room, targetId }) => {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'night') return;

    const police = game.players.find(p => p.id === socket.id);
    if (!police || !police.isAlive || police.role !== 'police') return;

    const target = game.players.find(p => p.id === targetId);
    if (!target) return;

    const isMafia = target.role === 'mafia';
    const resultMessage = isMafia
      ? `🔍 [경찰 기밀 조사] ${target.username}님은 🕵️ 마피아입니다!`
      : `🔍 [경찰 기밀 조사] ${target.username}님은 마피아가 아닙니다 (시민/의사/조커).`;

    socket.emit('mafia-update', {
      type: 'message',
      data: { id: Date.now().toString(), type: 'system', content: resultMessage, timestamp: new Date() }
    });
  });

  // 🔄 게임 종료 후 대기실 다시 시작
  socket.on('mafia-restart', ({ room }) => {
    const game = mafiaGames.get(room);
    if (!game) return;

    if (game.timerInterval) {
      clearInterval(game.timerInterval);
      game.timerInterval = null;
    }
    clearMafiaBotTimers(game);

    game.gameStarted = false;
    game.phase = 'waiting';
    game.voteUsed = false;
    game.votes = [];
    game.nightAttackExecuted = false;
    game.doctorTargetId = null;
    game.chatHistory = [];
    game.botKnowledge = {};

    game.players.forEach(p => {
      p.isAlive = true;
      p.lives = 3;
      p.isProtected = false;
      p.jokerAttacked = false;
      p.role = null;
    });

    io.to(room).emit('mafia-update', {
      type: 'reconnect-sync',
      data: { players: game.players, phase: 'waiting', gameStarted: false }
    });

    io.to(room).emit('mafia-update', {
      type: 'message',
      data: { id: Date.now().toString(), type: 'system', content: '게임이 리셋되었습니다! 대기실에서 다시 시작할 수 있습니다.', timestamp: new Date() }
    });
  });

  // 🚪 마피아 게임 방 나가기 이벤트
  socket.on('mafia-leave', ({ room }) => {
    const game = mafiaGames.get(room);
    if (game) {
      const wasHost = game.hostId === socket.id;
      game.players = game.players.filter(p => p.id !== socket.id);

      const humanPlayers = game.players.filter(p => !p.isBot);
      if (humanPlayers.length === 0) {
        if (game.timerInterval) clearInterval(game.timerInterval);
        clearMafiaBotTimers(game);
        mafiaGames.delete(room);
      } else {
        if (wasHost && game.players.length > 0) {
          game.hostId = game.players[0].id;
        }
        io.to(room).emit('mafia-update', {
          type: 'leave',
          data: { playerId: socket.id }
        });
        if (game.gameStarted) {
          checkMafiaGameEnd(io, room);
        }
      }
    }

    socket.leave(room);
  });

  // ⏱️ 서버 측 동기화 타이머 구동
  function startMafiaServerTimer(io, room) {
    const game = mafiaGames.get(room);
    if (!game) return;

    if (game.timerInterval) {
      clearInterval(game.timerInterval);
    }

    game.timerInterval = setInterval(() => {
      const current = mafiaGames.get(room);
      if (!current || !current.gameStarted || current.phase === 'game-over') {
        clearInterval(game.timerInterval);
        return;
      }

      current.timeLeft--;

      io.to(room).emit('mafia-update', {
        type: 'timer-tick',
        data: { timeLeft: current.timeLeft }
      });

      if (current.timeLeft <= 0) {
        if (current.phase === 'day') {
          startVotingPhase(io, room);
        } else if (current.phase === 'voting') {
          tallyVotesAndTransitionToNight(io, room);
        } else if (current.phase === 'night') {
          if (!current.nightAttackExecuted) {
            const aliveTargets = current.players.filter(p => p.isAlive && p.role !== 'mafia');
            if (aliveTargets.length > 0) {
              const randomTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
              executeMafiaAttack(io, room, randomTarget.id, randomTarget);
            } else {
              transitionToDay(io, room);
            }
          }
        }
      }
    }, 1000);
  }

  // 🗳️ 지목 투표 단계 시작
  function startVotingPhase(io, room) {
    const game = mafiaGames.get(room);
    if (!game || game.phase === 'voting' || game.phase === 'game-over') return;

    clearMafiaBotTimers(game);

    game.phase = 'voting';
    game.timeLeft = 20;
    game.votes = [];

    game.players.filter(p => p.isAlive && !p.isBot).forEach(p => {
      io.to(p.id).emit('mafia-vote-popup');
    });

    io.to(room).emit('mafia-update', {
      type: 'phase-change',
      data: {
        phase: 'voting',
        timeLeft: 20,
        message: '1분 30초의 낮 토의가 종료되었습니다. 20초간 지목 투표를 진행합니다.'
      }
    });

    handleAiBotVotes(io, room);
  }

  // 📊 투표 결과 집계 후 밤으로 전환
  function tallyVotesAndTransitionToNight(io, room) {
    const game = mafiaGames.get(room);
    if (!game || game.phase === 'game-over') return;

    clearMafiaBotTimers(game);

    if (!game.votes) game.votes = [];

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

    if (maxIds.length === 1 && max >= 1) {
      const votedTarget = game.players.find(p => p.id === maxIds[0]);
      if (votedTarget) {
        votedTarget.lives = Math.max(0, votedTarget.lives - 1);
        votedTarget.isAlive = votedTarget.lives > 0;

        io.to(room).emit('mafia-update', {
          type: 'vote',
          data: {
            targetId: votedTarget.id,
            player: votedTarget,
            message: `${votedTarget.username}이(가) 투표를 받아 생명이 1 감소했습니다.`
          }
        });
      }
    } else {
      io.to(room).emit('mafia-update', {
        type: 'vote-skip',
        data: { message: '투표 결과: 동률 또는 표 부족으로 아무도 지목되지 않았습니다.' }
      });
    }

    game.voteUsed = true;
    game.votes = [];

    const isEnded = checkMafiaGameEnd(io, room);
    if (!isEnded) {
      setTimeout(() => {
        transitionToNight(io, room);
      }, 1200);
    }
  }

  // 🌙 밤 단계 전환
  function transitionToNight(io, room) {
    const game = mafiaGames.get(room);
    if (!game || game.phase === 'game-over') return;

    clearMafiaBotTimers(game);

    game.phase = 'night';
    game.timeLeft = 30;
    game.nightAttackExecuted = false;
    game.doctorTargetId = null;

    io.to(room).emit('mafia-update', {
      type: 'phase-change',
      data: {
        phase: 'night',
        timeLeft: 30,
        message: '밤이 되었습니다. 마피아, 의사, 경찰이 각자의 능력을 사용할 시간입니다 (30초).'
      }
    });

    handleAiNightActions(io, room);
  }

  // ☀️ 낮 단계 전환
  function transitionToDay(io, room) {
    const game = mafiaGames.get(room);
    if (!game || game.phase === 'game-over') return;

    clearMafiaBotTimers(game);

    game.phase = 'day';
    game.timeLeft = 90;
    game.voteUsed = false;
    game.doctorTargetId = null;

    io.to(room).emit('mafia-update', {
      type: 'phase-change',
      data: {
        phase: 'day',
        timeLeft: 90,
        message: '밤이 끝나고 낮이 되었습니다! 모두 대화하고 투표하세요.'
      }
    });

    triggerAiDayChat(io, room);
  }

  // 🔪 마피아 공격 실행
  function executeMafiaAttack(io, room, targetId, targetPlayer) {
    const game = mafiaGames.get(room);
    if (!game || game.nightAttackExecuted) return;

    game.nightAttackExecuted = true;

    // 🩺 의사의 치료 대상인지 체크!
    if (game.doctorTargetId && game.doctorTargetId === targetId) {
      io.to(room).emit('mafia-update', {
        type: 'attack',
        data: {
          targetId: null,
          player: null,
          message: `🩺 [의사 치료 성공] 의사의 신속한 치료 덕분에 ${targetPlayer.username}님이 마피아의 야간 공격에서 극적으로 생존했습니다!`
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
          message: `${targetPlayer.username}이(가) 마피아의 야간 공격을 받았습니다.`
        }
      });
    }

    game.doctorTargetId = null;

    const isEnded = checkMafiaGameEnd(io, room);
    if (!isEnded) {
      setTimeout(() => {
        transitionToDay(io, room);
      }, 1500);
    }
  }

  // 🤖 AI 봇 야간 자동 액션 (마피아, 의사, 경찰)
  function handleAiNightActions(io, room) {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'night') return;

    // 1. AI 의사 치료
    const aiDoctor = game.players.find(p => p.role === 'doctor' && p.isAlive && p.isBot);
    if (aiDoctor) {
      const t = setTimeout(async () => {
        const current = mafiaGames.get(room);
        if (!current || current.phase !== 'night') return;
        const alivePlayers = current.players.filter(p => p.isAlive);
        if (alivePlayers.length === 0) return;

        let healTargetId = null;
        if (isGeminiConfigured()) {
          healTargetId = await generateMafiaNightAction({
            bot: aiDoctor,
            role: 'doctor',
            alivePlayers,
            knownInfo: current.botKnowledge?.[aiDoctor.id] || {}
          });
        }
        if (!healTargetId) {
          healTargetId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)]?.id;
        }

        current.doctorTargetId = healTargetId;
      }, 2000 + Math.random() * 1500);

      if (!game.botTimeouts) game.botTimeouts = [];
      game.botTimeouts.push(t);
    }

    // 2. AI 경찰 조사
    const aiPolice = game.players.find(p => p.role === 'police' && p.isAlive && p.isBot);
    if (aiPolice) {
      const t = setTimeout(async () => {
        const current = mafiaGames.get(room);
        if (!current || current.phase !== 'night') return;
        const aliveCandidates = current.players.filter(p => p.isAlive && p.id !== aiPolice.id);
        if (aliveCandidates.length === 0) return;

        let investigateTargetId = null;
        if (isGeminiConfigured()) {
          investigateTargetId = await generateMafiaNightAction({
            bot: aiPolice,
            role: 'police',
            alivePlayers: aliveCandidates,
            knownInfo: current.botKnowledge?.[aiPolice.id] || {}
          });
        }
        if (!investigateTargetId) {
          investigateTargetId = aliveCandidates[Math.floor(Math.random() * aliveCandidates.length)]?.id;
        }

        const target = current.players.find(p => p.id === investigateTargetId);
        if (target) {
          if (!current.botKnowledge) current.botKnowledge = {};
          if (!current.botKnowledge[aiPolice.id]) current.botKnowledge[aiPolice.id] = { investigations: [] };
          current.botKnowledge[aiPolice.id].investigations.push({
            targetId: target.id,
            targetName: target.username,
            isMafia: target.role === 'mafia'
          });
        }
      }, 2500 + Math.random() * 1500);

      if (!game.botTimeouts) game.botTimeouts = [];
      game.botTimeouts.push(t);
    }

    // 3. AI 마피아 공격
    const aiMafia = game.players.find(p => p.role === 'mafia' && p.isAlive && p.isBot);
    if (aiMafia) {
      const t = setTimeout(async () => {
        const current = mafiaGames.get(room);
        if (!current || current.phase !== 'night' || current.nightAttackExecuted) return;

        const aliveTargets = current.players.filter(p => p.isAlive && p.role !== 'mafia');
        if (aliveTargets.length === 0) return;

        let attackTargetId = null;
        if (isGeminiConfigured()) {
          attackTargetId = await generateMafiaNightAction({
            bot: aiMafia,
            role: 'mafia',
            alivePlayers: aliveTargets,
            knownInfo: current.botKnowledge?.[aiMafia.id] || {}
          });
        }
        if (!attackTargetId) {
          const randomTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
          attackTargetId = randomTarget?.id;
        }

        const targetPlayer = current.players.find(p => p.id === attackTargetId && p.isAlive);
        if (targetPlayer) {
          executeMafiaAttack(io, room, targetPlayer.id, targetPlayer);
        }
      }, 4500 + Math.random() * 2000);

      if (!game.botTimeouts) game.botTimeouts = [];
      game.botTimeouts.push(t);
    }
  }

  // 🤖 AI 봇 낮 대화 멘트 (Gemini LLM 실시간 생성 + 템플릿 폴백)
  function triggerAiDayChat(io, room) {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'day') return;

    const aliveBots = game.players.filter(p => p.isAlive && p.isBot);
    if (aliveBots.length === 0) return;

    const earlyPhrases = [
      `🌅 새로운 낮이 되었습니다. 모두 데이터와 로그를 꼼꼼히 대조해봅시다.`,
      `📂 밤 사이 시스템 보안 로그를 점검했습니다. 이상 탐지 수치를 차근차근 확인해볼까요?`,
      `☕ 아메리카노 한 잔 마시면서 조용히 서류 분위기를 파악해보는 중입니다.`,
      `📊 시작부터 특정 인물을 무작정 몰아가는 건 마피아의 전형적인 교란 작전일 수 있습니다.`
    ];

    const midPhrases = (targetName) => [
      `🔍 이상 패턴 감지! ${targetName}님이 너무 조용하시거나, 반대로 시선을 맞추려 하고 있습니다.`,
      `📈 제 알고리즘 예측 수치상 ${targetName}님이 마피아일 확률이 78.4%로 계산되었습니다.`,
      `📑 VLOOKUP 함수로 검색해본 결과, ${targetName}님의 열 수치가 정상 범위를 벗어났습니다.`,
      `🤖 솔직히 말씀드리면 ${targetName}님의 언행에 결함(Bug)이 존재하는 것 같습니다.`,
      `💡 ${targetName}님, 침묵만 유지하지 마시고 명확하게 해명해 주시기 바랍니다.`,
      `🛡️ 저는 회사의 명을 받아 파견된 순수한 데이터 검증 봇입니다! 저를 의심하지 마세요.`,
      `⚙️ 저를 투표로 탈락시키시면 시민 진영의 분석력이 크게 손실됩니다. 신중히 판단해주세요!`
    ];

    const latePhrases = (targetName) => [
      `⏰ 곧 투표 시간이 다가옵니다. 저는 ${targetName}님을 유력한 마피아 후보로 생각하고 있습니다.`,
      `🧐 데이터를 종합한 최종 결론입니다. 이번 표결에서는 ${targetName}님을 유심히 보아야 합니다.`,
      `🚨 무고한 시민이 억울하게 희생되지 않도록 데이터에 기반해서 투표해주세요.`
    ];

    aliveBots.forEach((bot, botIdx) => {
      // 1. 초반 멘트 (봇 간 6초 간격 분산)
      const t1 = 5000 + (botIdx * 6000) + Math.random() * 3000;
      const timeout1 = setTimeout(async () => {
        const current = mafiaGames.get(room);
        if (!current || current.phase !== 'day' || !bot.isAlive) return;

        let content = null;
        if (isGeminiConfigured()) {
          content = await generateMafiaDayChat({
            bot,
            role: bot.role,
            alivePlayers: current.players.filter(p => p.isAlive),
            chatHistory: current.chatHistory || [],
            knownInfo: current.botKnowledge?.[bot.id] || {}
          });
        }

        if (!content) {
          content = earlyPhrases[Math.floor(Math.random() * earlyPhrases.length)];
        }

        sendAiMessage(io, room, bot.username, content);
      }, t1);

      // 2. 중반 멘트 (32초 이후 봇 간 7초 간격 분산)
      const t2 = 32000 + (botIdx * 7000) + Math.random() * 4000;
      const timeout2 = setTimeout(async () => {
        const current = mafiaGames.get(room);
        if (!current || current.phase !== 'day' || !bot.isAlive) return;

        let content = null;
        if (isGeminiConfigured()) {
          content = await generateMafiaDayChat({
            bot,
            role: bot.role,
            alivePlayers: current.players.filter(p => p.isAlive),
            chatHistory: current.chatHistory || [],
            knownInfo: current.botKnowledge?.[bot.id] || {}
          });
        }

        if (!content) {
          const aliveOthers = current.players.filter(p => p.isAlive && p.id !== bot.id);
          const target = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
          const phrases = target ? midPhrases(target.username) : earlyPhrases;
          content = phrases[Math.floor(Math.random() * phrases.length)];
        }

        sendAiMessage(io, room, bot.username, content);
      }, t2);

      // 3. 종반 멘트 (62초 이후 봇 간 6초 간격 분산)
      const t3 = 62000 + (botIdx * 6000) + Math.random() * 4000;
      const timeout3 = setTimeout(async () => {
        const current = mafiaGames.get(room);
        if (!current || current.phase !== 'day' || !bot.isAlive) return;

        let content = null;
        if (isGeminiConfigured()) {
          content = await generateMafiaDayChat({
            bot,
            role: bot.role,
            alivePlayers: current.players.filter(p => p.isAlive),
            chatHistory: current.chatHistory || [],
            knownInfo: current.botKnowledge?.[bot.id] || {}
          });
        }

        if (!content) {
          const aliveOthers = current.players.filter(p => p.isAlive && p.id !== bot.id);
          const target = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
          const phrases = target ? latePhrases(target.username) : earlyPhrases;
          content = phrases[Math.floor(Math.random() * phrases.length)];
        }

        sendAiMessage(io, room, bot.username, content);
      }, t3);

      if (!game.botTimeouts) game.botTimeouts = [];
      game.botTimeouts.push(timeout1, timeout2, timeout3);
    });
  }

  function sendAiMessage(io, room, botName, content) {
    const game = mafiaGames.get(room);
    if (!game) return;

    if (!game.chatHistory) game.chatHistory = [];
    game.chatHistory.push({
      player: botName,
      content,
      timestamp: Date.now()
    });
    if (game.chatHistory.length > 40) game.chatHistory.shift();

    io.to(room).emit('mafia-update', {
      type: 'message',
      data: {
        id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6),
        type: 'player',
        content,
        timestamp: new Date(),
        player: botName
      }
    });
  }

  // 🤖 AI 봇 자동 투표 처리 함수 (Gemini LLM 추리 기반)
  function handleAiBotVotes(io, room) {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'voting') return;

    const aliveBots = game.players.filter(p => p.isAlive && p.isBot);
    if (aliveBots.length === 0) return;

    aliveBots.forEach((bot, index) => {
      const voteDelay = 2000 + (index * 1500) + Math.random() * 2000;
      const timeout = setTimeout(async () => {
        const current = mafiaGames.get(room);
        if (!current || !current.gameStarted || current.phase !== 'voting' || !bot.isAlive) return;
        if (!current.votes) current.votes = [];

        if (current.votes.some(v => v.voterId === bot.id)) return;

        const aliveTargets = current.players.filter(p => p.isAlive && p.id !== bot.id);
        if (aliveTargets.length === 0) return;

        let targetId = null;
        if (isGeminiConfigured()) {
          targetId = await generateMafiaVoteTarget({
            bot,
            role: bot.role,
            alivePlayers: current.players.filter(p => p.isAlive),
            chatHistory: current.chatHistory || [],
            knownInfo: current.botKnowledge?.[bot.id] || {}
          });
        }

        if (!targetId || !aliveTargets.some(t => t.id === targetId)) {
          const randomTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
          targetId = randomTarget.id;
        }

        current.votes.push({ targetId, voterId: bot.id });

        const aliveCount = current.players.filter(p => p.isAlive).length;
        if (current.votes.length >= aliveCount) {
          tallyVotesAndTransitionToNight(io, room);
        }
      }, voteDelay);

      if (!game.botTimeouts) game.botTimeouts = [];
      game.botTimeouts.push(timeout);
    });
  }
}
