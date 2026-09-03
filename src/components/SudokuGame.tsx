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

export const DIFFICULTY_OPTIONS: { key: Difficulty; label: string; short: string; stars: string }[] = [
  { key: 'easy', label: '🌱 쉬움', short: '쉬움', stars: '★☆☆☆☆' },
  { key: 'medium', label: '⚡ 보통', short: '보통', stars: '★★☆☆☆' },
  { key: 'hard', label: '🔥 어려움', short: '어려움', stars: '★★★☆☆' },
  { key: 'expert', label: '💀 짱어려움', short: '짱어려움', stars: '★★★★☆' },
  { key: 'legendary', label: '👑 전설', short: '전설', stars: '★★★★★' },
  { key: 'god', label: '🌌 신의 영역', short: '신의 영역', stars: '✦✦✦✦✦' },
];

export function getNewspaperEditionDate(): string {
  try {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[d.getDay()];
    return `${year}년 ${month}월 ${date}일 (${dayName}) • 조간 • 제 2026호`;
  } catch {
    return '2026년 9월 3일 • 제 2026호';
  }
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

  // 1. 헷갈림 마킹(보라/주황/초록/전체)을 일반 확정(파란색)으로 색상 원복
  const handleClearMarks = React.useCallback((targetColor: 'purple' | 'orange' | 'green' | 'all' = 'all') => {
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

    setMarkedMask(prev =>
      prev.map(row =>
        row.map(color => {
          if (targetColor === 'all') return 'none';
          return color === targetColor ? 'none' : color;
        })
      )
    );
    setMessage(`✨ ${colorName} 셀(${count}개)을 일반 확정(파랑)으로 원복했습니다.`);
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

  // 🔢 1~9 각 숫자의 현재 보드판 채워진 개수 계산 (남은 개수 및 완료 뱃지용)
  const numberCounts = React.useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = grid[r]?.[c];
        if (val >= 1 && val <= 9) {
          counts[val] = (counts[val] || 0) + 1;
        }
      }
    }
    return counts;
  }, [grid]);

  // 퍼즐 시작
  const handleStartGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setElapsedTime(0);
    setMarkedMask(Array(9).fill('none').map(() => Array(9).fill('none')));
    socket?.emit('sudoku-start', { room, difficulty: diff });
  };

  // 힌트 사용 (스마트 자동 셀 선택 지원)
  const handleUseHint = () => {
    if (phase !== 'playing' || completed) {
      setMessage('💡 먼저 상단 난이도를 선택하여 게임을 시작해 주세요!');
      return;
    }

    let targetCell = selectedCell;

    // 만약 선택된 셀이 없거나 이미 고정된 문제 셀이라면, 아직 숫자가 없는 빈 칸(0)을 자동으로 탐색하여 선택
    if (!targetCell || fixedMask[targetCell.r]?.[targetCell.c]) {
      let foundEmpty = false;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (!fixedMask[r][c] && grid[r][c] === 0) {
            targetCell = { r, c };
            foundEmpty = true;
            break;
          }
        }
        if (foundEmpty) break;
      }

      // 비어 있는 칸이 없다면 사용자가 입력한 칸 중 첫 번째 선택
      if (!foundEmpty) {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (!fixedMask[r][c]) {
              targetCell = { r, c };
              break;
            }
          }
          if (targetCell) break;
        }
      }
    }

    if (!targetCell) {
      setMessage('💡 힌트를 적용할 수 있는 칸이 없습니다.');
      return;
    }

    setSelectedCell(targetCell);
    socket?.emit('sudoku-hint', { room, row: targetCell.r, col: targetCell.c, username });
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

  const selectedCellMarkState: MarkColor = selectedCell ? (markedMask[selectedCell.r]?.[selectedCell.c] || 'none') : 'none';

  return (
    <div className="sudoku-container newspaper-theme">
      {/* 📰 모바일 전용 초슬림 일체형 상단바 (세로 공간 낭비 방지) */}
      <div className="sudoku-mobile-bar">
        <div className="mobile-bar-left">
          <span className="mobile-brand">📰 스도쿠</span>
          <select
            value={difficulty}
            onChange={(e) => handleStartGame(e.target.value as Difficulty)}
            className="mobile-diff-select"
          >
            {DIFFICULTY_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mobile-bar-center">
          {phase === 'playing' ? (
            <span className="mobile-timer">
              ⏱️ {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </span>
          ) : (
            <span className="mobile-status-badge">{completed ? '🎉 완성' : '대기'}</span>
          )}
        </div>
        <div className="mobile-bar-right">
          <button
            type="button"
            className="mobile-icon-btn"
            onClick={handleUseHint}
            disabled={phase !== 'playing' || completed}
            title="정답 힌트 자동 입력"
          >
            💡
          </button>
          <button
            type="button"
            className="mobile-icon-btn"
            onClick={handleReset}
            disabled={phase !== 'playing'}
            title="새판 리셋"
          >
            🔄
          </button>
          <button
            type="button"
            className="mobile-icon-btn"
            onClick={() => {
              setSelectedRankDiff(difficulty);
              setShowRankModal(true);
              socket?.emit('sudoku-get-rankings');
            }}
            title="명예의 전당 랭킹"
          >
            🏆
          </button>
          {onLeaveRoom && (
            <button
              type="button"
              className="mobile-icon-btn close-btn"
              onClick={onLeaveRoom}
              title="나가기"
            >
              🚪
            </button>
          )}
        </div>
      </div>

      {/* 📰 데스크톱 신문 제호 헤더 (Desktop Newspaper Masthead) */}
      <header className="newspaper-masthead">
        <div className="masthead-top-rule">
          <span className="masthead-issue-tag">THE DAILY PUZZLE GAZETTE</span>
          <span className="masthead-date-tag">{getNewspaperEditionDate()}</span>
          <span className="masthead-room-tag">ROOM #{room}</span>
        </div>
        <div className="masthead-main">
          <div className="masthead-decor-left">
            <span className="edition-badge">DAILY EDITION</span>
            <span className="edition-text">Logic & Number Grid</span>
          </div>
          <div className="masthead-title-box">
            <h1 className="newspaper-title">THE DAILY SUDOKU</h1>
            <p className="newspaper-tagline">“A sharp mind is forged in nine by nine squares.”</p>
          </div>
          <div className="masthead-decor-right">
            <div className="status-stamp">
              <span className="stamp-label">STATUS</span>
              <span className="stamp-val">{phase === 'waiting' ? '대기 중' : completed ? '완성됨' : '풀이 진행'}</span>
            </div>
            {onLeaveRoom && (
              <button onClick={onLeaveRoom} className="news-btn close-btn">
                🚪 나가기
              </button>
            )}
          </div>
        </div>
        <div className="masthead-bottom-rule">
          <div className="masthead-timer-box">
            ⏱️ 경과 시간: <b>{Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{(elapsedTime % 60).toString().padStart(2, '0')}</b>
          </div>
          <div className="masthead-rule-text">9×9 INK & PRINT GRID • VOL. 2026</div>
        </div>
      </header>

      {/* 📱 메인 워크스페이스 */}
      <div className="sudoku-main-workspace">
        {/* 🌿 데스크톱 난이도 리본 (Difficulty Bar) */}
        <div className="sudoku-diff-ribbon">
          <span className="ribbon-label">오늘의 퍼즐 난이도:</span>
          <div className="diff-btn-group">
            {DIFFICULTY_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`news-btn diff-btn ${difficulty === opt.key && phase === 'playing' ? 'active' : ''} ${opt.key}`}
                onClick={() => handleStartGame(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 🛠️ 데스크톱 주요 게임 도구 툴바 */}
        <div className="sudoku-main-toolbar">
          <div className="toolbar-left">
            <button
              className="news-btn ranking-btn"
              onClick={() => {
                setSelectedRankDiff(difficulty);
                setShowRankModal(true);
                socket?.emit('sudoku-get-rankings');
              }}
              title="난이도별 실시간 명예의 전당 랭킹 순위표를 확인합니다."
            >
              🏆 명예의 전당
            </button>
            <button
              className={`news-btn ${showNumpad ? 'active-toggle' : ''}`}
              onClick={() => setShowNumpad(!showNumpad)}
            >
              {showNumpad ? '🔢 숫자 패드 ON' : '🔢 숫자 패드 OFF'}
            </button>
          </div>
          <div className="toolbar-right">
            <button
              className="news-btn hint-btn"
              onClick={handleUseHint}
              disabled={phase !== 'playing' || completed}
              title={selectedCell ? '선택한 셀의 정답 힌트를 입력합니다.' : '빈 칸 중 하나를 자동으로 찾아 힌트를 입력합니다.'}
            >
              💡 힌트 사용
            </button>
            <button
              className="news-btn reset-btn"
              onClick={handleReset}
              disabled={phase !== 'playing'}
            >
              🔄 새판 리셋
            </button>
          </div>
        </div>

        {/* 🎯 3. 선택된 셀 빠른 색상(가설) 바 */}
        {selectedCell && !fixedMask[selectedCell.r]?.[selectedCell.c] && (
          <div className="sudoku-cell-context-bar">
            <span className="context-cell-name">
              📍 <b>Cell {String.fromCharCode(65 + selectedCell.c)}{selectedCell.r + 1}</b>
            </span>
            <span className="context-divider">|</span>
            <div className="context-color-btns">
              <button
                type="button"
                className={`cell-mode-chip normal ${selectedCellMarkState === 'none' ? 'active' : ''}`}
                onClick={() => {
                  setMarkedMask(prev => {
                    const next = prev.map(row => [...row]);
                    next[selectedCell.r][selectedCell.c] = 'none';
                    return next;
                  });
                }}
              >
                ✏️ 확정
              </button>
              <button
                type="button"
                className={`cell-mode-chip purple ${selectedCellMarkState === 'purple' ? 'active' : ''}`}
                onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c, 'purple')}
              >
                🟣 보라
              </button>
              <button
                type="button"
                className={`cell-mode-chip orange ${selectedCellMarkState === 'orange' ? 'active' : ''}`}
                onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c, 'orange')}
              >
                🟠 주황
              </button>
              <button
                type="button"
                className={`cell-mode-chip green ${selectedCellMarkState === 'green' ? 'active' : ''}`}
                onClick={() => toggleMarkCell(selectedCell.r, selectedCell.c, 'green')}
              >
                🟢 초록
              </button>
            </div>
            <span className="context-divider">|</span>
            <button
              type="button"
              className="cell-clear-quick-btn"
              onClick={() => handleNumberInput(0)}
              title="선택된 셀 지우기"
            >
              🧽 지우기
            </button>
          </div>
        )}

        {/* 🎨 4. 헷갈림(가설) 셀 전용 관리 패널 */}
        {totalMarkedCount > 0 && (
          <div className="sudoku-marked-manager-box">
            <div className="marked-manager-header">
              <span className="marked-manager-title">🎨 가설(색연필 마킹) 관리 (총 {totalMarkedCount}개)</span>
            </div>
            <div className="marked-manager-actions">
              <div className="marked-action-row">
                <span className="group-label">🗑️ 삭제:</span>
                <div className="group-btns">
                  {purpleCount > 0 && (
                    <button
                      type="button"
                      className="news-btn marked-purple-del-btn"
                      onClick={() => handleClearMarkedValues('purple')}
                    >
                      🟣 보라 ({purpleCount})
                    </button>
                  )}
                  {orangeCount > 0 && (
                    <button
                      type="button"
                      className="news-btn marked-orange-del-btn"
                      onClick={() => handleClearMarkedValues('orange')}
                    >
                      🟠 주황 ({orangeCount})
                    </button>
                  )}
                  {greenCount > 0 && (
                    <button
                      type="button"
                      className="news-btn marked-green-del-btn"
                      onClick={() => handleClearMarkedValues('green')}
                    >
                      🟢 초록 ({greenCount})
                    </button>
                  )}
                  <button
                    type="button"
                    className="news-btn marked-delete-btn"
                    onClick={() => handleClearMarkedValues('all')}
                  >
                    🗑️ 전체 삭제
                  </button>
                </div>
              </div>

              <div className="marked-action-row">
                <span className="group-label">✨ 확정:</span>
                <div className="group-btns">
                  {purpleCount > 0 && (
                    <button
                      type="button"
                      className="news-btn marked-purple-revert-btn"
                      onClick={() => handleClearMarks('purple')}
                    >
                      🟣 보라 ({purpleCount})
                    </button>
                  )}
                  {orangeCount > 0 && (
                    <button
                      type="button"
                      className="news-btn marked-orange-revert-btn"
                      onClick={() => handleClearMarks('orange')}
                    >
                      🟠 주황 ({orangeCount})
                    </button>
                  )}
                  {greenCount > 0 && (
                    <button
                      type="button"
                      className="news-btn marked-green-revert-btn"
                      onClick={() => handleClearMarks('green')}
                    >
                      🟢 초록 ({greenCount})
                    </button>
                  )}
                  <button
                    type="button"
                    className="news-btn marked-clear-btn"
                    onClick={() => handleClearMarks('all')}
                  >
                    🧹 전체 확정
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🎨 셀 구분 범례 (Legend) */}
        <div className="sudoku-legend-bar">
          <span className="legend-item fixed">
            <span className="legend-sample fixed">5</span> 문제(활자)
          </span>
          <span className="legend-item user">
            <span className="legend-sample user">7</span> 작성(연필)
          </span>
          <span className="legend-item marked-purple">
            <span className="legend-sample marked-purple">4</span> 보라
          </span>
          <span className="legend-item marked-orange">
            <span className="legend-sample marked-orange">8</span> 주황
          </span>
          <span className="legend-item marked-green">
            <span className="legend-sample marked-green">2</span> 초록
          </span>
          <span className="legend-item conflict">
            <span className="legend-sample conflict">3</span> 오류
          </span>
        </div>

        {/* 🧩 9x9 Sudoku Grid Table (Newspaper Print Grid) */}
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
                          ? '헷갈림1(보라색) 셀'
                          : markedMask[r][c] === 'orange'
                          ? '헷갈림2(주황색) 셀'
                          : markedMask[r][c] === 'green'
                          ? '헷갈림3(초록색) 셀'
                          : '클릭하여 선택'
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
            <h4>🎉 [호외] 스도쿠 퍼즐 완성!</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              축하합니다! [{winner}] 님이 신문 퍼즐을 훌륭히 풀어냈습니다! (소요시간: {elapsedTime}초)
            </p>
          </div>
        )}

        {/* 🎛️ Numpad Control Panel (신문 타자기/활자 스타일 키패드) */}
        {showNumpad && (
          <div className="sudoku-controls-panel">
            <div className="sudoku-card">
              <div className="numpad-header-row">
                <span className="numpad-title">📰 숫자 입력기</span>
                
                {/* 입력 모드 토글 */}
                <div className="input-mode-toggle-group">
                  <button
                    type="button"
                    className={`mode-toggle-btn ${inputMode === 'normal' ? 'active-normal' : ''}`}
                    onClick={() => setInputMode('normal')}
                    title="일반 확정 숫자 입력 모드"
                  >
                    ✏️ 확정
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${inputMode === 'purple' ? 'active-purple' : ''}`}
                    onClick={() => setInputMode('purple')}
                    title="헷갈림1 가설 숫자 입력 모드 (보라)"
                  >
                    🟣 보라
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${inputMode === 'orange' ? 'active-orange' : ''}`}
                    onClick={() => setInputMode('orange')}
                    title="헷갈림2 가설 숫자 입력 모드 (주황)"
                  >
                    🟠 주황
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${inputMode === 'green' ? 'active-green' : ''}`}
                    onClick={() => setInputMode('green')}
                    title="헷갈림3 가설 숫자 입력 모드 (초록)"
                  >
                    🟢 초록
                  </button>
                </div>
              </div>

              {/* 1~9 대형 숫자 그리드 */}
              <div className="numpad-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                  const placed = numberCounts[num] || 0;
                  const isAllPlaced = placed >= 9;
                  const remaining = Math.max(0, 9 - placed);

                  return (
                    <button
                      key={num}
                      type="button"
                      className={`numpad-btn ${inputMode === 'purple' ? 'purple-mode-btn' : inputMode === 'orange' ? 'orange-mode-btn' : inputMode === 'green' ? 'green-mode-btn' : ''} ${isAllPlaced ? 'is-completed' : ''}`}
                      onClick={() => handleNumberInput(num)}
                      disabled={completed}
                    >
                      <span className="numpad-num">{num}</span>
                      <span className={`numpad-count-badge ${isAllPlaced ? 'done' : ''}`}>
                        {isAllPlaced ? '✓' : remaining}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="numpad-action-row">
                <button
                  type="button"
                  className="news-btn numpad-clear-btn"
                  onClick={() => handleNumberInput(0)}
                  disabled={completed}
                  title="선택된 셀 지우기"
                >
                  🧽 셀 지우기
                </button>
                <button
                  type="button"
                  className="news-btn numpad-hint-btn"
                  onClick={handleUseHint}
                  disabled={phase !== 'playing' || completed}
                  title="정답 힌트 자동 입력"
                >
                  💡 힌트 사용
                </button>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="sudoku-message-notice">
            {message}
          </div>
        )}

        <div className="sudoku-guide-tip">
          <span>💡 <b>숫자 입력</b>: 가상패드 또는 키보드(1~9) | <b>지우기</b>: Backspace / 0</span>
          <span>🎨 <b>헷갈림 색상 (보라🟣 / 주황🟠 / 초록🟢)</b>: 🖱️ 우클릭/M키 | 📱 길게 누르기 | <b>일괄삭제</b>: Shift+Delete</span>
        </div>
      </div>

      {/* 📰 Bottom Newspaper Footer */}
      <footer className="newspaper-footer-bar">
        <span>📰 THE DAILY SUDOKU • PUZZLE SECTION</span>
        <button
          type="button"
          className="footer-rank-link"
          onClick={() => {
            setSelectedRankDiff(difficulty);
            setShowRankModal(true);
            socket?.emit('sudoku-get-rankings');
          }}
        >
          🏆 명예의 전당 순위표
        </button>
        <span>DAILY BRAIN TEASER • ALL RIGHTS RESERVED</span>
      </footer>

      {/* 🏆 실시간 명예의 전당 신문 모달 (Newspaper Gazette Edition) */}
      {showRankModal && (
        <div className="sudoku-rank-modal-backdrop" onClick={() => setShowRankModal(false)}>
          <div className="sudoku-rank-modal-card" onClick={e => e.stopPropagation()}>
            {/* Modal Title */}
            <div className="rank-modal-header">
              <div className="rank-title-group">
                <span className="rank-header-trophy">🏆</span>
                <div className="rank-title-text-box">
                  <h3>THE SUDOKU GAZETTE • HALL OF FAME</h3>
                  <span className="rank-subtitle">난이도별 타임어택 실시간 Top 10 순위표</span>
                </div>
              </div>
              <button
                className="news-btn close-btn rank-close-btn"
                onClick={() => setShowRankModal(false)}
              >
                ✕ 닫기
              </button>
            </div>

            {/* 난이도 탭 바 */}
            <div className="rank-diff-tabs">
              {DIFFICULTY_OPTIONS.map(tab => (
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

            {/* 랭킹 테이블 */}
            <div className="rank-table-wrapper">
              <table className="news-rank-table">
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
                            {entry.hintsUsed > 0 ? `${entry.hintsUsed}회` : <span style={{ color: '#27272a', fontWeight: 700 }}>노힌트 ✨</span>}
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
                          <p>아직 [{DIFFICULTY_OPTIONS.find(o => o.key === selectedRankDiff)?.short || selectedRankDiff}] 난이도에 등록된 랭커가 없습니다.</p>
                          <span>지금 퍼즐을 클리어하고 첫 1위 🥇의 주인공이 되어보세요!</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="rank-modal-footer">
              <span className="rank-status-ready">STATUS: LIVE_SYNCHRONIZED</span>
              <button
                className="news-btn primary"
                onClick={() => {
                  handleStartGame(selectedRankDiff);
                  setShowRankModal(false);
                }}
              >
                📰 이 난이도로 도전하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SudokuGame;
