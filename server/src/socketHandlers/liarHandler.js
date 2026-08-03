import { liarGames, connectedUsers } from '../gameManager.js';
import { getLiarGameWords } from '../dictionaryService.js';
import { sanitizeChatMessage } from '../utils/sanitize.js';

export function registerLiarHandlers(io, socket) {
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
      const { citizenWord, liarWord } = await getLiarGameWords();

      game.word = citizenWord;
      game.liarWord = liarWord;

      const randomLiar = game.players[Math.floor(Math.random() * game.players.length)];
      game.liar = randomLiar.id;

      game.players.forEach(player => {
        if (player.id === game.liar) {
          player.isLiar = true;
          player.word = game.liarWord;
        } else {
          player.word = game.word;
        }
      });

      game.gameStarted = true;
      game.phase = 'word-distribute';

      game.players.forEach(player => {
        io.to(player.id).emit('liar-update', {
          type: 'word-distribute',
          data: {
            phase: 'word-distribute',
            myWord: player.word,
            isLiar: player.isLiar
          }
        });
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
    }

    game.gameStarted = false;
    game.phase = 'waiting';
    game.wordProvider = null;
    game.word = '';
    game.liarWord = '';
    game.liar = null;
    game.timer = 180;
    game.votes = {};
    game.timerInterval = null;

    game.players.forEach(player => {
      player.isLiar = false;
      player.word = null;
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

  game.phase = 'talk';
  game.timer = 180;

  io.to(room).emit('liar-update', {
    type: 'talk-start',
    data: {
      phase: 'talk',
      timer: game.timer
    }
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

  game.phase = 'vote';
  game.votes = {};

  io.to(room).emit('liar-update', {
    type: 'vote-start',
    data: {
      phase: 'vote',
      players: game.players
    }
  });
}

function showLiarResult(io, room) {
  const game = liarGames.get(room);
  if (!game) return;

  if (game.timerInterval) {
    clearInterval(game.timerInterval);
    game.timerInterval = null;
  }

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
