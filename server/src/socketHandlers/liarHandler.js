import { liarGames, connectedUsers } from '../gameManager.js';
import { getLiarGameWords, getDefinitionChunks } from '../dictionaryService.js';
import { sanitizeChatMessage } from '../utils/sanitize.js';

export function clearBotTimers(game) {
  if (game && game.botTimeouts && Array.isArray(game.botTimeouts)) {
    game.botTimeouts.forEach(t => clearTimeout(t));
  }
  if (game) game.botTimeouts = [];
}

export function registerLiarHandlers(io, socket) {
  socket.on('liar-add-bot', ({ room }) => {
    const game = liarGames.get(room);
    if (!game || game.gameStarted || game.phase !== 'waiting') return;

    const user = connectedUsers.get(socket.id);
    if (!user || game.host !== socket.id) return;

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

    const user = connectedUsers.get(socket.id);
    if (!user || game.host !== socket.id) return;

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

    const user = connectedUsers.get(socket.id);
    if (!user || game.host !== socket.id) return;

    if (game.players.length < 3) {
      socket.emit('liar-error', { message: '최소 3명이 필요합니다.' });
      return;
    }

    try {
      const { citizenWord, liarWord, citizenDef, liarDef } = await getLiarGameWords();

      game.word = citizenWord;
      game.liarWord = liarWord;
      game.citizenDef = citizenDef;
      game.liarDef = liarDef;

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
    const { room, message: rawMessage } = messageData;
    const user = connectedUsers.get(socket.id);
    const game = liarGames.get(room);

    if (user && user.gameType === 'liar' && game && game.phase === 'talk' && rawMessage) {
      const message = sanitizeChatMessage(rawMessage, 500);
      if (!message || message.trim() === '') return;

      io.to(room).emit('liar-update', {
        type: 'message',
        data: {
          username: user.username,
          message,
          timestamp: new Date().toISOString()
        }
      });
    }
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

  // 🤖 봇 사전 정의 5글자 분할 발화 등록
  const bots = game.players.filter(p => p.isBot);
  bots.forEach((bot, index) => {
    const chunks = getDefinitionChunks(bot.wordDef || '사전정의없음', 5);
    
    let initialDelay = (index + 1) * 3000 + Math.floor(Math.random() * 2000);
    const interval = 10000 + (index * 2000) + Math.floor(Math.random() * 3000);

    chunks.forEach((chunk, chunkIdx) => {
      const delay = initialDelay + (chunkIdx * interval);
      if (delay < 175000) {
        const timeout = setTimeout(() => {
          const currentGame = liarGames.get(room);
          if (!currentGame || currentGame.phase !== 'talk') return;

          io.to(room).emit('liar-update', {
            type: 'message',
            data: {
              username: bot.username,
              message: chunk,
              timestamp: new Date().toISOString()
            }
          });
        }, delay);

        if (!game.botTimeouts) game.botTimeouts = [];
        game.botTimeouts.push(timeout);
      }
    });
  });

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

  // 🤖 봇 자동 투표
  const bots = game.players.filter(p => p.isBot);
  bots.forEach(bot => {
    const voteDelay = Math.floor(Math.random() * 3000) + 1500;
    const timeout = setTimeout(() => {
      const currentGame = liarGames.get(room);
      if (!currentGame || currentGame.phase !== 'vote') return;
      if (currentGame.votes[bot.id]) return;

      const candidates = currentGame.players.filter(p => p.id !== bot.id);
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        currentGame.votes[bot.id] = target.id;

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

