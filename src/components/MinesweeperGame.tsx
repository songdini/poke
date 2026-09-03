import React, { useState, useEffect } from 'react';
import { getSessionToken } from '../socketUrl';
import { useSocket } from '../context/SocketContext';
import './MinesweeperGame.css';

interface MinesweeperGameProps {
  username: string;
  room: string;
  onLeaveRoom?: () => void;
}

interface CellData {
  isOpen: boolean;
  isMine: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

type Difficulty = 'beginner' | 'intermediate' | 'expert';

interface MinesweeperUpdatePayload {
  board?: CellData[][];
  phase?: 'playing' | 'won' | 'lost';
  difficulty?: Difficulty;
  rows?: number;
  cols?: number;
  mines?: number;
  flagsCount?: number;
  message?: string;
}

const MinesweeperGame: React.FC<MinesweeperGameProps> = ({ username, room, onLeaveRoom }) => {
  const { socket } = useSocket();

  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [rows, setRows] = useState(9);
  const [cols, setCols] = useState(9);
  const [mines, setMines] = useState(10);
  const [flagsCount, setFlagsCount] = useState(0);

  const [board, setBoard] = useState<CellData[][]>([]);
  const [phase, setPhase] = useState<'playing' | 'won' | 'lost'>('playing');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [message, setMessage] = useState('');
  const [isFlagMode, setIsFlagMode] = useState(false);

  // ⚡ 마우스 좌우 동시 클릭 / 휠 클릭 (Chording) 미리보기 상태
  const [chordCenter, setChordCenter] = useState<{ r: number; c: number } | null>(null);
  const [chordPreviewKeys, setChordPreviewKeys] = useState<Set<string>>(new Set());

  // 타이머
  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval>;
    if (phase === 'playing') {
      timerInterval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [phase]);

  // 마우스 버튼 뗐을 때 전역 미리보기 해제
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setChordCenter(null);
      setChordPreviewKeys(new Set());
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // 소켓 연결 및 이벤트 수신
  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      socket.emit('join', {
        username,
        room,
        gameType: 'minesweeper',
        sessionToken: getSessionToken('minesweeper')
      });
    };

    if (socket.connected) {
      joinRoom();
    }

    const handleUpdate = (data: MinesweeperUpdatePayload) => {
      if (data.board) setBoard(data.board);
      if (data.phase) setPhase(data.phase);
      if (data.difficulty) setDifficulty(data.difficulty);
      if (data.rows) setRows(data.rows);
      if (data.cols) setCols(data.cols);
      if (data.mines) setMines(data.mines);
      if (data.flagsCount !== undefined) setFlagsCount(data.flagsCount);
      if (data.message) setMessage(data.message);
      setChordCenter(null);
      setChordPreviewKeys(new Set());
    };

    socket.on('connect', joinRoom);
    socket.on('minesweeper-update', handleUpdate);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('minesweeper-update', handleUpdate);
    };
  }, [socket, username, room]);

  // 8방향 인접 미개봉 셀 및 깃발 개수 계산 헬퍼
  const getChordNeighbors = (r: number, c: number) => {
    const unflaggedClosed: { r: number; c: number }[] = [];
    let flagCount = 0;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr] && board[nr][nc]) {
          const nCell = board[nr][nc];
          if (nCell.isFlagged) {
            flagCount++;
          } else if (!nCell.isOpen) {
            unflaggedClosed.push({ r: nr, c: nc });
          }
        }
      }
    }
    return { unflaggedClosed, flagCount };
  };

  // 코드(Chording) 미리보기 갱신
  const updateChordPreview = (r: number, c: number) => {
    if (!board[r] || !board[r][c]) return;
    const cell = board[r][c];
    if (cell.isOpen && cell.neighborMines > 0) {
      const { unflaggedClosed } = getChordNeighbors(r, c);
      const keySet = new Set<string>();
      unflaggedClosed.forEach(n => keySet.add(`${n.r},${n.c}`));
      setChordCenter({ r, c });
      setChordPreviewKeys(keySet);
    } else {
      setChordCenter(null);
      setChordPreviewKeys(new Set());
    }
  };

  const clearChordPreview = () => {
    setChordCenter(null);
    setChordPreviewKeys(new Set());
  };

  // 퍼즐 시작 (난이도 선택)
  const handleStartGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setElapsedTime(0);
    clearChordPreview();
    socket?.emit('minesweeper-start', { room, difficulty: diff });
  };

  // 마우스 누름 (MouseDown: 좌우 동시 클릭 및 휠 클릭 감지 ➔ 미리보기 활성화)
  const handleCellMouseDown = (e: React.MouseEvent, r: number, c: number) => {
    if (phase !== 'playing') return;

    // 좌+우 동시 클릭 (buttons === 3) 또는 휠 클릭 (button === 1 or buttons === 4)
    const isDualOrMiddle = (e.buttons & 1 && e.buttons & 2) || e.buttons === 3 || e.buttons === 4 || e.button === 1;
    if (isDualOrMiddle) {
      updateChordPreview(r, c);
      return;
    }

    // 열려있는 숫자 셀을 좌클릭으로 누르고 있을 때도 클래식 윈도우 스타일 미리보기
    if (e.buttons === 1 && board[r]?.[c]?.isOpen && board[r]?.[c]?.neighborMines > 0) {
      updateChordPreview(r, c);
    }
  };

  // 마우스 이동 / 진입 (MouseMove / MouseEnter)
  const handleCellMouseEnter = (e: React.MouseEvent, r: number, c: number) => {
    setSelectedCell({ r, c });
    if (phase !== 'playing') return;

    const isDualOrMiddle = (e.buttons & 1 && e.buttons & 2) || e.buttons === 3 || e.buttons === 4;
    if (isDualOrMiddle) {
      updateChordPreview(r, c);
    } else if (e.buttons === 1 && chordCenter) {
      updateChordPreview(r, c);
    }
  };

  // 마우스 뗌 (MouseUp: 코드 실행 판정)
  const handleCellMouseUp = (e: React.MouseEvent, r: number, c: number) => {
    if (phase !== 'playing') return;

    const targetR = chordCenter ? chordCenter.r : r;
    const targetC = chordCenter ? chordCenter.c : c;
    const cell = board[targetR]?.[targetC];
    const isChordRelease = e.button === 0 || e.button === 1 || e.button === 2;

    if (chordCenter && cell && cell.isOpen && cell.neighborMines > 0 && isChordRelease) {
      const { flagCount } = getChordNeighbors(targetR, targetC);
      if (flagCount === cell.neighborMines) {
        socket?.emit('minesweeper-chord', { room, row: targetR, col: targetC, username });
      }
    }
    clearChordPreview();
  };

  // 더블 클릭 (열린 숫자 셀 더블클릭 시 코드 실행)
  const handleCellDoubleClick = (r: number, c: number) => {
    if (phase !== 'playing') return;
    const cell = board[r]?.[c];
    if (cell && cell.isOpen && cell.neighborMines > 0) {
      const { flagCount } = getChordNeighbors(r, c);
      if (flagCount === cell.neighborMines) {
        socket?.emit('minesweeper-chord', { room, row: r, col: c, username });
      }
    }
  };

  // 좌클릭: 셀 개봉 또는 깃발 (모바일 토글 모드 지원)
  const handleCellClick = (r: number, c: number) => {
    if (phase !== 'playing') return;
    const cell = board[r]?.[c];
    if (!cell) return;

    // 이미 열린 셀을 클릭했을 때 주변 깃발 수가 맞으면 편리하게 자동 코드 실행
    if (cell.isOpen) {
      if (cell.neighborMines > 0) {
        const { flagCount } = getChordNeighbors(r, c);
        if (flagCount === cell.neighborMines) {
          socket?.emit('minesweeper-chord', { room, row: r, col: c, username });
        }
      }
      return;
    }

    if (isFlagMode) {
      socket?.emit('minesweeper-flag', { room, row: r, col: c });
    } else {
      socket?.emit('minesweeper-open', { room, row: r, col: c, username });
    }
  };

  // 우클릭: 깃발 토글 (PC 환경)
  const handleCellContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (phase !== 'playing') return;

    // 이미 좌클릭이 눌려 있는 상태에서 우클릭한 동시 클릭 상태면 깃발 토글 대신 코드 미리보기 유지
    if (e.buttons === 3 || chordCenter) {
      return;
    }

    const cell = board[r]?.[c];
    if (cell && !cell.isOpen) {
      socket?.emit('minesweeper-flag', { room, row: r, col: c });
    }
  };

  // 게임 리셋
  const handleReset = () => {
    setElapsedTime(0);
    clearChordPreview();
    socket?.emit('minesweeper-reset', { room });
  };

  const remainingMines = Math.max(0, mines - flagsCount);

  return (
    <div className="minesweeper-container excel-stealth-theme">
      {/* 📊 Excel Formula Bar */}
      <div className="excel-formula-bar">
        <div className="excel-name-box">
          {selectedCell ? `Cell ${String.fromCharCode(65 + selectedCell.c)}${selectedCell.r + 1}` : 'Sheet1!A1'}
        </div>
        <div className="excel-fx-icon">fx</div>
        <div className="excel-formula-input">
          {selectedCell
            ? `=MINESWEEPER_AUDIT_CELL(Grid_${String.fromCharCode(65 + selectedCell.c)}${selectedCell.r + 1}, ${remainingMines}, GridSize_${rows}x${cols})`
            : `=MINESWEEPER_RISK_ANALYSIS(Grid_${rows}x${cols}, Beginner, Intermediate, Expert)`}
        </div>
      </div>

      {/* 📋 Sheet Header Bar */}
      <div className="game-header">
        <div className="sheet-title-info">
          <span style={{ fontSize: '1.2rem' }}>💣</span>
          <h2>Table 07: Minesweeper_Grid_Risk_Analysis.xlsx</h2>
        </div>
        <div className="game-info">
          <span className={`excel-cell-badge ${phase === 'lost' ? 'warning' : 'phase'}`}>
            {phase === 'playing' ? '진행 중' : phase === 'won' ? '🎉 탐지 성공' : '💥 지뢰 폭발'}
          </span>
          <span className="excel-cell-badge">방 #{room}</span>
          {onLeaveRoom && (
            <button onClick={onLeaveRoom} className="excel-btn close">
              🚪 나가기
            </button>
          )}
        </div>
      </div>

      {/* 📱 Main Workspace */}
      <div className="minesweeper-workspace">
        {/* 난이도 & 터치 모드 선택 리본 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#605e5c' }}>난이도:</span>
          {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(diff => (
            <button
              key={diff}
              className={`excel-btn ${difficulty === diff ? 'primary' : ''}`}
              onClick={() => handleStartGame(diff)}
            >
              {diff === 'beginner' ? '🌱 초급 (9x9)' : diff === 'intermediate' ? '⚡ 중급 (16x16)' : '🔥 고급 (16x30)'}
            </button>
          ))}
          <button
            className={`excel-btn ${isFlagMode ? 'warning' : ''}`}
            onClick={() => setIsFlagMode(!isFlagMode)}
            style={{ fontWeight: 700 }}
            title="터치 시 깃발 꽂기 모드로 전환"
          >
            {isFlagMode ? '🚩 깃발 꽂기 모드 (ON)' : '⛏️ 셀 개봉 모드 (ON)'}
          </button>
        </div>

        {/* 📊 Excel KPI Status Bar */}
        <div className="minesweeper-excel-status-bar">
          <div className="status-kpi-item">
            <span className="kpi-label">미탐지 리스크 (Risk_Count):</span>
            <span className="kpi-value warning">{remainingMines.toString().padStart(2, '0')}</span>
          </div>

          <button className="excel-btn primary" onClick={handleReset} title="퍼즐 재검증">
            {phase === 'playing' ? '🔄 데이터 재검증 (Re-Audit)' : phase === 'won' ? '🎉 검증 완료 (Reset)' : '💥 지뢰 폭발 (Retry)'}
          </button>

          <div className="status-kpi-item">
            <span className="kpi-label">감사 소요 시간 (Elapsed_Time):</span>
            <span className="kpi-value">{elapsedTime}s</span>
          </div>
        </div>

        {/* 💣 9x9 / 16x16 / 16x30 Grid Board */}
        <div className="minesweeper-board-wrapper">
          <table className="minesweeper-grid-table">
            <thead>
              <tr>
                <th className="corner-cell"></th>
                {Array.from({ length: cols }).map((_, c) => (
                  <th key={c}>{String.fromCharCode(65 + (c % 26))}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.map((row, r) => (
                <tr key={r}>
                  <th>{r + 1}</th>
                  {row.map((cell, c) => {
                    const isChordPreview = chordPreviewKeys.has(`${r},${c}`);
                    const isChordCenter = chordCenter?.r === r && chordCenter?.c === c;

                    return (
                      <td
                        key={c}
                        className={`ms-cell ${cell.isOpen ? 'opened' : 'closed'} ${cell.isFlagged ? 'flagged' : ''} ${cell.isOpen && cell.isMine ? 'mine-exploded' : ''} ${isChordPreview ? 'chord-preview' : ''} ${isChordCenter ? 'chord-center' : ''}`}
                        onClick={() => handleCellClick(r, c)}
                        onContextMenu={(e) => handleCellContextMenu(e, r, c)}
                        onMouseDown={(e) => handleCellMouseDown(e, r, c)}
                        onMouseMove={(e) => handleCellMouseEnter(e, r, c)}
                        onMouseEnter={(e) => handleCellMouseEnter(e, r, c)}
                        onMouseUp={(e) => handleCellMouseUp(e, r, c)}
                        onDoubleClick={() => handleCellDoubleClick(r, c)}
                      >
                        {cell.isOpen ? (
                          cell.isMine ? (
                            '💣'
                          ) : cell.neighborMines > 0 ? (
                            <span className={`ms-num-${cell.neighborMines}`}>{cell.neighborMines}</span>
                          ) : (
                            ''
                          )
                        ) : cell.isFlagged ? (
                          '🚩'
                        ) : (
                          ''
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 메시지 및 가이드 */}
        {message && (
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: phase === 'lost' ? '#a80000' : '#107c41' }}>
            {message}
          </div>
        )}
        <div style={{ fontSize: '0.8rem', color: '#605e5c', textAlign: 'center', lineHeight: 1.5 }}>
          💡 <b>좌클릭</b>: 셀 개봉 | <b>우클릭</b>: 깃발(🚩) | <b>마우스 좌우 동시 클릭 / 휠 클릭 / 더블클릭</b>: 주변 8칸 미리보기 & 깃발 일치 시 일괄 오픈
        </div>
      </div>

      {/* 📑 Bottom Excel Sheet Tabs */}
      <div className="excel-sheet-tab-bar">
        <div className="excel-sheet-tab active">Minesweeper_Field</div>
        <div className="excel-sheet-tab">Risk_Analysis</div>
        <div className="excel-sheet-tab">Audit_Log</div>
        <div style={{ color: '#8a8886', padding: '0 6px', cursor: 'pointer' }}>+</div>
        <div className="excel-status-ready">STATUS: READY</div>
      </div>
    </div>
  );
};

export default MinesweeperGame;
