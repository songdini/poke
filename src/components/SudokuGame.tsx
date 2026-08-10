import React, { useState, useEffect } from 'react';
import { getSessionToken } from '../socketUrl';
import { useSocket } from '../context/SocketContext';
import './SudokuGame.css';

interface SudokuGameProps {
  username: string;
  room: string;
  onLeaveRoom?: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const SudokuGame: React.FC<SudokuGameProps> = ({ username, room, onLeaveRoom }) => {
  const { socket } = useSocket();

  // 스도쿠 상태
  const [grid, setGrid] = useState<number[][]>(
    Array(9).fill(0).map(() => Array(9).fill(0))
  );
  const [fixedMask, setFixedMask] = useState<boolean[][]>(
    Array(9).fill(false).map(() => Array(9).fill(false))
  );
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [phase, setPhase] = useState<'waiting' | 'playing' | 'completed'>('waiting');
  const [completed, setCompleted] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 셀 선택 및 토글 옵션
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [message, setMessage] = useState('');
  const [showNumpad, setShowNumpad] = useState(false); // 기본값: 숨김으로 설정하여 100% 엑셀 셀처럼 연출

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
    };

    if (socket.connected) {
      joinRoom();
    }

    const handleUpdate = (data: any) => {
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

  // 키보드 입력 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || phase !== 'playing' || completed) return;

      const { r, c } = selectedCell;

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, phase, completed]);

  // 퍼즐 시작
  const handleStartGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setElapsedTime(0);
    socket?.emit('sudoku-start', { room, difficulty: diff });
  };

  // 셀 숫자 입력/수정
  const handleNumberInput = (val: number) => {
    if (!selectedCell || phase !== 'playing' || completed) return;
    const { r, c } = selectedCell;

    if (fixedMask[r][c]) return;

    socket?.emit('sudoku-cell-change', {
      room,
      row: r,
      col: c,
      value: val,
      username
    });
  };

  // 힌트 사용
  const handleUseHint = () => {
    if (!selectedCell || phase !== 'playing' || completed) return;
    const { r, c } = selectedCell;

    socket?.emit('sudoku-hint', { room, row: r, col: c, username });
  };

  // 퍼즐 초기화
  const handleReset = () => {
    socket?.emit('sudoku-reset', { room });
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
            ? `=SUDOKU_VALIDATE_CELL(Grid_${String.fromCharCode(65 + selectedCell.c)}${selectedCell.r + 1}, ${selectedVal || 0})`
            : '=SUDOKU_MATRIX_SOLVER(Easy, Medium, Hard)'}
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
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
            <button
              key={diff}
              className={`excel-btn ${difficulty === diff && phase === 'playing' ? 'primary' : ''}`}
              onClick={() => handleStartGame(diff)}
            >
              {diff === 'easy' ? '🌱 쉬움' : diff === 'medium' ? '⚡ 보통' : '🔥 어려움'}
            </button>
          ))}
          <button
            className="excel-btn"
            onClick={() => setShowNumpad(!showNumpad)}
          >
            {showNumpad ? '🔢 수식 패드 숨기기' : '🔢 수식 패드 보이기'}
          </button>
          {selectedCell && (
            <button
              className="excel-btn"
              onClick={handleUseHint}
              disabled={phase !== 'playing' || completed}
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
              <h3>🔢 수식 입력 패드 (1~9)</h3>
              <div className="numpad-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    className="numpad-btn"
                    onClick={() => handleNumberInput(num)}
                    disabled={phase !== 'playing' || completed}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '8px', textAlign: 'center' }}>
                <button
                  className="excel-btn"
                  onClick={() => handleNumberInput(0)}
                  disabled={phase !== 'playing' || completed || !selectedCell}
                >
                  🧽 선택 셀 지우기
                </button>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div style={{ fontSize: '0.82rem', color: '#107c41', fontWeight: 600, textAlign: 'center' }}>
            {message}
          </div>
        )}

        <div style={{ fontSize: '0.78rem', color: '#605e5c', textAlign: 'center' }}>
          💡 방향키(`↑` `↓` `←` `→`)로 셀 이동 | 숫자 키(`1`~`9`) 입력 | `Backspace` / `Delete` 지우기
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
