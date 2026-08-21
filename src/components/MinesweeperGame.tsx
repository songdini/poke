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

    const handleUpdate = (data: any) => {
      if (data.board) setBoard(data.board);
      if (data.phase) setPhase(data.phase);
      if (data.difficulty) setDifficulty(data.difficulty);
      if (data.rows) setRows(data.rows);
      if (data.cols) setCols(data.cols);
      if (data.mines) setMines(data.mines);
      if (data.flagsCount !== undefined) setFlagsCount(data.flagsCount);
      if (data.message) setMessage(data.message);
    };

    socket.on('connect', joinRoom);
    socket.on('minesweeper-update', handleUpdate);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('minesweeper-update', handleUpdate);
    };
  }, [socket, username, room]);

  // 퍼즐 시작 (난이도 선택)
  const handleStartGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setElapsedTime(0);
    socket?.emit('minesweeper-start', { room, difficulty: diff });
  };

  // 좌클릭: 셀 개봉
  const handleCellClick = (r: number, c: number) => {
    if (phase !== 'playing') return;
    socket?.emit('minesweeper-open', { room, row: r, col: c, username });
  };

  // 우클릭: 깃발 토글
  const handleCellContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (phase !== 'playing') return;
    socket?.emit('minesweeper-flag', { room, row: r, col: c });
  };

  // 게임 리셋
  const handleReset = () => {
    setElapsedTime(0);
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
        {/* 난이도 선택 리본 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#605e5c' }}>난이도 선택:</span>
          {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(diff => (
            <button
              key={diff}
              className={`excel-btn ${difficulty === diff ? 'primary' : ''}`}
              onClick={() => handleStartGame(diff)}
            >
              {diff === 'beginner' ? '🌱 초급 (9x9)' : diff === 'intermediate' ? '⚡ 중급 (16x16)' : '🔥 고급 (16x30)'}
            </button>
          ))}
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
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`ms-cell ${cell.isOpen ? 'opened' : 'closed'} ${cell.isFlagged ? 'flagged' : ''} ${cell.isOpen && cell.isMine ? 'mine-exploded' : ''}`}
                      onClick={() => handleCellClick(r, c)}
                      onContextMenu={(e) => handleCellContextMenu(e, r, c)}
                      onMouseEnter={() => setSelectedCell({ r, c })}
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
                  ))}
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
        <div style={{ fontSize: '0.78rem', color: '#605e5c', textAlign: 'center' }}>
          💡 좌클릭: 셀 개봉 | 우클릭: 깃발(`🚩`) 표시/해제
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
