// 🔤 Backend Wordle Game Socket Handler

const wordleRooms = new Map();

// 영문 5글자 단어 목록 데이터베이스
const WORD_LIST_EN = [
  'APPLE', 'BRAIN', 'CHAIR', 'DREAM', 'EARTH', 'FLAME', 'GRAPE', 'HEART',
  'IMAGE', 'JUICE', 'KNIFE', 'LEMON', 'MUSIC', 'NIGHT', 'OCEAN', 'PLANT',
  'QUEEN', 'RIVER', 'SMILE', 'TABLE', 'UNION', 'VOICE', 'WATER', 'YOUTH',
  'SMART', 'EXCEL', 'SHEET', 'POWER', 'QUERY', 'AUDIT', 'MAFIA', 'CHECK'
];

export function registerWordleHandlers(io, socket) {
  // 워들 게임 시작/리셋
  socket.on('wordle-start', ({ room, language = 'en' }) => {
    const list = WORD_LIST_EN;
    const targetWord = list[Math.floor(Math.random() * list.length)];

    const gameState = {
      room,
      language,
      targetWord,
      attempts: [], // Array of string guesses (up to 6)
      results: [],  // Array of status arrays: 'correct' | 'present' | 'absent'
      phase: 'playing', // 'playing' | 'won' | 'lost'
      winner: null,
      startTime: Date.now()
    };

    wordleRooms.set(room, gameState);

    io.to(room).emit('wordle-update', {
      phase: 'playing',
      language,
      attempts: [],
      results: [],
      targetWordLength: targetWord.length,
      message: `🔤 5글자 워들 단어 추리가 시작되었습니다! (총 6번의 기회)`
    });
  });

  // 단어 제출
  socket.on('wordle-submit-guess', ({ room, guess, username }) => {
    const state = wordleRooms.get(room);
    if (!state || state.phase !== 'playing') return;

    const formattedGuess = (guess || '').trim().toUpperCase();
    if (formattedGuess.length !== 5) {
      socket.emit('wordle-error', { message: '5글자 단어를 입력해야 합니다.' });
      return;
    }

    if (state.attempts.length >= 6) return;

    // 검증 결과 생성 (correct: 위치+글자일치, present: 글자만포함, absent: 미포함)
    const result = evaluateGuess(formattedGuess, state.targetWord);

    state.attempts.push(formattedGuess);
    state.results.push(result);

    const isWon = formattedGuess === state.targetWord;
    const isLost = !isWon && state.attempts.length >= 6;

    if (isWon) {
      state.phase = 'won';
      state.winner = username;
    } else if (isLost) {
      state.phase = 'lost';
    }

    io.to(room).emit('wordle-update', {
      phase: state.phase,
      attempts: state.attempts,
      results: state.results,
      winner: state.winner,
      targetWord: (isWon || isLost) ? state.targetWord : null,
      lastGuesser: username,
      message: isWon
        ? `🎉 축하합니다! ${username} 님이 정답 단어 "${state.targetWord}"를 맞혔습니다!`
        : isLost
        ? `💥 아쉽게 실패했습니다. 정답 단어는 "${state.targetWord}" 였습니다.`
        : `${username} 님의 추측: ${formattedGuess}`
    });
  });
}

function evaluateGuess(guess, target) {
  const result = Array(5).fill('absent');
  const targetArr = target.split('');
  const guessArr = guess.split('');

  // 1차 패스: Exact Match (correct)
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      targetArr[i] = null;
    }
  }

  // 2차 패스: Partial Match (present)
  for (let i = 0; i < 5; i++) {
    if (result[i] !== 'correct') {
      const targetIndex = targetArr.indexOf(guessArr[i]);
      if (targetIndex !== -1) {
        result[i] = 'present';
        targetArr[targetIndex] = null;
      }
    }
  }

  return result;
}

export function clearWordleRoomState(room) {
  wordleRooms.delete(room);
}
