// 💣 Backend Minesweeper Game Socket Handler

const minesweeperRooms = new Map();

// 지뢰 배치 및 맵 생성 함수
function generateMinesweeperBoard(rows, cols, minesCount, firstClickRow = -1, firstClickCol = -1) {
  const board = Array(rows).fill(null).map(() =>
    Array(cols).fill(null).map(() => ({
      isMine: false,
      isOpen: false,
      isFlagged: false,
      neighborMines: 0
    }))
  );

  // 지뢰 배치 (첫 클릭 셀은 안전지대)
  let planted = 0;
  while (planted < minesCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);

    if ((r === firstClickRow && c === firstClickCol) || board[r][c].isMine) {
      continue;
    }

    board[r][c].isMine = true;
    planted++;
  }

  // 인접 지뢰 수 계산
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
            count++;
          }
        }
      }
      board[r][c].neighborMines = count;
    }
  }

  return board;
}

export function registerMinesweeperHandlers(io, socket) {
  // 지뢰찾기 게임 시작
  socket.on('minesweeper-start', ({ room, difficulty = 'beginner' }) => {
    let rows = 9, cols = 9, mines = 10;
    if (difficulty === 'intermediate') {
      rows = 16; cols = 16; mines = 40;
    } else if (difficulty === 'expert') {
      rows = 16; cols = 30; mines = 99;
    }

    const board = generateMinesweeperBoard(rows, cols, mines);

    const gameState = {
      room,
      difficulty,
      rows,
      cols,
      mines,
      board,
      phase: 'playing', // 'playing' | 'won' | 'lost'
      flagsCount: 0,
      startTime: Date.now(),
      firstMove: true
    };

    minesweeperRooms.set(room, gameState);

    io.to(room).emit('minesweeper-update', {
      phase: 'playing',
      difficulty,
      rows,
      cols,
      mines,
      board: maskBoard(board, false),
      flagsCount: 0,
      startTime: gameState.startTime,
      message: `💣 ${difficulty.toUpperCase()} 지뢰찾기 퍼즐이 시작되었습니다!`
    });
  });

  // 셀 오픈 (좌클릭)
  socket.on('minesweeper-open', ({ room, row, col, username }) => {
    const state = minesweeperRooms.get(room);
    if (!state || state.phase !== 'playing') return;

    // 첫 클릭 시 해당 자리에 지뢰가 없도록 재생성
    if (state.firstMove) {
      if (state.board[row][col].isMine) {
        state.board = generateMinesweeperBoard(state.rows, state.cols, state.mines, row, col);
      }
      state.firstMove = false;
    }

    const cell = state.board[row][col];
    if (cell.isOpen || cell.isFlagged) return;

    if (cell.isMine) {
      // 지뢰 폭발! (패배)
      state.phase = 'lost';
      io.to(room).emit('minesweeper-update', {
        phase: 'lost',
        board: maskBoard(state.board, true),
        message: `💥 ${username} 님이 지뢰(${String.fromCharCode(65 + col)}${row + 1})를 밟았습니다!`
      });
      return;
    }

    // 셀 오픈 (Flood Fill)
    openCellRecursive(state.board, row, col, state.rows, state.cols);

    // 승리 조건 체크 (지뢰가 아닌 모든 셀이 열렸는지)
    let nonMineUnopened = 0;
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (!state.board[r][c].isMine && !state.board[r][c].isOpen) {
          nonMineUnopened++;
        }
      }
    }

    if (nonMineUnopened === 0) {
      state.phase = 'won';
      const elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);

      io.to(room).emit('minesweeper-update', {
        phase: 'won',
        board: maskBoard(state.board, true),
        elapsedTime,
        message: `🎉 축하합니다! ${username} 님이 모든 지뢰를 탐지했습니다! (${elapsedTime}초)`
      });
      return;
    }

    io.to(room).emit('minesweeper-update', {
      phase: state.phase,
      board: maskBoard(state.board, false),
      flagsCount: countFlags(state.board)
    });
  });

  // 깃발 토글 (우클릭)
  socket.on('minesweeper-flag', ({ room, row, col }) => {
    const state = minesweeperRooms.get(room);
    if (!state || state.phase !== 'playing') return;

    const cell = state.board[row][col];
    if (cell.isOpen) return;

    cell.isFlagged = !cell.isFlagged;
    const flagsCount = countFlags(state.board);

    io.to(room).emit('minesweeper-update', {
      phase: state.phase,
      board: maskBoard(state.board, false),
      flagsCount
    });
  });

  // ⚡ 마우스 좌우 동시 클릭 / 휠 클릭 / 더블클릭 (Chording: 깃발 수 일치 시 인접 미개봉 셀 일괄 오픈)
  socket.on('minesweeper-chord', ({ room, row, col, username }) => {
    const state = minesweeperRooms.get(room);
    if (!state || state.phase !== 'playing') return;

    if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) return;
    const cell = state.board[row][col];
    if (!cell.isOpen || cell.neighborMines === 0) return;

    // 8방향 인접 깃발 개수 및 닫힌 비깃발 셀 리스트 수집
    let flagCount = 0;
    const unflaggedClosedNeighbors = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
          const nCell = state.board[nr][nc];
          if (nCell.isFlagged) {
            flagCount++;
          } else if (!nCell.isOpen) {
            unflaggedClosedNeighbors.push({ r: nr, c: nc, cell: nCell });
          }
        }
      }
    }

    // 깃발 개수가 해당 셀의 인접 지뢰 수와 일치할 때만 인접 닫힌 셀 일괄 개봉
    if (flagCount === cell.neighborMines && unflaggedClosedNeighbors.length > 0) {
      let exploded = false;
      let explodedPos = null;

      for (const n of unflaggedClosedNeighbors) {
        if (n.cell.isMine) {
          exploded = true;
          explodedPos = n;
          n.cell.isOpen = true;
        } else {
          openCellRecursive(state.board, n.r, n.c, state.rows, state.cols);
        }
      }

      if (exploded) {
        state.phase = 'lost';
        io.to(room).emit('minesweeper-update', {
          phase: 'lost',
          board: maskBoard(state.board, true),
          message: `💥 ${username || '플레이어'} 님이 지뢰(${String.fromCharCode(65 + (explodedPos?.c || col))}${(explodedPos?.r || row) + 1})를 밟았습니다!`
        });
        return;
      }

      // 승리 조건 체크
      let nonMineUnopened = 0;
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          if (!state.board[r][c].isMine && !state.board[r][c].isOpen) {
            nonMineUnopened++;
          }
        }
      }

      if (nonMineUnopened === 0) {
        state.phase = 'won';
        const elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
        io.to(room).emit('minesweeper-update', {
          phase: 'won',
          board: maskBoard(state.board, true),
          elapsedTime,
          message: `🎉 축하합니다! ${username || '플레이어'} 님이 모든 지뢰를 탐지했습니다! (${elapsedTime}초)`
        });
        return;
      }

      io.to(room).emit('minesweeper-update', {
        phase: state.phase,
        board: maskBoard(state.board, false),
        flagsCount: countFlags(state.board)
      });
    }
  });

  // 게임 초기화
  socket.on('minesweeper-reset', ({ room }) => {
    const state = minesweeperRooms.get(room);
    if (!state) return;

    state.board = generateMinesweeperBoard(state.rows, state.cols, state.mines);
    state.phase = 'playing';
    state.firstMove = true;
    state.startTime = Date.now();

    io.to(room).emit('minesweeper-update', {
      phase: 'playing',
      board: maskBoard(state.board, false),
      flagsCount: 0,
      startTime: state.startTime,
      message: '🔄 지뢰찾기 필드가 초기화되었습니다.'
    });
  });
}

// 0 셀 연속 개봉 (Flood Fill)
function openCellRecursive(board, r, c, rows, cols) {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  const cell = board[r][c];
  if (cell.isOpen || cell.isFlagged || cell.isMine) return;

  cell.isOpen = true;

  if (cell.neighborMines === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr !== 0 || dc !== 0) {
          openCellRecursive(board, r + dr, c + dc, rows, cols);
        }
      }
    }
  }
}

function countFlags(board) {
  let count = 0;
  board.forEach(row => row.forEach(cell => {
    if (cell.isFlagged) count++;
  }));
  return count;
}

function maskBoard(board, revealAll = false) {
  return board.map(row =>
    row.map(cell => {
      if (revealAll) {
        return {
          isOpen: true,
          isMine: cell.isMine,
          isFlagged: cell.isFlagged,
          neighborMines: cell.neighborMines
        };
      }
      return {
        isOpen: cell.isOpen,
        isMine: cell.isOpen ? cell.isMine : false,
        isFlagged: cell.isFlagged,
        neighborMines: cell.isOpen ? cell.neighborMines : 0
      };
    })
  );
}

export function clearMinesweeperRoomState(room) {
  minesweeperRooms.delete(room);
}
