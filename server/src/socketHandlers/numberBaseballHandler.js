import { baseballGames, connectedUsers } from '../gameManager.js';

// 🎲 중복 없는 4자리 랜덤 숫자 생성 (예: "3824")
function generateSecretNumber() {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const result = [];
  while (result.length < 4) {
    const randIdx = Math.floor(Math.random() * digits.length);
    const digit = digits.splice(randIdx, 1)[0];
    if (result.length === 0 && digit === 0) {
      digits.push(digit); // 첫 자리는 0이 아닌 숫자로 생성
      continue;
    }
    result.push(digit);
  }
  return result.join('');
}

// ⚾ 스트라이크/볼 판정 함수
function calculateStrikeBall(secret, guess) {
  let strike = 0;
  let ball = 0;
  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      strike++;
    } else if (secret.includes(guess[i])) {
      ball++;
    }
  }
  return { strike, ball, isOut: strike === 0 && ball === 0 };
}

export function registerNumberBaseballHandlers(io, socket) {
  // ⚾ 숫자야구 게임 시작 / 모드 설정
  socket.on('baseball-start', ({ room, mode }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    let game = baseballGames.get(room);
    if (!game) {
      game = {
        players: [],
        hostId: socket.id,
        mode: mode || 'single',
        phase: 'waiting',
        history: [],
        secretNumbers: {},
        currentTurnIndex: 0,
        winner: null,
      };
      baseballGames.set(room, game);
    }

    game.mode = mode || 'single';
    game.phase = 'playing';
    game.history = [];
    game.winner = null;

    if (game.mode === 'single') {
      // 솔로/AI 모드: 서버가 비밀 숫자 생성
      game.secretNumbers[socket.id] = generateSecretNumber();
      socket.emit('baseball-update', {
        phase: 'playing',
        mode: 'single',
        history: [],
        message: '🎲 4자리 비밀 숫자가 생성되었습니다! 추측값을 입력하세요.'
      });
    } else {
      // 1v1 배틀 모드: 방의 플레이어들에게 비밀 숫자 입력 안내
      io.to(room).emit('baseball-update', {
        phase: 'set-secret',
        mode: 'battle',
        players: game.players,
        message: '🔑 상대방이 맞출 본인의 4자리 비밀 숫자를 입력해주세요!'
      });
    }
  });

  // 🔑 비밀 숫자 등록 (배틀 모드)
  socket.on('baseball-set-secret', ({ room, secret }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = baseballGames.get(room);
    if (!game) return;

    // 4자리 중복 검증
    if (!/^\d{4}$/.test(secret) || new Set(secret).size !== 4) {
      return socket.emit('baseball-error', { message: '중복 없는 4자리 숫자를 입력하세요.' });
    }

    game.secretNumbers[socket.id] = secret;

    const readyPlayerCount = Object.keys(game.secretNumbers).length;
    if (readyPlayerCount >= game.players.length && game.players.length >= 2) {
      game.phase = 'playing';
      game.currentTurnIndex = 0;
      io.to(room).emit('baseball-update', {
        phase: 'playing',
        currentTurnPlayer: game.players[game.currentTurnIndex],
        message: `🎮 배틀 시작! ${game.players[0].username}님의 턴입니다.`
      });
    } else {
      socket.emit('baseball-update', {
        phase: 'waiting-opponent-secret',
        message: '상대방이 비밀 숫자를 설정하기를 기다리는 중입니다...'
      });
    }
  });

  // 🎯 숫자 추측 제출
  socket.on('baseball-guess', ({ room, guess }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = baseballGames.get(room);
    if (!game || game.phase !== 'playing') return;

    if (!/^\d{4}$/.test(guess) || new Set(guess).size !== 4) {
      return socket.emit('baseball-error', { message: '중복 없는 4자리 숫자를 입력해야 합니다.' });
    }

    if (game.mode === 'single') {
      // 1인/AI 모드
      const secret = game.secretNumbers[socket.id];
      if (!secret) return;

      const result = calculateStrikeBall(secret, guess);
      const attemptCount = game.history.length + 1;

      const record = {
        id: Date.now().toString(),
        attempt: attemptCount,
        guesser: user.username,
        guess,
        strike: result.strike,
        ball: result.ball,
        isOut: result.isOut,
        timestamp: new Date()
      };

      game.history.push(record);

      if (result.strike === 4) {
        game.phase = 'game-over';
        game.winner = user.username;
        socket.emit('baseball-update', {
          phase: 'game-over',
          history: game.history,
          winner: user.username,
          secretNumber: secret,
          message: `🎉 정답 축하합니다! ${attemptCount}회 시도 만에 4 Strike 성공!`
        });
      } else {
        socket.emit('baseball-update', {
          phase: 'playing',
          history: game.history,
          lastRecord: record,
          message: `${guess} ➔ ${result.strike}S ${result.ball}B`
        });
      }
    } else {
      // 1v1 배틀 모드
      const turnPlayer = game.players[game.currentTurnIndex];
      if (turnPlayer.id !== socket.id) {
        return socket.emit('baseball-error', { message: '본인 턴에만 추측할 수 있습니다.' });
      }

      // 상대방 비밀 숫자 가져오기
      const opponent = game.players.find(p => p.id !== socket.id);
      if (!opponent) return;

      const secret = game.secretNumbers[opponent.id];
      if (!secret) return;

      const result = calculateStrikeBall(secret, guess);
      const attemptCount = game.history.filter(h => h.guesser === user.username).length + 1;

      const record = {
        id: Date.now().toString(),
        attempt: attemptCount,
        guesser: user.username,
        guess,
        strike: result.strike,
        ball: result.ball,
        isOut: result.isOut,
        timestamp: new Date()
      };

      game.history.push(record);

      if (result.strike === 4) {
        game.phase = 'game-over';
        game.winner = user.username;
        io.to(room).emit('baseball-update', {
          phase: 'game-over',
          history: game.history,
          winner: user.username,
          secretNumber: secret,
          message: `🏆 ${user.username}님이 상대방의 비밀 숫자(${secret})를 맞추어 승리했습니다!`
        });
      } else {
        // 다음 턴 전환
        game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
        const nextPlayer = game.players[game.currentTurnIndex];

        io.to(room).emit('baseball-update', {
          phase: 'playing',
          history: game.history,
          currentTurnPlayer: nextPlayer,
          lastRecord: record,
          message: `${user.username}님: ${guess} ➔ ${result.strike}S ${result.ball}B (다음: ${nextPlayer.username}님 턴)`
        });
      }
    }
  });

  // 🔄 숫자야구 게임 리셋 / 다시하기
  socket.on('baseball-reset', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = baseballGames.get(room);
    if (!game) return;

    game.phase = 'waiting';
    game.history = [];
    game.secretNumbers = {};
    game.winner = null;

    io.to(room).emit('baseball-update', {
      phase: 'waiting',
      players: game.players,
      hostId: game.hostId,
      history: [],
      message: '게임이 리셋되었습니다. 대기실에서 모드를 선택하고 다시 시작하세요!'
    });
  });
}
