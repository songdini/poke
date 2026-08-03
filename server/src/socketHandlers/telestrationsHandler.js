import { telestrationsGames } from '../gameManager.js';
import { sanitizeString } from '../utils/sanitize.js';

export function registerTelestrationsHandlers(io, socket) {
  // 텔레스트레이션 게임 시작
  socket.on('telestrations-game-start', ({ room }) => {
    const game = telestrationsGames.get(room);
    if (!game || game.hostId !== socket.id) return;

    if (game.players.length < 3) {
      return socket.emit('telestrations-error', { message: '최소 3명 이상이어야 시작할 수 있습니다.' });
    }

    game.phase = 'word-input';
    game.currentRound = 1;
    game.turnSubmissions.clear();
    game.gameBooks = game.players.map((p, index) => ({
      owner: p.username,
      ownerId: p.id,
      pages: [],
      originalIndex: index
    }));

    io.to(room).emit('telestrations-update', { phase: 'word-input' });
  });

  // 텔레스트레이션 턴 제출
  socket.on('telestrations-submit-turn', ({ room, data: rawData }) => {
    const game = telestrationsGames.get(room);
    if (!game || game.turnSubmissions.has(socket.id)) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    let data = rawData;
    if (game.phase === 'word-input' || game.phase === 'guessing') {
      data = sanitizeString(rawData, 100);
      if (!data || data.trim() === '') return;
    }

    game.turnSubmissions.set(socket.id, data);

    if (game.turnSubmissions.size === game.players.length) {
      const numPlayers = game.players.length;

      game.players.forEach((p, playerIndex) => {
        const submission = game.turnSubmissions.get(p.id);
        const bookOriginalOwnerIndex = (playerIndex - (game.currentRound - 1) + numPlayers) % numPlayers;
        const book = game.gameBooks.find(b => b.originalIndex === bookOriginalOwnerIndex);

        if (book) {
          book.pages.push({
            type: (game.phase === 'word-input' || game.phase === 'guessing') ? 'word' : 'drawing',
            author: p.username,
            data: submission,
          });
        }
      });

      game.turnSubmissions.clear();
      game.currentRound++;

      if (game.currentRound > numPlayers) {
        game.phase = 'results';
        io.to(room).emit('telestrations-update', {
          phase: 'results',
          results: game.gameBooks
        });
      } else {
        const nextPhase = game.currentRound % 2 === 0 ? 'drawing' : 'guessing';
        game.phase = nextPhase;

        game.players.forEach((p, playerIndex) => {
          const bookSourcePlayerIndex = (playerIndex - (game.currentRound - 1) + numPlayers) % numPlayers;
          const book = game.gameBooks.find(b => b.originalIndex === bookSourcePlayerIndex);

          if (book && book.pages.length > 0) {
            const lastPage = book.pages[book.pages.length - 1];
            io.to(p.id).emit('telestrations-update', {
              phase: game.phase,
              currentBookPage: lastPage,
            });
          }
        });
        io.to(room).emit('telestrations-update', { phase: game.phase });
      }
    }
  });

  // 텔레스트레이션 게임 재시작
  socket.on('telestrations-game-restart', ({ room }) => {
    const game = telestrationsGames.get(room);
    if (!game || game.hostId !== socket.id) return;

    game.phase = 'waiting';
    game.gameBooks = [];
    game.turnSubmissions.clear();
    game.currentRound = 0;

    io.to(room).emit('telestrations-update', {
      phase: 'waiting',
      players: game.players,
      hostId: game.hostId,
      results: null,
      currentBookPage: null,
    });
  });
}
