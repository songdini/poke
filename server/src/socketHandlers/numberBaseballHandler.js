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

// 🤖 AI 후보군 전체 생성 (4자리 중복 없는 0~9 순열 4536/5040개)
function generateAllCandidates() {
  const candidates = [];
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      if (b === a) continue;
      for (let c = 0; c <= 9; c++) {
        if (c === a || c === b) continue;
        for (let d = 0; d <= 9; d++) {
          if (d === a || d === b || d === c) continue;
          candidates.push(`${a}${b}${c}${d}`);
        }
      }
    }
  }
  return candidates;
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
        aiCandidates: [],
        currentTurnIndex: 0,
        winner: null,
      };
      baseballGames.set(room, game);
    }

    game.mode = mode || 'single';
    game.history = [];
    game.winner = null;

    if (game.mode === 'single') {
      // 🤖 솔로 vs 알파봇(AI) 1v1 대결 모드: 사용자 비밀 숫자 설정 단계로 진입
      game.secretNumbers = {};
      game.secretNumbers['ai_bot'] = generateSecretNumber();
      game.aiCandidates = generateAllCandidates();
      game.phase = 'set-secret';

      socket.emit('baseball-update', {
        phase: 'set-secret',
        mode: 'single',
        history: [],
        message: '🔑 🤖 알파봇(AI)이 맞출 당신의 4자리 비밀 숫자를 입력해주세요!'
      });
    } else {
      // ⚔️ 1v1 멀티 플레이어 배틀 모드
      game.phase = 'set-secret';
      io.to(room).emit('baseball-update', {
        phase: 'set-secret',
        mode: 'battle',
        players: game.players,
        message: '🔑 상대방이 맞출 본인의 4자리 비밀 숫자를 입력해주세요!'
      });
    }
  });

  // 🔑 비밀 숫자 등록
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

    if (game.mode === 'single') {
      game.phase = 'playing';
      game.history = [];
      game.currentTurnIndex = 0;
      socket.emit('baseball-update', {
        phase: 'playing',
        mode: 'single',
        currentTurnPlayer: { id: socket.id, username: user.username },
        mySecret: secret,
        history: [],
        message: '🎮 🤖 알파봇과의 1v1 지능 대결 시작! 먼저 알파봇의 비밀 숫자를 추측해보세요!'
      });
      return;
    }

    const readyPlayerCount = Object.keys(game.secretNumbers).length;
    if (readyPlayerCount >= game.players.length && game.players.length >= 2) {
      game.phase = 'playing';
      game.currentTurnIndex = 0;
      io.to(room).emit('baseball-update', {
        phase: 'playing',
        mode: 'battle',
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
      // 1. 유저의 추측 채점 (알파봇의 비밀 숫자 대상)
      const aiSecret = game.secretNumbers['ai_bot'];
      const userSecret = game.secretNumbers[socket.id];
      if (!aiSecret || !userSecret) return;

      const userResult = calculateStrikeBall(aiSecret, guess);
      const userAttempt = game.history.filter(h => h.guesser === user.username).length + 1;

      const userRecord = {
        id: `user-${Date.now()}`,
        attempt: userAttempt,
        guesser: user.username,
        guess,
        strike: userResult.strike,
        ball: userResult.ball,
        isOut: userResult.isOut,
        timestamp: new Date().toISOString()
      };

      game.history.push(userRecord);

      if (userResult.strike === 4) {
        game.phase = 'game-over';
        game.winner = user.username;
        return socket.emit('baseball-update', {
          phase: 'game-over',
          mode: 'single',
          history: game.history,
          winner: user.username,
          secretNumber: aiSecret,
          message: `🎉 정답 축하합니다! ${userAttempt}회 시도 만에 알파봇의 숫자를 맞추고 승리하셨습니다!`
        });
      }

      // 유저 턴 기록 전송 + 알파봇 턴 알림
      socket.emit('baseball-update', {
        phase: 'playing',
        mode: 'single',
        history: game.history,
        currentTurnPlayer: { id: 'ai_bot', username: '🤖 알파봇 (AI)' },
        message: `내 추측: ${guess} ➔ ${userResult.strike}S ${userResult.ball}B | 🤖 알파봇이 당신의 숫자를 추론하는 중...`
      });

      // 2. 알파봇(AI)의 지능형 추측 수행 (750ms 딜레이)
      setTimeout(() => {
        const curGame = baseballGames.get(room);
        if (!curGame || curGame.phase !== 'playing') return;

        // 알파봇 후보군에서 추측값 선택
        let aiGuess = '';
        if (curGame.aiCandidates && curGame.aiCandidates.length > 0) {
          const randIdx = Math.floor(Math.random() * Math.min(5, curGame.aiCandidates.length));
          aiGuess = curGame.aiCandidates[randIdx] || curGame.aiCandidates[0];
        } else {
          aiGuess = generateSecretNumber();
        }

        const aiResult = calculateStrikeBall(userSecret, aiGuess);
        const aiAttempt = curGame.history.filter(h => h.guesser === '🤖 알파봇 (AI)').length + 1;

        // 알파봇 후보군 필터링 (Constraint elimination)
        if (curGame.aiCandidates) {
          curGame.aiCandidates = curGame.aiCandidates.filter(cand => {
            const r = calculateStrikeBall(cand, aiGuess);
            return r.strike === aiResult.strike && r.ball === aiResult.ball;
          });
        }

        const aiRecord = {
          id: `ai-${Date.now()}`,
          attempt: aiAttempt,
          guesser: '🤖 알파봇 (AI)',
          guess: aiGuess,
          strike: aiResult.strike,
          ball: aiResult.ball,
          isOut: aiResult.isOut,
          timestamp: new Date().toISOString()
        };

        curGame.history.push(aiRecord);

        if (aiResult.strike === 4) {
          curGame.phase = 'game-over';
          curGame.winner = '🤖 알파봇 (AI)';
          socket.emit('baseball-update', {
            phase: 'game-over',
            mode: 'single',
            history: curGame.history,
            winner: '🤖 알파봇 (AI)',
            secretNumber: aiSecret,
            message: `🤖 알파봇이 ${aiAttempt}회 만에 당신의 비밀 숫자(${userSecret})를 맞추었습니다! 알파봇 승리!`
          });
        } else {
          socket.emit('baseball-update', {
            phase: 'playing',
            mode: 'single',
            history: curGame.history,
            currentTurnPlayer: { id: socket.id, username: user.username },
            message: `🤖 알파봇의 추측: ${aiGuess} ➔ ${aiResult.strike}S ${aiResult.ball}B | 당신의 턴입니다!`
          });
        }
      }, 750);
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
        timestamp: new Date().toISOString()
      };

      game.history.push(record);

      if (result.strike === 4) {
        game.phase = 'game-over';
        game.winner = user.username;
        io.to(room).emit('baseball-update', {
          phase: 'game-over',
          mode: 'battle',
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
          mode: 'battle',
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
    game.aiCandidates = [];
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

