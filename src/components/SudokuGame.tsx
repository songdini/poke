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

export interface SudokuRankEntry {
  id: string;
  username: string;
  time: number;
  hintsUsed: number;
  date: string;
}

export interface SudokuRankingsMap {
  easy: SudokuRankEntry[];
  medium: SudokuRankEntry[];
  hard: SudokuRankEntry[];
  expert: SudokuRankEntry[];
  legendary: SudokuRankEntry[];
  god: SudokuRankEntry[];
}

interface SudokuUpdatePayload {
  grid?: number[][];
  fixedMask?: boolean[][];
  phase?: 'waiting' | 'playing' | 'completed';
  difficulty?: Difficulty;
  completed?: boolean;
  winner?: string | null;
  message?: string;
  rankings?: SudokuRankingsMap;
  newRank?: number | null;
}

export type MarkColor = 'none' | 'purple' | 'orange' | 'green';

/**
 * 한국 표준시(KST, Asia/Seoul, UTC+9) 기준 날짜/시간 포맷팅
 */
export function formatKSTDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{4}\.\d{2}\.\d{2}\s\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const kstFormatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = kstFormatter.formatToParts(d);
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
      return `${getPart('year')}.${getPart('month')}.${getPart('day')} ${getPart('hour')}:${getPart('minute')}`;
    }
  } catch (e) {}
  return dateStr;
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

  // 🟣 🟠 🟢 헷갈리는 입력칸/가설 마킹 상태 (9x9 MarkColor matrix)
  const [markedMask, setMarkedMask] = useState<MarkColor[][]>(
    Array(9).fill('none').map(() => Array(9).fill('none'))
  );
  // 입력 모드: 'normal' | 'purple' (보라) | 'orange' (주황) | 'green' (초록)
  const [inputMode, setInputMode] = useState<'normal' | 'purple' | 'orange' | 'green'>('normal');

  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [phase, setPhase] = useState<'waiting' | 'playing' | 'completed'>('waiting');
  const [completed, setCompleted] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 셀 선택 및 토글 옵션 (모바일에서는 기본값으로 가상 키패드 활성화)
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [message, setMessage] = useState('');
  const [showNumpad, setShowNumpad] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // 🏆 실시간 명예의 전당 랭킹 상태
  const [showRankModal, setShowRankModal] = useState(false);
  const [rankings, setRankings] = useState<SudokuRankingsMap>({
    easy: [],
    medium: [],
    hard: [],
    expert: [],
    legendary: [],
    god: []
  });
  const [selectedRankDiff, setSelectedRankDiff] = useState<Difficulty>('easy');

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
  const toggleMarkCell = React.useCallback((r: number, c: number, targetColor?: MarkColor) => {
    if (fixedMask[r]?.[c]) {
      setMessage('🔒 고정 문제는 마킹할 수 없습니다.');
      return;
    }
    setMarkedMask(prev => {
      const next = prev.map(row => [...row]);
      const current = next[r][c];
      let nextVal: MarkColor;

      if (targetColor !== undefined) {
        // 특정 색상 버튼 클릭 시: 이미 해당 색상이면 해제('none'), 아니면 해당 색상으로 변경
        nextVal = current === targetColor ? 'none' : targetColor;
      } else {
        // 순환 토글 (우클릭 / M키 / 롱프레스): none -> purple -> orange -> green -> none
        if (current === 'none') nextVal = 'purple';
        else if (current === 'purple') nextVal = 'orange';
        else if (current === 'orange') nextVal = 'green';
        else nextVal = 'none';
      }

      next[r][c] = nextVal;
      const cellName = `${String.fromCharCode(65 + c)}${r + 1}`;
      if (nextVal === 'purple') {
        setMessage(`🟣 [${cellName}] 셀이 '헷갈림1 (보라색)'으로 표시되었습니다.`);
      } else if (nextVal === 'orange') {
        setMessage(`🟠 [${cellName}] 셀이 '헷갈림2 (주황색)'으로 표시되었습니다.`);
      } else if (nextVal === 'green') {
        setMessage(`🟢 [${cellName}] 셀이 '헷갈림3 (초록색)'으로 표시되었습니다.`);
      } else {
        setMessage(`🔵 [${cellName}] 셀이 '일반 (파란색)'으로 변경되었습니다.`);
      }
      return next;
    });
  }, [fixedMask]);

  // 🟣 🟠 🟢 헷갈림 표시된 색상별 및 총 셀 개수
  const purpleCount = React.useMemo(
    () => markedMask.reduce((acc, row) => acc + row.filter(color => color === 'purple').length, 0),
    [markedMask]
  );
  const orangeCount = React.useMemo(
    () => markedMask.reduce((acc, row) => acc + row.filter(color => color === 'orange').length, 0),
    [markedMask]
  );
  const greenCount = React.useMemo(
    () => markedMask.reduce((acc, row) => acc + row.filter(color => color === 'green').length, 0),
    [markedMask]
  );
  const totalMarkedCount = purpleCount + orangeCount + greenCount;

  // 1. 헷갈림 마킹(보라/주황/초록)만 일반 확정(파란색)으로 해제/원복
  const handleClearMarks = React.useCallback((targetColor: 'purple' | 'orange' | 'green' | 'all' = 'all') => {
    let count = 0;
    if (targetColor === 'purple') count = purpleCount;
    else if (targetColor === 'orange') count = orangeCount;
    else if (targetColor === 'green') count = greenCount;
    else count = totalMarkedCount;

    if (count === 0) {
      setMessage('ℹ️ 현재 표시된 헷갈림 셀이 없습니다.');
      return;
    }

    const colorName =
      targetColor === 'purple'
        ? '헷갈림1(보라색)'
        : targetColor === 'orange'
        ? '헷갈림2(주황색)'
        : targetColor === 'green'
        ? '헷갈림3(초록색)'
        : '모든 헷갈림';

    setMarkedMask(prev =>
      prev.map(row =>
        row.map(color => {
          if (targetColor === 'all') return 'none';
          return color === targetColor ? 'none' : color;
        })
      )
    );
    setMessage(`🧹 ${colorName} 표시(${count}개)를 일반 확정(파랑)으로 변경했습니다.`);
  }, [purpleCount, orangeCount, greenCount, totalMarkedCount]);

  // 2. 헷갈림(보라/주황/초록)으로 입력된 숫자들을 색상별 또는 전체 싹 지우기 (가설 롤백)
  const handleClearMarkedValues = React.useCallback((targetColor: 'purple' | 'orange' | 'green' | 'all' = 'all') => {
    let count = 0;
    if (targetColor === 'purple') count = purpleCount;
    else if (targetColor === 'orange') count = orangeCount;
    else if (targetColor === 'green') count = greenCount;
    else count = totalMarkedCount;

    if (count === 0) {
      const colorLabel = targetColor === 'purple' ? '보라색' : targetColor === 'orange' ? '주황색' : targetColor === 'green' ? '초록색' : '';
      setMessage(`ℹ️ 현재 표시된 ${colorLabel} 헷갈림 셀이 없습니다.`);
      return;
    }

    const colorName =
      targetColor === 'purple'
        ? '헷갈림1(보라색)'
        : targetColor === 'orange'
        ? '헷갈림2(주황색)'
        : targetColor === 'green'
        ? '헷갈림3(초록색)'
        : '모든 헷갈림(보라/주황/초록)';

    if (!window.confirm(`🎨 ${colorName}으로 입력된 ${count}개 셀의 숫자를 삭제하시겠습니까?`)) {
      return;
    }

    const newGrid = grid.map(r => [...r]);
    const nextMarked = markedMask.map(r => [...r]);
    const clearedCells: Array<{ row: number; col: number }> = [];

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cellColor = markedMask[r][c];
        const isMatch = targetColor === 'all' ? cellColor !== 'none' : cellColor === targetColor;
        if (isMatch && !fixedMask[r][c]) {
          newGrid[r][c] = 0;
          nextMarked[r][c] = 'none';
          clearedCells.push({ row: r, col: c });
        }
      }
    }

    setGrid(newGrid);
    setMarkedMask(nextMarked);
    if (socket && socket.connected) {
      socket.emit('sudoku-batch-clear', { room, cells: clearedCells, username });
    }
    setMessage(`🗑️ ${colorName}으로 입력되었던 ${count}개 셀의 숫자를 모두 깨끗이 삭제했습니다.`);
  }, [purpleCount, orangeCount, greenCount, totalMarkedCount, markedMask, grid, fixedMask, socket, room, username]);

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
      if (data.rankings) setRankings(data.rankings);
    };

    const handleRankingsUpdate = (newRanks: SudokuRankingsMap) => {
      if (newRanks) setRankings(newRanks);
    };

    socket.on('connect', joinRoom);
    socket.on('sudoku-update', handleUpdate);
    socket.on('sudoku-rankings-updated', handleRankingsUpdate);

    // 초기 랭킹 정보 요청
    socket.emit('sudoku-get-rankings', (res: SudokuRankingsMap) => {
      if (res) setRankings(res);
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.off('sudoku-update', handleUpdate);
      socket.off('sudoku-rankings-updated', handleRankingsUpdate);
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
      if (inputMode === 'purple' || inputMode === 'orange' || inputMode === 'green') {
        setMarkedMask(prev => {
          const next = prev.map(row => [...row]);
          next[r][c] = inputMode;
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
        handleClearMarkedValues('all');
        return;
      }

      if (e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleClearMarks('all');
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
  }, [selectedCell, phase, completed, handleNumberInput, toggleMarkCell, handleClearMarkedValues, handleClearMarks]);

  // 퍼즐 시작
  const handleStartGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setElapsedTime(0);
    setMarkedMask(Array(9).fill('none').map(() => Array(9).fill('none')));
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
    setMarkedMask(Array(9).fill('none').map(() => Array(9).fill('none')));
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

    const markState = markedMask[r]?.[c];
    if (markState === 'purple') {
      classes.push('marked', 'marked-purple');
    } else if (markState === 'orange') {
      classes.push('marked', 'marked-orange');
    } else if (markState === 'green') {
      classes.push('marked', 'marked-green');
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
  const selectedCellMarkState: MarkColor = selectedCell ? (markedMask[selectedCell.r]?.[selectedCell.c] || 'none') : 'none';

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
            ? `=SUDOKU_VALIDATE_CELL(Grid_${String.fromCharCode(65 + selectedCell.c)}${selectedCell.r + 1}, ${selectedVal || 0}${selectedCellMarkState === 'purple' ? ', [STATUS: UNSURE_HYPOTHESIS_1_PURPLE]' : selectedCellMarkState === 'orange' ? ', [STATUS: UNSURE_HYPOTHESIS_2_ORANGE]' : ''})`
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
          <button
            className="excel-btn ranking-btn"
            onClick={() => {
              setSelectedRankDiff(difficulty);
              setShowRankModal(true);
              socket?.emit('sudoku-get-rankings');
            }}
            title="난이도별 실시간 명예의 전당 랭킹 순위표를 확인합니다."
          >
            🏆 명예의 전당
          </button>
          {selectedCell && !fixedMask[selectedCell.r]?.[selectedCell.c] && (
            <div style={{ display: 'inline-flex', gap: '4px' }}>
              <button
                className={`excel-btn ${selectedCellMarkState === 'purple' ? 'marked-purple-btn-active' : ''}`}
                onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c, 'purple')}
                title="선택된 셀의 헷갈림1(보라색) 색상을 전환합니다"
              >
                {selectedCellMarkState === 'purple' ? '🟣 보라 해제' : '🟣 헷갈림1'}
              </button>
              <button
                className={`excel-btn ${selectedCellMarkState === 'orange' ? 'marked-orange-btn-active' : ''}`}
                onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c, 'orange')}
                title="선택된 셀의 헷갈림2(주황색) 색상을 전환합니다"
              >
                {selectedCellMarkState === 'orange' ? '🟠 주황 해제' : '🟠 헷갈림2'}
              </button>
              <button
                className={`excel-btn ${selectedCellMarkState === 'green' ? 'marked-green-btn-active' : ''}`}
                onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c, 'green')}
                title="선택된 셀의 헷갈림3(초록색) 색상을 전환합니다"
              >
                {selectedCellMarkState === 'green' ? '🟢 초록 해제' : '🟢 헷갈림3'}
              </button>
            </div>
          )}
          {totalMarkedCount > 0 && (
            <div className="marked-actions-ribbon-group" style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap' }}>
              {purpleCount > 0 && (
                <button
                  className="excel-btn marked-purple-del-btn"
                  onClick={() => handleClearMarkedValues('purple')}
                  title="보라색(헷갈림1)으로 입력된 숫자들을 삭제합니다."
                >
                  🗑️ 🟣 보라 삭제 ({purpleCount})
                </button>
              )}
              {orangeCount > 0 && (
                <button
                  className="excel-btn marked-orange-del-btn"
                  onClick={() => handleClearMarkedValues('orange')}
                  title="주황색(헷갈림2)으로 입력된 숫자들을 삭제합니다."
                >
                  🗑️ 🟠 주황 삭제 ({orangeCount})
                </button>
              )}
              {greenCount > 0 && (
                <button
                  className="excel-btn marked-green-del-btn"
                  onClick={() => handleClearMarkedValues('green')}
                  title="초록색(헷갈림3)으로 입력된 숫자들을 삭제합니다."
                >
                  🗑️ 🟢 초록 삭제 ({greenCount})
                </button>
              )}
              {totalMarkedCount > 0 && (
                <button
                  className="excel-btn marked-delete-btn"
                  onClick={() => handleClearMarkedValues('all')}
                  title="모든 헷갈림(보라/주황/초록)으로 입력된 가설 숫자들을 한 번에 모두 삭제합니다. (단축키: Shift+Delete)"
                >
                  🗑️ 전체 헷갈림 삭제 ({totalMarkedCount})
                </button>
              )}
              <button
                className="excel-btn marked-clear-btn"
                onClick={() => handleClearMarks('all')}
                title="모든 헷갈림(보라/주황/초록) 셀을 일반 파란색 확정으로 일괄 전환합니다. (단축키: Shift+M)"
              >
                🧹 색상 원복 ({totalMarkedCount})
              </button>
            </div>
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
          <span className="legend-item marked-purple">
            <span className="legend-sample marked-purple">4</span> 헷갈림1 (보라)
          </span>
          <span className="legend-item marked-orange">
            <span className="legend-sample marked-orange">8</span> 헷갈림2 (주황)
          </span>
          <span className="legend-item marked-green">
            <span className="legend-sample marked-green">2</span> 헷갈림3 (초록)
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
                          : markedMask[r][c] === 'purple'
                          ? '헷갈림1(보라색) 표시된 셀 - 우클릭/길게누르기로 전환'
                          : markedMask[r][c] === 'orange'
                          ? '헷갈림2(주황색) 표시된 셀 - 우클릭/길게누르기로 전환'
                          : markedMask[r][c] === 'green'
                          ? '헷갈림3(초록색) 표시된 셀 - 우클릭/길게누르기로 전환'
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
                
                {/* 입력 모드 토글 (일반 파랑 vs 헷갈림 보라/주황/초록) */}
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
                    className={`mode-toggle-btn ${inputMode === 'purple' ? 'active-purple' : ''}`}
                    onClick={() => setInputMode('purple')}
                    title="헷갈림1 가설 숫자 입력 모드 (보라색)"
                  >
                    🟣 헷갈림1 (보라)
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${inputMode === 'orange' ? 'active-orange' : ''}`}
                    onClick={() => setInputMode('orange')}
                    title="헷갈림2 가설 숫자 입력 모드 (주황색)"
                  >
                    🟠 헷갈림2 (주황)
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${inputMode === 'green' ? 'active-green' : ''}`}
                    onClick={() => setInputMode('green')}
                    title="헷갈림3 가설 숫자 입력 모드 (초록색)"
                  >
                    🟢 헷갈림3 (초록)
                  </button>
                </div>
              </div>

              <div className="numpad-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    className={`numpad-btn ${inputMode === 'purple' ? 'purple-mode-btn' : inputMode === 'orange' ? 'orange-mode-btn' : inputMode === 'green' ? 'green-mode-btn' : ''}`}
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
                  <div style={{ display: 'flex', gap: '3px', flex: 3 }}>
                    <button
                      type="button"
                      className={`excel-btn ${selectedCellMarkState === 'purple' ? 'marked-purple-btn-active' : ''}`}
                      onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c, 'purple')}
                      style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem' }}
                    >
                      {selectedCellMarkState === 'purple' ? '🟣 보라 해제' : '🟣 헷갈림1'}
                    </button>
                    <button
                      type="button"
                      className={`excel-btn ${selectedCellMarkState === 'orange' ? 'marked-orange-btn-active' : ''}`}
                      onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c, 'orange')}
                      style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem' }}
                    >
                      {selectedCellMarkState === 'orange' ? '🟠 주황 해제' : '🟠 헷갈림2'}
                    </button>
                    <button
                      type="button"
                      className={`excel-btn ${selectedCellMarkState === 'green' ? 'marked-green-btn-active' : ''}`}
                      onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c, 'green')}
                      style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem' }}
                    >
                      {selectedCellMarkState === 'green' ? '🟢 초록 해제' : '🟢 헷갈림3'}
                    </button>
                  </div>
                )}
              </div>

              {totalMarkedCount > 0 && (
                <div className="numpad-marked-del-grid" style={{ display: 'flex', gap: '4px', width: '100%', marginTop: 6, flexWrap: 'wrap' }}>
                  {purpleCount > 0 && (
                    <button
                      type="button"
                      className="excel-btn marked-purple-del-btn"
                      onClick={() => handleClearMarkedValues('purple')}
                      style={{ flex: 1, padding: '5px 4px', fontSize: '0.74rem' }}
                      title="보라색(헷갈림1) 숫자만 삭제"
                    >
                      🗑️ 🟣보라 ({purpleCount})
                    </button>
                  )}
                  {orangeCount > 0 && (
                    <button
                      type="button"
                      className="excel-btn marked-orange-del-btn"
                      onClick={() => handleClearMarkedValues('orange')}
                      style={{ flex: 1, padding: '5px 4px', fontSize: '0.74rem' }}
                      title="주황색(헷갈림2) 숫자만 삭제"
                    >
                      🗑️ 🟠주황 ({orangeCount})
                    </button>
                  )}
                  {greenCount > 0 && (
                    <button
                      type="button"
                      className="excel-btn marked-green-del-btn"
                      onClick={() => handleClearMarkedValues('green')}
                      style={{ flex: 1, padding: '5px 4px', fontSize: '0.74rem' }}
                      title="초록색(헷갈림3) 숫자만 삭제"
                    >
                      🗑️ 🟢초록 ({greenCount})
                    </button>
                  )}
                  {totalMarkedCount > 0 && (
                    <button
                      type="button"
                      className="excel-btn marked-delete-btn"
                      onClick={() => handleClearMarkedValues('all')}
                      style={{ flex: 1, padding: '5px 4px', fontSize: '0.74rem' }}
                      title="모든 헷갈림 가설 숫자 일괄 삭제"
                    >
                      🗑️ 전체 ({totalMarkedCount})
                    </button>
                  )}
                  <button
                    type="button"
                    className="excel-btn marked-clear-btn"
                    onClick={() => handleClearMarks('all')}
                    style={{ flex: 1, padding: '5px 4px', fontSize: '0.74rem' }}
                    title="헷갈림 마킹을 일반 확정(파랑)으로 원복"
                  >
                    🧹 원복 ({totalMarkedCount})
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
          <span>🎨 <b>헷갈림 색상 (보라🟣 / 주황🟠 / 초록🟢)</b>: 🖱️ 우클릭/M키 (토글) | 📱 길게 누르기 | <b>일괄삭제</b>: Shift+Delete | <b>일괄원복</b>: Shift+M</span>
        </div>
      </div>

      {/* 📑 Bottom Excel Sheet Tabs */}
      <div className="excel-sheet-tab-bar">
        <div className="excel-sheet-tab active">Sudoku_Grid_A1_I9</div>
        <div
          className="excel-sheet-tab"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setSelectedRankDiff(difficulty);
            setShowRankModal(true);
            socket?.emit('sudoku-get-rankings');
          }}
        >
          🏆 Hall_Of_Fame
        </div>
        <div className="excel-sheet-tab">Matrix_Analytics</div>
        <div className="excel-sheet-tab">Validation_Check</div>
        <div style={{ color: '#8a8886', padding: '0 6px', cursor: 'pointer' }}>+</div>
        <div className="excel-status-ready">STATUS: READY</div>
      </div>

      {/* 🏆 실시간 명예의 전당 엑셀 모달 */}
      {showRankModal && (
        <div className="sudoku-rank-modal-backdrop" onClick={() => setShowRankModal(false)}>
          <div className="sudoku-rank-modal-card" onClick={e => e.stopPropagation()}>
            {/* Modal Title */}
            <div className="rank-modal-header">
              <div className="rank-title-group">
                <span style={{ fontSize: '1.4rem' }}>🏆</span>
                <div>
                  <h3>Table 07: Sudoku_Hall_Of_Fame.xlsx</h3>
                  <span className="rank-subtitle">난이도별 타임어택 실시간 Top 10 명예의 전당</span>
                </div>
              </div>
              <button
                className="excel-btn close rank-close-btn"
                onClick={() => setShowRankModal(false)}
              >
                ✕ 닫기
              </button>
            </div>

            {/* 난이도 탭 바 */}
            <div className="rank-diff-tabs">
              {([
                { key: 'easy', label: '🌱 쉬움' },
                { key: 'medium', label: '⚡ 보통' },
                { key: 'hard', label: '🔥 어려움' },
                { key: 'expert', label: '💀 짱어려움' },
                { key: 'legendary', label: '👑 전설' },
                { key: 'god', label: '🌌 신의 영역' }
              ] as { key: Difficulty; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  className={`rank-tab-btn ${selectedRankDiff === tab.key ? 'active' : ''} ${tab.key}`}
                  onClick={() => setSelectedRankDiff(tab.key)}
                >
                  {tab.label}
                  <span className="rank-count-badge">
                    {rankings[tab.key]?.length || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* 랭킹 스프레드시트 테이블 */}
            <div className="rank-table-wrapper">
              <table className="excel-rank-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>순위</th>
                    <th>플레이어</th>
                    <th style={{ width: '120px' }}>클리어 타임</th>
                    <th style={{ width: '90px' }}>힌트</th>
                    <th style={{ width: '150px' }}>달성 일시</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings[selectedRankDiff] && rankings[selectedRankDiff].length > 0 ? (
                    rankings[selectedRankDiff].map((entry, idx) => {
                      const rankNum = idx + 1;
                      const isMe = entry.username === username;
                      const minutes = Math.floor(entry.time / 60);
                      const seconds = entry.time % 60;
                      const timeStr = `${minutes > 0 ? `${minutes}분 ` : ''}${seconds}초`;
                      const medal = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : `${rankNum}`;

                      return (
                        <tr
                          key={entry.id || idx}
                          className={`rank-row rank-${rankNum} ${isMe ? 'my-rank-row' : ''}`}
                        >
                          <td className="rank-col-medal">
                            <span className={`medal-icon rank-${rankNum}`}>
                              {medal}
                            </span>
                          </td>
                          <td className="rank-col-user">
                            <span className="rank-username">{entry.username}</span>
                            {isMe && <span className="me-tag">ME</span>}
                          </td>
                          <td className="rank-col-time">
                            ⏱️ <b>{timeStr}</b>
                          </td>
                          <td className="rank-col-hints">
                            {entry.hintsUsed > 0 ? `${entry.hintsUsed}회` : <span style={{ color: '#107c41', fontWeight: 700 }}>노힌트 ✨</span>}
                          </td>
                          <td className="rank-col-date">
                            {formatKSTDate(entry.date)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty-rank-cell">
                        <div className="empty-rank-box">
                          <p>아직 [{selectedRankDiff === 'easy' ? '쉬움' : selectedRankDiff === 'medium' ? '보통' : selectedRankDiff === 'hard' ? '어려움' : selectedRankDiff === 'expert' ? '짱어려움' : selectedRankDiff === 'legendary' ? '전설의 스도쿠왕' : '신의 영역'}] 난이도에 등록된 랭커가 없습니다.</p>
                          <span>지금 퍼즐을 클리어하고 영광스러운 첫 1위 🥇의 주인공이 되어보세요!</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="rank-modal-footer">
              <span className="excel-status-ready">STATUS: RANKINGS_SYNCED_LIVE</span>
              <button
                className="excel-btn primary"
                onClick={() => {
                  handleStartGame(selectedRankDiff);
                  setShowRankModal(false);
                }}
              >
                🎮 이 난이도로 도전하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SudokuGame;
