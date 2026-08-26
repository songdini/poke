// 🧩 Backend Sudoku Game Socket Handler
import { generateSudoku } from '../utils/sudokuGenerator.js';

// 방별 스도쿠 게임 상태 저장소
const sudokuRooms = new Map();

function checkSudokuCompletion(state, username, io, customMsg) {
  let isComplete = true;
  let isCorrect = true;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.grid[r][c] === 0) {
        isComplete = false;
      } else if (state.grid[r][c] !== state.solutionGrid[r][c]) {
        isCorrect = false;
      }
    }
  }

  if (isComplete && isCorrect) {
    state.completed = true;
    state.phase = 'completed';
    state.winner = username || '플레이어';

    io.to(state.room).emit('sudoku-update', {
      phase: 'completed',
      grid: state.grid,
      fixedMask: state.fixedMask,
      notes: state.notes,
      completed: true,
      winner: state.winner,
      elapsedTime: Math.floor((Date.now() - state.startTime) / 1000),
      message: customMsg || `🎉 축하합니다! ${username} 님이 퍼즐을 완성했습니다!`
    });
    return true;
  }
  return false;
}

export function registerSudokuHandlers(io, socket) {
  // 스도쿠 동기화 요청 (방 상태가 없으면 쉬움 퍼즐 자동 생성)
  socket.on('sudoku-sync-request', ({ room }) => {
    let state = sudokuRooms.get(room);
    if (!state) {
      const generated = generateSudoku('easy');
      const initialGrid = JSON.parse(JSON.stringify(generated.puzzle));
      const solutionGrid = JSON.parse(JSON.stringify(generated.solution));
      const fixedMask = initialGrid.map(row => row.map(val => val !== 0));

      state = {
        room,
        difficulty: 'easy',
        mode: 'coop',
        initialGrid,
        grid: JSON.parse(JSON.stringify(initialGrid)),
        solutionGrid,
        fixedMask,
        phase: 'playing',
        startTime: Date.now(),
        completed: false,
        winner: null,
        notes: Array(9).fill(null).map(() => Array(9).fill(null).map(() => [])),
        history: []
      };
      sudokuRooms.set(room, state);
    }

    socket.emit('sudoku-update', {
      phase: state.phase,
      difficulty: state.difficulty,
      mode: state.mode,
      grid: state.grid,
      fixedMask: state.fixedMask,
      notes: state.notes,
      completed: state.completed,
      winner: state.winner,
      startTime: state.startTime,
      message: state.completed ? '🎉 이미 완성된 퍼즐입니다.' : undefined
    });
  });

  // 스도쿠 게임 시작/생성
  socket.on('sudoku-start', ({ room, difficulty = 'easy', mode = 'coop' }) => {
    const validDiff = ['easy', 'medium', 'hard', 'expert', 'legendary'].includes(difficulty) ? difficulty : 'easy';
    const generated = generateSudoku(validDiff);

    // 9x9 플레이어 그리드 복사 (0은 빈 셀)
    const initialGrid = JSON.parse(JSON.stringify(generated.puzzle));
    const solutionGrid = JSON.parse(JSON.stringify(generated.solution));

    // 고정 셀 마스크 생성 (true면 초기 고정 숫자)
    const fixedMask = initialGrid.map(row => row.map(val => val !== 0));

    const gameState = {
      room,
      difficulty: validDiff,
      mode, // 'coop' | 'battle' | 'single'
      initialGrid,
      grid: JSON.parse(JSON.stringify(initialGrid)),
      solutionGrid,
      fixedMask,
      phase: 'playing',
      startTime: Date.now(),
      completed: false,
      winner: null,
      notes: Array(9).fill(null).map(() => Array(9).fill(null).map(() => [])),
      history: [] // [{ row, col, prevVal, newVal, username }]
    };

    sudokuRooms.set(room, gameState);

    const diffLabel = validDiff === 'easy' ? '쉬움'
      : validDiff === 'medium' ? '보통'
      : validDiff === 'hard' ? '어려움'
      : validDiff === 'expert' ? '짱어려움'
      : '👑 전설의 스도쿠왕';

    io.to(room).emit('sudoku-update', {
      phase: 'playing',
      difficulty: validDiff,
      mode,
      grid: gameState.grid,
      fixedMask: gameState.fixedMask,
      notes: gameState.notes,
      completed: false,
      startTime: gameState.startTime,
      message: `✨ 새로운 [${diffLabel}] 난이도 스도쿠 퍼즐이 생성되었습니다!`
    });
  });

  // 셀 값 변경 (입력) 핸들러
  const handleCellChange = ({ room, row, col, value, username }) => {
    const state = sudokuRooms.get(room);
    if (!state || state.phase !== 'playing') return;

    if (row < 0 || row > 8 || col < 0 || col > 8) return;
    if (state.fixedMask[row][col]) return; // 고정 숫자는 수정 불가

    const prevVal = state.grid[row][col];
    const numVal = parseInt(value, 10) || 0;

    state.grid[row][col] = numVal;
    state.history.push({ row, col, prevVal, newVal: numVal, username });

    const isFinished = checkSudokuCompletion(state, username, io);
    if (isFinished) return;

    io.to(room).emit('sudoku-update', {
      phase: state.phase,
      grid: state.grid,
      fixedMask: state.fixedMask,
      notes: state.notes,
      completed: false,
      lastChange: { row, col, value: numVal, username }
    });
  };

  socket.on('sudoku-cell-change', handleCellChange);
  socket.on('sudoku-input', handleCellChange);

  // 힌트 요청
  socket.on('sudoku-hint', ({ room, row, col, username }) => {
    const state = sudokuRooms.get(room);
    if (!state || state.phase !== 'playing') return;

    if (row < 0 || row > 8 || col < 0 || col > 8) return;
    if (state.fixedMask[row][col]) return;

    const correctVal = state.solutionGrid[row][col];
    state.grid[row][col] = correctVal;

    const cellName = `${String.fromCharCode(65 + col)}${row + 1}`;
    const hintMsg = `💡 ${username} 님이 (${cellName}) 셀 힌트를 사용했습니다!`;

    const isFinished = checkSudokuCompletion(state, username, io, `🎉 축하합니다! ${username} 님이 힌트로 마지막 퍼즐을 완성했습니다!`);
    if (isFinished) return;

    io.to(room).emit('sudoku-update', {
      phase: state.phase,
      grid: state.grid,
      fixedMask: state.fixedMask,
      notes: state.notes,
      completed: false,
      message: hintMsg
    });
  });

  // 스도쿠 리셋
  socket.on('sudoku-reset', ({ room }) => {
    const state = sudokuRooms.get(room);
    if (!state) return;

    state.grid = JSON.parse(JSON.stringify(state.initialGrid));
    state.phase = 'playing';
    state.completed = false;
    state.notes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));

    io.to(room).emit('sudoku-update', {
      phase: 'playing',
      grid: state.grid,
      fixedMask: state.fixedMask,
      notes: state.notes,
      completed: false,
      message: '🔄 스도쿠 퍼즐이 초기 상태로 되돌아갔습니다.'
    });
  });
}

export function clearSudokuRoomState(room) {
  sudokuRooms.delete(room);
}
