import React, { useState, useEffect } from 'react';
import { getSessionToken } from '../socketUrl';
import { useSocket } from '../context/SocketContext';
import './SudokuGame.css';

interface SudokuGameProps {
  username: string;
  room: string;
  onLeaveRoom?: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'legendary' | 'god';

interface SudokuUpdatePayload {
  grid?: number[][];
  fixedMask?: boolean[][];
  phase?: 'waiting' | 'playing' | 'completed';
  difficulty?: Difficulty;
  completed?: boolean;
  winner?: string | null;
  message?: string;
}

const SudokuGame: React.FC<SudokuGameProps> = ({ username, room, onLeaveRoom }) => {
  const { socket } = useSocket();

  // 스도쿠 상태
  const [grid, setGrid] = useState<number[][]>(
    Array(9).fill(0).map(() => Array(9).fill(0))
  );
  const [fixedMask, setFixedMask] = useState<boolean[][]>(
    Array(9).fill(false).map(() => Array(9).fill(false))
  );
  // 🟣 헷갈리는 입력칸/가설 마킹 상태 (9x9 boolean)
  const [markedMask, setMarkedMask] = useState<boolean[][]>(
    Array(9).fill(false).map(() => Array(9).fill(false))
  );
  // 입력 모드: 'normal' (일반 파란색) | 'marked' (헷갈림 보라색)
  const [inputMode, setInputMode] = useState<'normal' | 'marked'>('normal');

  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [phase, setPhase] = useState<'waiting' | 'playing' | 'completed'>('waiting');
  const [completed, setCompleted] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 셀 선택 및 토글 옵션 (모바일에서는 기본값으로 가상 키패드 활성화)
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [message, setMessage] = useState('');
  const [showNumpad, setShowNumpad] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // 모바일 롱프레스(길게 누르기) 감지용 Ref
  const touchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = React.useRef<{ x: number; y: number } | null>(null);

  // 타이머
  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval>;
    if (phase === 'playing' && !completed) {
      timerInterval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [phase, completed]);

  // 마킹(헷갈림 색상) 토글 함수
  const toggleMarkCell = React.useCallback((r: number, c: number) => {
    if (fixedMask[r]?.[c]) {
      setMessage('🔒 고정 문제는 마킹할 수 없습니다.');
      return;
    }
    setMarkedMask(prev => {
      const next = prev.map(row => [...row]);
      const nextVal = !next[r][c];
      next[r][c] = nextVal;
      const cellName = `${String.fromCharCode(65 + c)}${r + 1}`;
      if (nextVal) {
        setMessage(`🟣 [${cellName}] 셀이 '헷갈림(보라색)'으로 표시되었습니다.`);
      } else {
        setMessage(`🔵 [${cellName}] 셀이 '일반(파란색)'으로 변경되었습니다.`);
      }
      return next;
    });
  }, [fixedMask]);

  // 🟣 헷갈림 표시된 총 셀 개수
  const totalMarkedCount = markedMask.reduce((acc, row) => acc + row.filter(Boolean).length, 0);

  // 1. 헷갈림 마킹(보라색)만 일반 확정(파란색)으로 전체 해제
  const handleClearAllMarks = React.useCallback(() => {
    const count = markedMask.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
    if (count === 0) {
      setMessage('ℹ️ 현재 표시된 헷갈림 셀이 없습니다.');
      return;
    }
    setMarkedMask(Array(9).fill(false).map(() => Array(9).fill(false)));
    setMessage(`🧹 총 ${count}개 셀의 헷갈림(보라색) 표시를 일반 확정(파랑)으로 변경했습니다.`);
  }, [markedMask]);

  // 2. 헷갈림(보라색)으로 입력된 숫자들을 한 번에 싹 지우기 (가설 롤백)
  const handleClearAllMarkedValues = React.useCallback(() => {
    const count = markedMask.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
    if (count === 0) {
      setMessage('ℹ️ 현재 표시된 헷갈림 셀이 없습니다.');
      return;
    }
    if (!window.confirm(`🟣 헷갈림(보라색)으로 입력된 ${count}개 셀의 숫자를 모두 지우시겠습니까?`)) {
      return;
    }

    const newGrid = grid.map(r => [...r]);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (markedMask[r][c] && !fixedMask[r][c]) {
          newGrid[r][c] = 0;
        }
      }
    }
    setGrid(newGrid);
    setMarkedMask(Array(9).fill(false).map(() => Array(9).fill(false)));
    if (socket && socket.connected) {
      socket.emit('sudoku-update', { room, grid: newGrid });
    }
    setMessage(`🗑️ 헷갈림(보라색)으로 입력되었던 ${count}개 셀의 숫자를 모두 깨끗이 지웠습니다.`);
  }, [markedMask, grid, fixedMask, socket, room]);

  // 소켓 연결 및 이벤트 핸들링
  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      socket.emit('join', {
        username,
        room,
        gameType: 'sudoku',
        sessionToken: getSessionToken('sudoku')
      });
      socket.emit('sudoku-sync-request', { room });
    };

    if (socket.connected) {
      joinRoom();
    }

    const handleUpdate = (data: SudokuUpdatePayload) => {
      if (data.grid) setGrid(data.grid);
      if (data.fixedMask) setFixedMask(data.fixedMask);
      if (data.phase) setPhase(data.phase);
      if (data.difficulty) setDifficulty(data.difficulty);
      if (data.completed !== undefined) setCompleted(data.completed);
      if (data.winner) setWinner(data.winner);
      if (data.message) setMessage(data.message);
    };

    socket.on('connect', joinRoom);
    socket.on('sudoku-update', handleUpdate);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('sudoku-update', handleUpdate);
    };
  }, [socket, username, room]);

  // 셀 숫자 입력/수정
  const handleNumberInput = React.useCallback((val: number) => {
    if (completed) return;
    if (!selectedCell) {
      setMessage('💡 먼저 숫자를 입력할 스도쿠 칸(셀)을 클릭해 주세요!');
      return;
    }
    const { r, c } = selectedCell;
    if (fixedMask[r]?.[c]) {
      setMessage('🔒 문제로 주어진 고정 숫자는 수정할 수 없습니다.');
      return;
    }

    // 헷갈림 모드이거나 이미 마킹된 상태에서 숫자를 입력할 때 마킹 상태 업데이트
    if (val !== 0) {
      if (inputMode === 'marked') {
        setMarkedMask(prev => {
          const next = prev.map(row => [...row]);
          next[r][c] = true;
          return next;
        });
      }
    }

    socket?.emit('sudoku-cell-change', {
      room,
      row: r,
      col: c,
      value: val,
      username
    });
  }, [selectedCell, completed, fixedMask, inputMode, socket, room, username]);

  // 키보드 입력 핸들러 (M / H 키로 마킹 토글 지원)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || phase !== 'playing' || completed) return;

      const { r, c } = selectedCell;

      if (e.shiftKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handleClearAllMarkedValues();
        return;
      }

      if (e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleClearAllMarks();
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        const val = parseInt(e.key, 10);
        handleNumberInput(val);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleNumberInput(0);
      } else if (e.key === 'ArrowUp') {
        setSelectedCell({ r: Math.max(0, r - 1), c });
      } else if (e.key === 'ArrowDown') {
        setSelectedCell({ r: Math.min(8, r + 1), c });
      } else if (e.key === 'ArrowLeft') {
        setSelectedCell({ r, c: Math.max(0, c - 1) });
      } else if (e.key === 'ArrowRight') {
        setSelectedCell({ r, c: Math.min(8, c + 1) });
      } else if (e.key === 'm' || e.key === 'M' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        toggleMarkCell(r, c);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, phase, completed, handleNumberInput, toggleMarkCell, handleClearAllMarkedValues, handleClearAllMarks]);

  // 퍼즐 시작
  const handleStartGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setElapsedTime(0);
    setMarkedMask(Array(9).fill(false).map(() => Array(9).fill(false)));
    socket?.emit('sudoku-start', { room, difficulty: diff });
  };

  // 힌트 사용
  const handleUseHint = () => {
    if (!selectedCell || phase !== 'playing' || completed) return;
    const { r, c } = selectedCell;

    socket?.emit('sudoku-hint', { room, row: r, col: c, username });
  };

  // 퍼즐 초기화
  const handleReset = () => {
    setMarkedMask(Array(9).fill(false).map(() => Array(9).fill(false)));
    socket?.emit('sudoku-reset', { room });
  };

  // PC 마우스 우클릭 핸들러 (헷갈림 색상 토글)
  const handleCellContextMenu = (r: number, c: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (phase !== 'playing' || completed) return;
    setSelectedCell({ r, c });
    toggleMarkCell(r, c);
  };

  // 모바일 터치 (Long Press) 핸들러
  const handleTouchStart = (r: number, c: number, e: React.TouchEvent) => {
    if (phase !== 'playing' || completed) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      // 햅틱 진동 피드백 (지원 디바이스)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {
          // ignore
        }
      }
      setSelectedCell({ r, c });
      toggleMarkCell(r, c);
      touchTimerRef.current = null;
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !touchTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  // 오류 체크
  const isConflict = (r: number, c: number) => {
    const val = grid[r][c];
    if (val === 0) return false;

    for (let i = 0; i < 9; i++) {
      if (i !== c && grid[r][i] === val) return true;
      if (i !== r && grid[i][c] === val) return true;
    }

    const startR = Math.floor(r / 3) * 3;
    const startC = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const nr = startR + i;
        const nc = startC + j;
        if ((nr !== r || nc !== c) && grid[nr][nc] === val) return true;
      }
    }

    return false;
  };

  // 셀 클래스명 결정
  const getCellClassName = (r: number, c: number) => {
    const classes = ['sudoku-cell'];

    if (c === 2 || c === 5) classes.push('border-right-thick');
    if (r === 2 || r === 5) classes.push('border-bottom-thick');

    const isMarked = markedMask[r]?.[c];
    if (isMarked) {
      classes.push('marked');
    }

    if (fixedMask[r][c]) {
      classes.push('fixed');
    } else if (grid[r][c] !== 0) {
      classes.push('user-input');
    }

    if (isConflict(r, c)) {
      classes.push('conflict');
    }

    if (selectedCell) {
      const { r: sr, c: sc } = selectedCell;
      if (sr === r && sc === c) {
        classes.push('selected');
      } else if (
        sr === r ||
        sc === c ||
        (Math.floor(sr / 3) === Math.floor(r / 3) && Math.floor(sc / 3) === Math.floor(c / 3))
      ) {
        classes.push('related');
      }

      const selectedVal = grid[sr][sc];
      if (selectedVal !== 0 && grid[r][c] === selectedVal) {
        classes.push('same-number');
      }
    }

    return classes.join(' ');
  };

  const selectedVal = selectedCell ? grid[selectedCell.r][selectedCell.c] : null;
  const isSelectedCellMarked = selectedCell ? markedMask[selectedCell.r]?.[selectedCell.c] : false;

  return (
    <div className="sudoku-container excel-stealth-theme">
      {/* 📊 Excel Formula Bar */}
      <div className="excel-formula-bar">
        <div className="excel-name-box">
          {selectedCell ? `Cell ${String.fromCharCode(65 + selectedCell.c)}${selectedCell.r + 1}` : 'Sheet1!A1'}
        </div>
        <div className="excel-fx-icon">fx</div>
        <div className="excel-formula-input">
          {selectedCell
            ? `=SUDOKU_VALIDATE_CELL(Grid_${String.fromCharCode(65 + selectedCell.c)}${selectedCell.r + 1}, ${selectedVal || 0}${isSelectedCellMarked ? ', [STATUS: UNSURE_HYPOTHESIS]' : ''})`
            : difficulty === 'god'
            ? '=ASCEND_TO_DIVINITY(Matrix=INFINITY, AI_Escargot=TRUE)'
            : difficulty === 'legendary'
            ? '=LEGENDARY_MINIMUM_CLUES(Clues=17, Unique_Solution=TRUE)'
            : '=SUDOKU_MATRIX_SOLVER(Easy, Medium, Hard, Expert, Legendary, God)'}
        </div>
      </div>

      {/* 📋 Sheet Header Bar */}
      <div className="game-header">
        <div className="sheet-title-info">
          <span style={{ fontSize: '1.2rem' }}>🧩</span>
          <h2>Table 06: Sudoku_Matrix_Solver.xlsx</h2>
        </div>
        <div className="game-info">
          <span className="excel-cell-badge phase">
            {phase === 'waiting' ? '대기 중' : completed ? '완성됨' : '풀이 진행 중'}
          </span>
          {phase === 'playing' && (
            <span className="excel-cell-badge">
              ⏱️ {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </span>
          )}
          <span className="excel-cell-badge">방 #{room}</span>
          {onLeaveRoom && (
            <button onClick={onLeaveRoom} className="excel-btn close">
              🚪 나가기
            </button>
          )}
        </div>
      </div>

      {/* 📱 Main Workspace */}
      <div className="sudoku-main-workspace">
        {/* 난이도 선택 & 패드 토글 리본 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {(['easy', 'medium', 'hard', 'expert', 'legendary', 'god'] as Difficulty[]).map(diff => (
            <button
              key={diff}
              className={`excel-btn ${difficulty === diff && phase === 'playing' ? (diff === 'god' ? 'god' : diff === 'legendary' ? 'legendary' : diff === 'expert' ? 'expert' : 'primary') : ''}`}
              onClick={() => handleStartGame(diff)}
            >
              {diff === 'easy' ? '🌱 쉬움' : diff === 'medium' ? '⚡ 보통' : diff === 'hard' ? '🔥 어려움' : diff === 'expert' ? '💀 짱어려움' : diff === 'legendary' ? '👑 전설의 스도쿠왕' : '🌌 신(神)의 영역'}
            </button>
          ))}
          <button
            className="excel-btn"
            onClick={() => setShowNumpad(!showNumpad)}
          >
            {showNumpad ? '🔢 수식 패드 숨기기' : '🔢 수식 패드 보이기'}
          </button>
          {selectedCell && !fixedMask[selectedCell.r]?.[selectedCell.c] && (
            <button
              className={`excel-btn ${isSelectedCellMarked ? 'marked-btn-active' : ''}`}
              onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c)}
              title="선택된 셀의 헷갈림(보라색) 색상을 전환합니다"
            >
              {isSelectedCellMarked ? '🟣 헷갈림 해제' : '🟣 헷갈림 표시'}
            </button>
          )}
          {totalMarkedCount > 0 && (
            <>
              <button
                className="excel-btn marked-clear-btn"
                onClick={handleClearAllMarks}
                title="모든 헷갈림(보라색) 셀을 일반 파란색 확정으로 일괄 전환합니다. (단축키: Shift+M)"
              >
                🧹 헷갈림 색상 원복 ({totalMarkedCount})
              </button>
              <button
                className="excel-btn marked-delete-btn"
                onClick={handleClearAllMarkedValues}
                title="헷갈림(보라색)으로 입력된 가설 숫자들을 한 번에 모두 삭제합니다. (단축키: Shift+Delete)"
              >
                🗑️ 헷갈림 숫자 삭제 ({totalMarkedCount})
              </button>
            </>
          )}
          {selectedCell && (
            <button
              className="excel-btn"
              onClick={handleUseHint}
              disabled={phase !== 'playing' || completed || fixedMask[selectedCell.r][selectedCell.c]}
              title={fixedMask[selectedCell.r][selectedCell.c] ? '이미 초기 고정된 셀입니다.' : '정답 힌트 확인'}
            >
              💡 힌트
            </button>
          )}
          <button
            className="excel-btn close"
            onClick={handleReset}
            disabled={phase !== 'playing'}
          >
            🔄 리셋
          </button>
        </div>

        {/* 🎨 셀 구분 범례 (Legend) */}
        <div className="sudoku-legend-bar">
          <span className="legend-item fixed">
            <span className="legend-sample fixed">5</span> 문제 (고정)
          </span>
          <span className="legend-item user">
            <span className="legend-sample user">7</span> 확정 입력 (파랑)
          </span>
          <span className="legend-item marked">
            <span className="legend-sample marked">4</span> 헷갈림/가설 (보라)
          </span>
          <span className="legend-item conflict">
            <span className="legend-sample conflict">3</span> 중복 오류 (빨강)
          </span>
        </div>

        {/* 🧩 9x9 Sudoku Grid Table (Authentic Compact Excel Cells) */}
        <div className="sudoku-board-wrapper">
          <table className="sudoku-grid-table">
            <thead>
              <tr>
                <th className="corner-cell"></th>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(col => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, r) => (
                <tr key={r}>
                  <td className="row-header">{r + 1}</td>
                  {row.map((val, c) => (
                    <td
                      key={c}
                      className={getCellClassName(r, c)}
                      onClick={() => setSelectedCell({ r, c })}
                      onContextMenu={(e) => handleCellContextMenu(r, c, e)}
                      onTouchStart={(e) => handleTouchStart(r, c, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      title={
                        fixedMask[r][c]
                          ? '고정 문제 셀'
                          : markedMask[r][c]
                          ? '헷갈림(가설) 표시된 셀 - 우클릭/길게누르기로 해제'
                          : '클릭하여 선택 | 우클릭/길게누르기로 헷갈림 표시'
                      }
                    >
                      {val !== 0 ? val : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 퍼즐 완성 배너 */}
        {completed && (
          <div className="sudoku-complete-banner">
            <h4>🎉 스도쿠 퍼즐 완성!</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              축하합니다! [{winner}] 님이 스도쿠 행렬 분석을 완수했습니다! (소요시간: {elapsedTime}초)
            </p>
          </div>
        )}

        {/* 🎛️ Numpad Control Panel (토글 가능) */}
        {showNumpad && (
          <div className="sudoku-controls-panel">
            <div className="sudoku-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem' }}>🔢 수식 입력 패드</h3>
                
                {/* 입력 모드 토글 (일반 파랑 vs 헷갈림 보라) */}
                <div className="input-mode-toggle-group">
                  <button
                    type="button"
                    className={`mode-toggle-btn ${inputMode === 'normal' ? 'active-normal' : ''}`}
                    onClick={() => setInputMode('normal')}
                    title="일반 확정 숫자 입력 모드 (파란색)"
                  >
                    🔵 일반 확정
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${inputMode === 'marked' ? 'active-marked' : ''}`}
                    onClick={() => setInputMode('marked')}
                    title="헷갈리는 가설 숫자 입력 모드 (보라색)"
                  >
                    🟣 헷갈림 모드
                  </button>
                </div>
              </div>

              <div className="numpad-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    className={`numpad-btn ${inputMode === 'marked' ? 'marked-mode-btn' : ''}`}
                    onClick={() => handleNumberInput(num)}
                    disabled={completed}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="numpad-action-row">
                <button
                  type="button"
                  className="excel-btn"
                  onClick={() => handleNumberInput(0)}
                  disabled={completed}
                  style={{ flex: 1, padding: '6px 8px' }}
                >
                  🧽 셀 지우기
                </button>
                {selectedCell && !fixedMask[selectedCell.r]?.[selectedCell.c] && (
                  <button
                    type="button"
                    className={`excel-btn ${isSelectedCellMarked ? 'marked-btn-active' : ''}`}
                    onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c)}
                    style={{ flex: 1, padding: '6px 8px' }}
                  >
                    {isSelectedCellMarked ? '🟣 색상 원복 (파랑)' : '🟣 헷갈림 표시 (보라)'}
                  </button>
                )}
              </div>

              {totalMarkedCount > 0 && (
                <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: 6 }}>
                  <button
                    type="button"
                    className="excel-btn marked-clear-btn"
                    onClick={handleClearAllMarks}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem' }}
                    title="모든 헷갈림(보라색) 셀을 일반 파란색 확정으로 일괄 전환합니다."
                  >
                    🧹 헷갈림 색상 원복 ({totalMarkedCount})
                  </button>
                  <button
                    type="button"
                    className="excel-btn marked-delete-btn"
                    onClick={handleClearAllMarkedValues}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem' }}
                    title="헷갈림(보라색)으로 입력된 가설 숫자들을 한 번에 모두 삭제합니다."
                  >
                    🗑️ 헷갈림 숫자 삭제 ({totalMarkedCount})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {message && (
          <div style={{ fontSize: '0.82rem', color: '#107c41', fontWeight: 600, textAlign: 'center' }}>
            {message}
          </div>
        )}

        <div className="sudoku-guide-tip">
          <span>💡 <b>숫자 입력</b>: 가상패드 또는 키보드(1~9) | <b>지우기</b>: Backspace / 0</span>
          <span>🎨 <b>헷갈림(보라색)</b>: 🖱️ 우클릭(M키) | 📱 길게 누르기 | <b>일괄삭제</b>: Shift+Delete | <b>일괄원복</b>: Shift+M</span>
        </div>
      </div>

      {/* 📑 Bottom Excel Sheet Tabs */}
      <div className="excel-sheet-tab-bar">
        <div className="excel-sheet-tab active">Sudoku_Grid_A1_I9</div>
        <div className="excel-sheet-tab">Matrix_Analytics</div>
        <div className="excel-sheet-tab">Validation_Check</div>
        <div style={{ color: '#8a8886', padding: '0 6px', cursor: 'pointer' }}>+</div>
        <div className="excel-status-ready">STATUS: READY</div>
      </div>
    </div>
  );
};

export default SudokuGame;
