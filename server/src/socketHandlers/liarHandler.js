import { liarGames, connectedUsers } from '../gameManager.js';
import { getLiarGameWords } from '../dictionaryService.js';
import { sanitizeChatMessage } from '../utils/sanitize.js';
import {
  generateLiarTalkMessage,
  generateLiarVoteTarget,
  isGeminiConfigured,
  getGeminiModelName
} from '../aiService.js';

export function clearBotTimers(game) {
  if (game && game.botTimeouts && Array.isArray(game.botTimeouts)) {
    game.botTimeouts.forEach(t => clearTimeout(t));
  }
  if (game) game.botTimeouts = [];
}

function checkIsLiarHost(game, socketId) {
  if (!game) return false;
  if (!game.host || !game.players.some(p => p.id === game.host)) {
    const firstHuman = game.players.find(p => !p.isBot);
    if (firstHuman) {
      game.host = firstHuman.id;
      firstHuman.isHost = true;
    }
  }
  const player = game.players.find(p => p.id === socketId);
  return game.host === socketId || player?.isHost || (game.players.length > 0 && game.players[0].id === socketId);
}

export function registerLiarHandlers(io, socket) {
  socket.on('liar-add-bot', ({ room }) => {
    const game = liarGames.get(room);
    if (!game || game.gameStarted || game.phase !== 'waiting') return;

    if (!checkIsLiarHost(game, socket.id)) return;

    if (game.players.length >= 10) {
      socket.emit('liar-error', { message: '최대 10명까지 참여 가능합니다.' });
      return;
    }

    const botCount = game.players.filter(p => p.isBot).length + 1;
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const botPlayer = {
      id: botId,
      username: `🤖 AI 봇 ${botCount}`,
      isHost: false,
      isLiar: false,
      word: null,
      voted: false,
      isBot: true
    };

    game.players.push(botPlayer);

    io.to(room).emit('liar-update', {
      type: 'join',
      data: {
        players: game.players,
        phase: game.phase,
        host: game.host,
        wordProvider: game.wordProvider
      }
    });
  });

  socket.on('liar-remove-bot', ({ room, botId }) => {
    const game = liarGames.get(room);
    if (!game || game.gameStarted || game.phase !== 'waiting') return;

    if (!checkIsLiarHost(game, socket.id)) return;

    let targetBotIndex = -1;
    if (botId) {
      targetBotIndex = game.players.findIndex(p => p.id === botId && p.isBot);
    } else {
      for (let i = game.players.length - 1; i >= 0; i--) {
        if (game.players[i].isBot) {
          targetBotIndex = i;
          break;
        }
      }
    }

    if (targetBotIndex !== -1) {
      game.players.splice(targetBotIndex, 1);

      io.to(room).emit('liar-update', {
        type: 'leave',
        data: {
          players: game.players,
          phase: game.phase,
          host: game.host
        }
      });
    }
  });

  socket.on('liar-game-start', async ({ room }) => {
    const game = liarGames.get(room);
    if (!game || game.gameStarted) return;

    if (!checkIsLiarHost(game, socket.id)) return;

    if (game.players.length < 3) {
      socket.emit('liar-error', { message: '최소 3명이 필요합니다.' });
      return;
    }

    clearBotTimers(game);

    try {
      const { citizenWord, liarWord, citizenDef, liarDef } = await getLiarGameWords();

      game.word = citizenWord;
      game.liarWord = liarWord;
      game.citizenDef = citizenDef;
      game.liarDef = liarDef;
      game.chatHistory = [];

      const randomLiar = game.players[Math.floor(Math.random() * game.players.length)];
      game.liar = randomLiar.id;

      game.players.forEach(player => {
        if (player.id === game.liar) {
          player.isLiar = true;
          player.word = game.liarWord;
          player.wordDef = game.liarDef;
        } else {
          player.isLiar = false;
          player.word = game.word;
          player.wordDef = game.citizenDef;
        }
      });

      game.gameStarted = true;
      game.phase = 'word-distribute';

      game.players.forEach(player => {
        if (!player.isBot) {
          io.to(player.id).emit('liar-update', {
            type: 'word-distribute',
            data: {
              phase: 'word-distribute',
              myWord: player.word,
              isLiar: player.isLiar
            }
          });
        }
      });

      const aiStatusMsg = isGeminiConfigured()
        ? `🧠 [AI 시스템] Google Gemini LLM (${getGeminiModelName()}) 지능형 라이어 봇 엔진이 가동되었습니다.`
        : `🤖 [AI 시스템] 기본 템플릿 모드로 봇이 동작합니다 (GEMINI_API_KEY 설정 시 실시간 추리 가능).`;

      io.to(room).emit('liar-update', {
        type: 'message',
        data: {
          username: '시스템',
          message: aiStatusMsg,
          timestamp: new Date().toISOString()
        }
      });

      setTimeout(() => {
        startTalkPhase(io, room);
      }, 3000);

    } catch (error) {
      console.error('라이어 게임 시작 실패:', error);
      socket.emit('liar-error', { message: '게임 시작 중 오류가 발생했습니다.' });
    }
  });

  socket.on('liar-message', (messageData) => {
    if (!messageData || typeof messageData !== 'object') return;
    const { room, message: rawMessage, username: fallbackUsername } = messageData;
    if (!room || !rawMessage) return;

    const game = liarGames.get(room);
    if (!game) return;

    const user = connectedUsers.get(socket.id);
    const player = game.players?.find(p => p.id === socket.id);
    const senderName = user?.username || player?.username || fallbackUsername || '플레이어';

    const message = sanitizeChatMessage(rawMessage, 500);
    if (!message || message.trim() === '') return;

    const chatItem = {
      username: senderName,
      message,
      timestamp: new Date().toISOString()
    };

    if (!game.chatHistory) game.chatHistory = [];
    game.chatHistory.push(chatItem);
    if (game.chatHistory.length > 50) game.chatHistory.shift();

    io.to(room).emit('liar-update', {
      type: 'message',
      data: chatItem
    });
  });

  socket.on('liar-vote', ({ room, targetId }) => {
    const game = liarGames.get(room);
    if (!game || game.phase !== 'vote') return;

    const user = connectedUsers.get(socket.id);
    if (!user) return;

    if (game.votes[socket.id]) return;

    game.votes[socket.id] = targetId;

    const voteCount = {};
    Object.values(game.votes).forEach(vote => {
      voteCount[vote] = (voteCount[vote] || 0) + 1;
    });

    io.to(room).emit('liar-update', {
      type: 'vote-update',
      data: {
        votedCount: Object.keys(game.votes).length,
        totalCount: game.players.length,
        voteCount
      }
    });

    if (Object.keys(game.votes).length >= game.players.length) {
      showLiarResult(io, room);
    }
  });

  socket.on('liar-game-restart', ({ room }) => {
    const game = liarGames.get(room);
    if (!game) return;

    const user = connectedUsers.get(socket.id);
    if (!user || game.host !== socket.id) return;

    if (game.timerInterval) {
      clearInterval(game.timerInterval);
      game.timerInterval = null;
    }
    clearBotTimers(game);

    game.gameStarted = false;
    game.phase = 'waiting';
    game.wordProvider = null;
    game.word = '';
    game.liarWord = '';
    game.citizenDef = '';
    game.liarDef = '';
    game.liar = null;
    game.timer = 180;
    game.votes = {};
    game.chatHistory = [];

    game.players.forEach(player => {
      player.isLiar = false;
      player.word = null;
      player.wordDef = null;
      player.voted = false;
    });

    io.to(room).emit('liar-update', {
      type: 'restart',
      data: {
        phase: 'waiting',
        players: game.players,
        host: game.host,
        wordProvider: game.wordProvider
      }
    });
  });
}

function startTalkPhase(io, room) {
  const game = liarGames.get(room);
  if (!game) return;

  if (game.timerInterval) {
    clearInterval(game.timerInterval);
    game.timerInterval = null;
  }
  clearBotTimers(game);

  game.phase = 'talk';
  game.timer = 180;

  io.to(room).emit('liar-update', {
    type: 'talk-start',
    data: {
      phase: 'talk',
      timer: game.timer
    }
  });

  // 🤖 AI 봇 힌트 발언 스케줄링 (25초 이상 간격으로 1개 봇만 순차 호출)
  const bots = game.players.filter(p => p.isBot);
  if (bots.length > 0) {
    if (!game.botTimeouts) game.botTimeouts = [];

    // 180초 대화 시간 동안 26초 간격으로 순차 턴 배정 (429 Rate Limit 방지)
    const turnInterval = 26000;
    const maxTurns = Math.min(6, Math.floor(165000 / turnInterval));

    for (let i = 0; i < maxTurns; i++) {
      const bot = bots[i % bots.length];
      const delay = 5000 + (i * turnInterval) + Math.floor(Math.random() * 2500);

      const timeout = setTimeout(async () => {
        const currentGame = liarGames.get(room);
        if (!currentGame || currentGame.phase !== 'talk') return;

        let phrase = null;
        if (isGeminiConfigured()) {
          phrase = await generateLiarTalkMessage({
            bot,
            isLiar: bot.isLiar,
            word: bot.word,
            wordDef: bot.wordDef,
            players: currentGame.players,
            chatHistory: currentGame.chatHistory || []
          });
        }

        if (!phrase) {
          const citizenFallbacks = [
            '일상에서 누구나 쉽게 접할 수 있는 익숙한 대상이에요.',
            '특징이나 용도가 꽤 뚜렷해서 다들 바로 아실 것 같아요.',
            '생각보다 우리 주변에서 정말 자주 볼 수 있는 겁니다.',
            '크기나 모양을 떠올리면 직관적으로 연상되는 대상이에요.',
            '솔직히 다들 한 번쯤은 직접 보거나 사용해보셨을 것 같네요.'
          ];
          const liarFallbacks = [
            '다들 말씀하시는 걸 들어보니 어떤 느낌인지 딱 감이 오네요!',
            '저도 평소에 꽤 익숙하게 생각하고 자주 접하는 편입니다.',
            '호불호가 크게 갈리지 않고 대중적으로 널리 알려진 것 같아요.',
            '설명들을 들어보니 다들 바로 눈치채신 것 같아서 저도 공감합니다.'
          ];
          const pool = bot.isLiar ? liarFallbacks : citizenFallbacks;
          phrase = pool[Math.floor(Math.random() * pool.length)];
        }

        const msgObj = {
          username: bot.username,
          message: phrase,
          timestamp: new Date().toISOString()
        };

        if (!currentGame.chatHistory) currentGame.chatHistory = [];
        currentGame.chatHistory.push(msgObj);
        if (currentGame.chatHistory.length > 40) currentGame.chatHistory.shift();

        io.to(room).emit('liar-update', {
          type: 'message',
          data: msgObj
        });
      }, delay);

      game.botTimeouts.push(timeout);
    }
  }

  game.timerInterval = setInterval(() => {
    game.timer--;
    
    io.to(room).emit('liar-update', {
      type: 'timer-update',
      data: { timer: game.timer }
    });

    if (game.timer <= 0) {
      clearInterval(game.timerInterval);
      game.timerInterval = null;
      startVotePhase(io, room);
    }
  }, 1000);
}

function startVotePhase(io, room) {
  const game = liarGames.get(room);
  if (!game) return;

  clearBotTimers(game);

  game.phase = 'vote';
  game.votes = {};

  io.to(room).emit('liar-update', {
    type: 'vote-start',
    data: {
      phase: 'vote',
      players: game.players
    }
  });

  // 🤖 AI 봇 자동 투표 (Gemini 추리 기반)
  const bots = game.players.filter(p => p.isBot);
  bots.forEach((bot, index) => {
    const voteDelay = 2000 + (index * 1500) + Math.floor(Math.random() * 2000);
    const timeout = setTimeout(async () => {
      const currentGame = liarGames.get(room);
      if (!currentGame || currentGame.phase !== 'vote') return;
      if (currentGame.votes[bot.id]) return;

      const candidates = currentGame.players.filter(p => p.id !== bot.id);
      if (candidates.length > 0) {
        let targetId = null;

        if (isGeminiConfigured()) {
          targetId = await generateLiarVoteTarget({
            bot,
            isLiar: bot.isLiar,
            word: bot.word,
            players: currentGame.players,
            chatHistory: currentGame.chatHistory || []
          });
        }

        if (!targetId || !candidates.some(c => c.id === targetId)) {
          const randomTarget = candidates[Math.floor(Math.random() * candidates.length)];
          targetId = randomTarget.id;
        }

        currentGame.votes[bot.id] = targetId;

        const voteCount = {};
        Object.values(currentGame.votes).forEach(vote => {
          voteCount[vote] = (voteCount[vote] || 0) + 1;
        });

        io.to(room).emit('liar-update', {
          type: 'vote-update',
          data: {
            votedCount: Object.keys(currentGame.votes).length,
            totalCount: currentGame.players.length,
            voteCount
          }
        });

        if (Object.keys(currentGame.votes).length >= currentGame.players.length) {
          showLiarResult(io, room);
        }
      }
    }, voteDelay);

    if (!game.botTimeouts) game.botTimeouts = [];
    game.botTimeouts.push(timeout);
  });
}

function showLiarResult(io, room) {
  const game = liarGames.get(room);
  if (!game) return;

  if (game.timerInterval) {
    clearInterval(game.timerInterval);
    game.timerInterval = null;
  }
  clearBotTimers(game);

  const voteCount = {};
  Object.values(game.votes).forEach(vote => {
    voteCount[vote] = (voteCount[vote] || 0) + 1;
  });

  let maxVotes = 0;
  let mostVotedId = null;
  Object.entries(voteCount).forEach(([playerId, votes]) => {
    if (votes > maxVotes) {
      maxVotes = votes;
      mostVotedId = playerId;
    }
  });

  const liarPlayer = game.players.find(p => p.id === game.liar);
  const mostVotedPlayer = game.players.find(p => p.id === mostVotedId);

  let winner = '';
  let message = '';

  if (mostVotedId === game.liar) {
    winner = 'citizens';
    message = `라이어 ${liarPlayer?.username}을(를) 찾아냈습니다! 시민들의 승리입니다!`;
  } else {
    winner = 'liar';
    message = `라이어 ${liarPlayer?.username}이(가) 숨었습니다! 라이어의 승리입니다!`;
  }

  game.phase = 'result';

  io.to(room).emit('liar-update', {
    type: 'result',
    data: {
      phase: 'result',
      winner,
      message,
      liar: liarPlayer?.username,
      mostVoted: mostVotedPlayer?.username,
      word: game.word,
      liarWord: game.liarWord,
      voteCount
    }
  });
}
