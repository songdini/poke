// 🧩 Backend Sudoku Game Socket Handler

// 예시 스도쿠 퍼즐 데이터베이스 (난이도별)
const SUDOKU_PUZZLES = {
  easy: [
    {
      puzzle: [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
      ],
      solution: [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
      ]
    },
    {
      puzzle: [
        [0, 0, 0, 2, 6, 0, 7, 0, 1],
        [6, 8, 0, 0, 7, 0, 0, 9, 0],
        [1, 9, 0, 0, 0, 4, 5, 0, 0],
        [8, 2, 0, 1, 0, 0, 0, 4, 0],
        [0, 0, 4, 6, 0, 2, 9, 0, 0],
        [0, 5, 0, 0, 0, 3, 0, 2, 8],
        [0, 0, 9, 3, 0, 0, 0, 7, 4],
        [0, 4, 0, 0, 5, 0, 0, 3, 6],
        [7, 0, 3, 0, 1, 8, 0, 0, 0]
      ],
      solution: [
        [4, 3, 5, 2, 6, 9, 7, 8, 1],
        [6, 8, 2, 5, 7, 1, 4, 9, 3],
        [1, 9, 7, 8, 3, 4, 5, 6, 2],
        [8, 2, 6, 1, 9, 5, 3, 4, 7],
        [3, 7, 4, 6, 8, 2, 9, 1, 5],
        [9, 5, 1, 7, 4, 3, 6, 2, 8],
        [5, 1, 9, 3, 2, 6, 8, 7, 4],
        [2, 4, 8, 9, 5, 7, 1, 3, 6],
        [7, 6, 3, 4, 1, 8, 2, 5, 9]
      ]
    }
  ],
  medium: [
    {
      puzzle: [
        [2, 0, 0, 3, 0, 0, 0, 0, 0],
        [8, 0, 4, 0, 6, 2, 0, 0, 3],
        [0, 1, 3, 8, 0, 0, 2, 0, 0],
        [0, 0, 0, 0, 2, 0, 3, 9, 0],
        [5, 0, 7, 0, 0, 0, 6, 0, 1],
        [0, 2, 1, 0, 4, 0, 0, 0, 0],
        [0, 0, 2, 0, 0, 9, 8, 1, 0],
        [7, 0, 0, 5, 1, 0, 4, 0, 6],
        [0, 0, 0, 0, 0, 6, 0, 0, 2]
      ],
      solution: [
        [2, 6, 5, 3, 9, 1, 7, 4, 8],
        [8, 7, 4, 5, 6, 2, 1, 9, 3],
        [9, 1, 3, 8, 7, 4, 2, 6, 5],
        [4, 8, 6, 1, 2, 5, 3, 9, 7],
        [5, 9, 7, 4, 3, 8, 6, 2, 1],
        [3, 2, 1, 6, 4, 7, 9, 5, 8],
        [6, 5, 2, 7, 8, 9, 8, 1, 4],
        [7, 3, 9, 5, 1, 8, 4, 2, 6],
        [1, 4, 8, 9, 3, 6, 5, 7, 2]
      ]
    }
  ],
  hard: [
    {
      puzzle: [
        [0, 0, 0, 0, 0, 0, 0, 1, 2],
        [0, 0, 0, 0, 3, 5, 0, 0, 7],
        [5, 0, 0, 0, 0, 0, 6, 0, 0],
        [0, 3, 0, 0, 0, 1, 0, 8, 0],
        [0, 0, 0, 6, 0, 0, 0, 0, 0],
        [0, 0, 8, 0, 0, 0, 9, 0, 0],
        [0, 7, 0, 0, 0, 0, 0, 0, 0],
        [4, 0, 0, 2, 8, 0, 0, 0, 0],
        [0, 6, 1, 0, 0, 0, 0, 0, 0]
      ],
      solution: [
        [6, 8, 3, 7, 9, 4, 5, 1, 2],
        [1, 4, 2, 8, 3, 5, 9, 6, 7],
        [5, 9, 7, 1, 2, 6, 6, 4, 3],
        [7, 3, 6, 9, 4, 1, 2, 8, 5],
        [9, 2, 4, 6, 5, 8, 7, 3, 1],
        [1, 5, 8, 3, 7, 2, 9, 5, 4],
        [2, 7, 9, 5, 1, 3, 4, 2, 8],
        [4, 1, 5, 2, 8, 9, 3, 7, 6],
        [8, 6, 1, 4, 6, 7, 1, 5, 9]
      ]
    }
  ]
};

// 방별 스도쿠 게임 상태 저장소
const sudokuRooms = new Map();

export function registerSudokuHandlers(io, socket) {
  // 스도쿠 게임 시작/생성
  socket.on('sudoku-start', ({ room, difficulty = 'easy', mode = 'coop' }) => {
    const roomPuzzles = SUDOKU_PUZZLES[difficulty] || SUDOKU_PUZZLES.easy;
    const selectedObj = roomPuzzles[Math.floor(Math.random() * roomPuzzles.length)];

    // 9x9 플레이어 그리드 복사 (0은 빈 셀)
    const initialGrid = JSON.parse(JSON.stringify(selectedObj.puzzle));
    const solutionGrid = JSON.parse(JSON.stringify(selectedObj.solution));

    // 고정 셀 마스크 생성 (true면 초기 고정 숫자)
    const fixedMask = initialGrid.map(row => row.map(val => val !== 0));

    const gameState = {
      room,
      difficulty,
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

    io.to(room).emit('sudoku-update', {
      phase: 'playing',
      difficulty,
      mode,
      grid: gameState.grid,
      fixedMask: gameState.fixedMask,
      notes: gameState.notes,
      completed: false,
      startTime: gameState.startTime,
      message: `${difficulty.toUpperCase()} 난이도 스도쿠가 시작되었습니다!`
    });
  });

  // 셀 값 변경 (입력)
  socket.on('sudoku-cell-change', ({ room, row, col, value, username }) => {
    const state = sudokuRooms.get(room);
    if (!state || state.phase !== 'playing') return;

    if (state.fixedMask[row][col]) return; // 고정 숫자는 수정 불가

    const prevVal = state.grid[row][col];
    const numVal = parseInt(value, 10) || 0;

    state.grid[row][col] = numVal;
    state.history.push({ row, col, prevVal, newVal: numVal, username });

    // 스도쿠 정답 완료 여부 확인
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

      io.to(room).emit('sudoku-update', {
        phase: 'completed',
        grid: state.grid,
        fixedMask: state.fixedMask,
        notes: state.notes,
        completed: true,
        winner: state.winner,
        elapsedTime: Math.floor((Date.now() - state.startTime) / 1000),
        message: `🎉 축하합니다! ${username} 님이 퍼즐을 완성했습니다!`
      });
      return;
    }

    io.to(room).emit('sudoku-update', {
      phase: state.phase,
      grid: state.grid,
      fixedMask: state.fixedMask,
      notes: state.notes,
      completed: false,
      lastChange: { row, col, value: numVal, username }
    });
  });

  // 힌트 요청
  socket.on('sudoku-hint', ({ room, row, col, username }) => {
    const state = sudokuRooms.get(room);
    if (!state || state.phase !== 'playing') return;

    if (state.fixedMask[row][col]) return;

    const correctVal = state.solutionGrid[row][col];
    state.grid[row][col] = correctVal;

    io.to(room).emit('sudoku-update', {
      phase: state.phase,
      grid: state.grid,
      fixedMask: state.fixedMask,
      notes: state.notes,
      completed: false,
      message: `💡 ${username} 님이 (${String.fromCharCode(65 + col)}${row + 1}) 셀 힌트를 사용했습니다!`
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
      message: '🔄 스도쿠 퍼즐이 초기화되었습니다.'
    });
  });
}

export function clearSudokuRoomState(room) {
  sudokuRooms.delete(room);
}
