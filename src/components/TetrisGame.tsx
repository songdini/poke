import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2, VolumeX, Trophy, Bot, Users, User,
  RotateCw, ArrowDown, ArrowLeft, ArrowRight,
  Zap, RefreshCw, LogOut, Play
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { tetrisAudio } from '../utils/tetrisAudio';
import {
  findBestMove,
  TETROMINO_SHAPES,
  TETROMINO_COLORS,
  GARBAGE_COLOR,
} from '../utils/tetrisAi';
import type {
  TetrominoType,
  TetrisItemType,
  TetrisCell,
  TetrisBoard,
  TetrisPiece,
  TetrisMode,
  TetrisRule,
  TetrisDifficulty,
  TetrisPhase,
  TetrisRankEntry,
  TetrisStats,
  OpponentState,
  ItemNotice
} from '../types/tetris';
import './TetrisGame.css';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const TETROMINOES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
const ITEM_TYPES: TetrisItemType[] = ['bomb', 'erase', 'smoke', 'speed', 'confusion', 'shield'];
const RANKING_STORAGE_KEY = 'tetris_high_scores_v1';

const ITEM_ICONS: Record<TetrisItemType, string> = {
  bomb: '💣',
  erase: '⚡',
  smoke: '🌫️',
  speed: '⏩',
  confusion: '🔄',
  shield: '🛡️'
};

const ITEM_NAMES: Record<TetrisItemType, string> = {
  bomb: '폭탄 (주변 파괴)',
  erase: '청소기 (바닥 정리)',
  smoke: '먹물 연막탄 (시야 차단)',
  speed: '스피드 가속 (급낙하)',
  confusion: '혼란 (조작 반전)',
  shield: '방어막 (공격 무효)'
};

function createEmptyBoard(): TetrisBoard {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null)
  );
}

// 7-Bag Randomizer
function generateBag(): TetrominoType[] {
  const bag = [...TETROMINOES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

interface TetrisGameProps {
  username: string;
  room?: string;
  onLeaveRoom?: () => void;
}

const TetrisGame: React.FC<TetrisGameProps> = ({ username, room = 'tetris-1', onLeaveRoom }) => {
  const { socket } = useSocket();

  // Mode & Rule States
  const [mode, setMode] = useState<TetrisMode>('single');
  const [rule, setRule] = useState<TetrisRule>('normal');
  const [difficulty, setDifficulty] = useState<TetrisDifficulty>('normal');
  const [phase, setPhase] = useState<TetrisPhase>('ready');
  const [isMuted, setIsMuted] = useState<boolean>(() => tetrisAudio.getMuted());

  // Player Stats
  const [stats, setStats] = useState<TetrisStats>({
    score: 0,
    lines: 0,
    level: 1,
    combo: -1,
    maxCombo: 0,
    attacksSent: 0,
    attacksReceived: 0,
  });

  // Boards & Pieces
  const [board, setBoard] = useState<TetrisBoard>(createEmptyBoard);
  const [currentPiece, setCurrentPiece] = useState<TetrisPiece | null>(null);
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [heldType, setHeldType] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);
  const [nextPieces, setNextPieces] = useState<TetrominoType[]>([]);
  const bagRef = useRef<TetrominoType[]>([]);

  // Attacks & Item Effects
  const [incomingAttack, setIncomingAttack] = useState<number>(0);
  const [hasShield, setHasShield] = useState<boolean>(false);
  const [isSmokeActive, setIsSmokeActive] = useState<boolean>(false);
  const [isSpeedActive, setIsSpeedActive] = useState<boolean>(false);
  const [isConfusionActive, setIsConfusionActive] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<ItemNotice | null>(null);

  // AI Opponent State
  const [aiBoard, setAiBoard] = useState<TetrisBoard>(createEmptyBoard);
  const [aiScore, setAiScore] = useState<number>(0);
  const [aiLines, setAiLines] = useState<number>(0);
  const [aiIncomingAttack, setAiIncomingAttack] = useState<number>(0);
  const aiBagRef = useRef<TetrominoType[]>([]);
  const aiNextPieceRef = useRef<TetrominoType>('T');

  // PvP State
  const [pvpPlayers, setPvpPlayers] = useState<Array<{ id: string; username: string; isReady: boolean }>>([]);
  const [pvpHostId, setPvpHostId] = useState<string>('');
  const [opponentState, setOpponentState] = useState<OpponentState | null>(null);
  const [pvpWinner, setPvpWinner] = useState<string | null>(null);

  // High Scores
  const [rankings, setRankings] = useState<TetrisRankEntry[]>(() => {
    try {
      const saved = localStorage.getItem(RANKING_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showRankings, setShowRankings] = useState<boolean>(false);

  // Notice helper
  const showNotice = useCallback((text: string, icon: string = '⚡', type: 'gain' | 'use' | 'hit' = 'gain') => {
    setActionNotice({ id: String(Date.now()), text, icon, type });
    setTimeout(() => setActionNotice(null), 2500);
  }, []);

  // Helper: Next Bag Piece
  const getNextPieceFromBag = useCallback((): TetrominoType => {
    if (bagRef.current.length === 0) {
      bagRef.current = generateBag();
    }
    return bagRef.current.shift()!;
  }, []);

  // Helper: Next Piece for AI
  const getAiPieceFromBag = useCallback((): TetrominoType => {
    if (aiBagRef.current.length === 0) {
      aiBagRef.current = generateBag();
    }
    return aiBagRef.current.shift()!;
  }, []);

  // Initialize Piece
  const spawnNewPiece = useCallback((type: TetrominoType): TetrisPiece => {
    const shape = TETROMINO_SHAPES[type][0];
    const x = Math.floor((BOARD_WIDTH - shape[0].length) / 2);
    const y = 0;

    let item: TetrisItemType | undefined = undefined;
    if (rule === 'item' && Math.random() < 0.35) {
      item = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    }

    return { type, shape, x, y, item };
  }, [rule]);

  // Collision Check
  const checkCollision = useCallback((shape: number[][], posX: number, posY: number, currentBoard: TetrisBoard): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const targetX = posX + c;
          const targetY = posY + r;
          if (targetX < 0 || targetX >= BOARD_WIDTH || targetY >= BOARD_HEIGHT) {
            return true;
          }
          if (targetY >= 0 && currentBoard[targetY][targetX] !== null) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // Ghost Piece Y calculation
  const getGhostY = useCallback((piece: TetrisPiece | null, currentBoard: TetrisBoard): number => {
    if (!piece) return 0;
    let ghostY = piece.y;
    while (!checkCollision(piece.shape, piece.x, ghostY + 1, currentBoard)) {
      ghostY++;
    }
    return ghostY;
  }, [checkCollision]);

  // Save High Score
  const saveHighScore = useCallback((finalScore: number, finalLines: number, finalLevel: number, finalMaxCombo: number) => {
    if (finalScore <= 0) return;
    const newEntry: TetrisRankEntry = {
      id: `${Date.now()}-${Math.random()}`,
      username: username || '플레이어',
      score: finalScore,
      lines: finalLines,
      level: finalLevel,
      maxCombo: finalMaxCombo,
      date: new Date().toLocaleDateString('ko-KR'),
      rule,
    };
    setRankings((prev) => {
      const updated = [...prev, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      try {
        localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [username, rule]);

  // Apply Garbage Lines to Player Board
  const applyGarbageLines = useCallback((linesCount: number) => {
    if (linesCount <= 0) return;
    tetrisAudio.playGarbageRise();

    setBoard((prev) => {
      const newBoard = prev.slice(linesCount);
      for (let i = 0; i < linesCount; i++) {
        const hole = Math.floor(Math.random() * BOARD_WIDTH);
        const garbageRow: (TetrisCell | null)[] = Array.from({ length: BOARD_WIDTH }, (_, colIdx) =>
          colIdx === hole ? null : { type: 'garbage' }
        );
        newBoard.push(garbageRow);
      }
      return newBoard;
    });
  }, []);

  // Apply Garbage Lines to AI Board
  const applyAiGarbageLines = useCallback((linesCount: number) => {
    if (linesCount <= 0) return;
    setAiBoard((prev) => {
      const newBoard = prev.slice(linesCount);
      for (let i = 0; i < linesCount; i++) {
        const hole = Math.floor(Math.random() * BOARD_WIDTH);
        const garbageRow: (TetrisCell | null)[] = Array.from({ length: BOARD_WIDTH }, (_, colIdx) =>
          colIdx === hole ? null : { type: 'garbage' }
        );
        newBoard.push(garbageRow);
      }
      return newBoard;
    });
  }, []);

  // Trigger Item Effect
  const handleTriggerItem = useCallback((item: TetrisItemType, source: 'player' | 'opponent') => {
    tetrisAudio.playItemUse();

    if (source === 'player') {
      showNotice(`내가 [${ITEM_NAMES[item]}] 아이템을 사용했습니다!`, ITEM_ICONS[item], 'use');

      if (item === 'bomb') {
        // Bomb: Clear random 3x3 filled area on own board
        setBoard((prev) => {
          const next = prev.map((row) => [...row]);
          const startR = Math.max(0, BOARD_HEIGHT - 6);
          const endR = BOARD_HEIGHT - 1;
          const startC = 2;
          const endC = BOARD_WIDTH - 3;
          for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
              next[r][c] = null;
            }
          }
          return next;
        });
      } else if (item === 'erase') {
        // Erase: Clear bottom 2 lines immediately
        setBoard((prev) => {
          const next = prev.slice(0, BOARD_HEIGHT - 2);
          while (next.length < BOARD_HEIGHT) {
            next.unshift(Array.from({ length: BOARD_WIDTH }, () => null));
          }
          return next;
        });
      } else if (item === 'shield') {
        setHasShield(true);
      } else if (item === 'smoke') {
        if (mode === 'ai') {
          showNotice('AI 화면에 연막을 투척했습니다!', '🌫️', 'gain');
        } else if (mode === 'pvp' && socket) {
          socket.emit('tetris-item-use', { room, item: 'smoke', username });
        }
      } else if (item === 'speed') {
        if (mode === 'pvp' && socket) {
          socket.emit('tetris-item-use', { room, item: 'speed', username });
        }
      } else if (item === 'confusion') {
        if (mode === 'pvp' && socket) {
          socket.emit('tetris-item-use', { room, item: 'confusion', username });
        }
      }
    } else {
      // Incoming debuff from opponent
      if (item === 'smoke') {
        showNotice('상대의 연막탄 공격! 4초간 시야가 가려집니다!', '🌫️', 'hit');
        setIsSmokeActive(true);
        setTimeout(() => setIsSmokeActive(false), 4000);
      } else if (item === 'speed') {
        showNotice('상대의 가속 공격! 낙하 속도가 3초간 폭증합니다!', '⏩', 'hit');
        setIsSpeedActive(true);
        setTimeout(() => setIsSpeedActive(false), 3500);
      } else if (item === 'confusion') {
        showNotice('상대의 혼란 공격! 4초간 좌우 조작이 반전됩니다!', '🔄', 'hit');
        setIsConfusionActive(true);
        setTimeout(() => setIsConfusionActive(false), 4000);
      }
    }
  }, [mode, room, showNotice, socket, username]);

  // Lock Current Piece and Check Line Clears
  const lockPiece = useCallback((pieceToLock: TetrisPiece) => {
    tetrisAudio.playHardDrop();

    let newBoard: TetrisBoard = [];
    let itemsFound: TetrisItemType[] = [];

    setBoard((prev) => {
      const next = prev.map((row) => [...row]);
      for (let r = 0; r < pieceToLock.shape.length; r++) {
        for (let c = 0; c < pieceToLock.shape[r].length; c++) {
          if (pieceToLock.shape[r][c]) {
            const targetY = pieceToLock.y + r;
            const targetX = pieceToLock.x + c;
            if (targetY >= 0 && targetY < BOARD_HEIGHT && targetX >= 0 && targetX < BOARD_WIDTH) {
              next[targetY][targetX] = {
                type: pieceToLock.type,
                item: pieceToLock.item,
              };
            }
          }
        }
      }

      // Check Cleared Lines
      const remainingRows: TetrisBoard = [];
      let clearedCount = 0;

      for (let r = 0; r < BOARD_HEIGHT; r++) {
        if (next[r].every((cell) => cell !== null)) {
          clearedCount++;
          // Collect items from cleared row
          next[r].forEach((cell) => {
            if (cell?.item) {
              itemsFound.push(cell.item);
            }
          });
        } else {
          remainingRows.push(next[r]);
        }
      }

      // Fill top rows with empty cells
      while (remainingRows.length < BOARD_HEIGHT) {
        remainingRows.unshift(Array.from({ length: BOARD_WIDTH }, () => null));
      }

      newBoard = remainingRows;

      // Scoring & Stats Update
      if (clearedCount > 0) {
        tetrisAudio.playLineClear(clearedCount);

        setStats((s) => {
          const combo = s.combo + 1;
          const maxCombo = Math.max(s.maxCombo, combo);
          const baseScores = [0, 100, 300, 500, 800];
          const addedScore = (baseScores[clearedCount] || 800) * s.level + combo * 50 * s.level;
          const totalLines = s.lines + clearedCount;
          const newLevel = Math.floor(totalLines / 10) + 1;

          // ⚔️ Attack Mechanics (한 줄 클리어할 때마다 상대 공격 및 상쇄)
          if (mode === 'ai' || mode === 'pvp') {
            // Line attack: 1 line = 1 attack, 2 = 2, 3 = 3, 4 = 4 + combo bonus
            let attackLines = clearedCount + (combo > 1 ? combo - 1 : 0);

            // Counter incoming attack first if any
            setIncomingAttack((currentIncoming) => {
              if (currentIncoming > 0) {
                if (attackLines <= currentIncoming) {
                  const remainingIncoming = currentIncoming - attackLines;
                  showNotice(`방어 성공! 공격 ${attackLines}줄을 상쇄했습니다!`, '🛡️', 'use');
                  return remainingIncoming;
                } else {
                  const excessAttack = attackLines - currentIncoming;
                  showNotice(`상쇄 후 ${excessAttack}줄 반격 발사!`, '⚔️', 'use');
                  // Send excess attack to opponent
                  if (mode === 'ai') {
                    setAiIncomingAttack((aiIn) => aiIn + excessAttack);
                  } else if (mode === 'pvp' && socket) {
                    socket.emit('tetris-attack', { room, lines: excessAttack, combo, username });
                  }
                  return 0;
                }
              } else {
                // No incoming attack: Direct attack to opponent
                tetrisAudio.playAttack();
                if (mode === 'ai') {
                  setAiIncomingAttack((aiIn) => aiIn + attackLines);
                  showNotice(`AI에게 ${attackLines}줄 공격을 날렸습니다!`, '💥', 'use');
                } else if (mode === 'pvp' && socket) {
                  socket.emit('tetris-attack', { room, lines: attackLines, combo, username });
                  showNotice(`상대에게 ${attackLines}줄 공격을 날렸습니다!`, '💥', 'use');
                }
                return 0;
              }
            });
          }

          return {
            ...s,
            score: s.score + addedScore,
            lines: totalLines,
            level: newLevel,
            combo,
            maxCombo,
          };
        });
      } else {
        // Reset combo if no line cleared
        setStats((s) => ({ ...s, combo: -1 }));

        // If not cleared and there's incoming attack, push garbage up now!
        setIncomingAttack((inCount) => {
          if (inCount > 0) {
            if (hasShield) {
              showNotice('방어막이 공격을 완벽히 흡수했습니다!', '🛡️', 'gain');
              setHasShield(false);
            } else {
              applyGarbageLines(inCount);
            }
            return 0;
          }
          return 0;
        });
      }

      return newBoard;
    });

    // Trigger items if found
    itemsFound.forEach((itm) => {
      handleTriggerItem(itm, 'player');
    });

    // Spawn Next Piece
    setNextPieces((currentNext) => {
      const nextQueue = [...currentNext];
      const spawnedType = nextQueue.shift() || getNextPieceFromBag();
      while (nextQueue.length < 3) {
        nextQueue.push(getNextPieceFromBag());
      }

      const nextPiece = spawnNewPiece(spawnedType);

      // Check Game Over (Spawn collision)
      if (checkCollision(nextPiece.shape, nextPiece.x, nextPiece.y, newBoard)) {
        tetrisAudio.playGameOver();
        setPhase('gameover');
        saveHighScore(stats.score, stats.lines, stats.level, stats.maxCombo);

        if (mode === 'pvp' && socket) {
          socket.emit('tetris-gameover', { room, username });
        }
        return nextQueue;
      }

      setCurrentPiece(nextPiece);
      setCurrentRotation(0);
      setCanHold(true);
      return nextQueue;
    });

    // Sync board in PvP
    if (mode === 'pvp' && socket) {
      socket.emit('tetris-board-update', {
        room,
        board: newBoard.map((row) => row.map((cell) => cell ? cell.type : null)),
        score: stats.score,
        lines: stats.lines,
        level: stats.level,
      });
    }
  }, [
    applyGarbageLines,
    checkCollision,
    getNextPieceFromBag,
    handleTriggerItem,
    hasShield,
    mode,
    room,
    saveHighScore,
    showNotice,
    socket,
    spawnNewPiece,
    stats.level,
    stats.lines,
    stats.maxCombo,
    stats.score,
    username
  ]);

  // Rotate Piece with Wall Kick
  const rotatePiece = useCallback(() => {
    if (!currentPiece || phase !== 'playing') return;

    const nextRot = (currentRotation + 1) % 4;
    const nextShape = TETROMINO_SHAPES[currentPiece.type][nextRot];

    // Wall Kick Offsets: (dx, dy)
    const kickOffsets = [
      [0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]
    ];

    for (const [dx, dy] of kickOffsets) {
      const targetX = currentPiece.x + dx;
      const targetY = currentPiece.y + dy;
      if (!checkCollision(nextShape, targetX, targetY, board)) {
        setCurrentRotation(nextRot);
        setCurrentPiece({
          ...currentPiece,
          shape: nextShape,
          x: targetX,
          y: targetY,
        });
        tetrisAudio.playRotate();
        return;
      }
    }
  }, [board, checkCollision, currentPiece, currentRotation, phase]);

  // Move Piece Left/Right
  const movePiece = useCallback((dx: number) => {
    if (!currentPiece || phase !== 'playing') return;

    // Confusion debuff flips direction
    const actualDx = isConfusionActive ? -dx : dx;

    if (!checkCollision(currentPiece.shape, currentPiece.x + actualDx, currentPiece.y, board)) {
      setCurrentPiece({
        ...currentPiece,
        x: currentPiece.x + actualDx,
      });
      tetrisAudio.playMove();
    }
  }, [board, checkCollision, currentPiece, isConfusionActive, phase]);

  // Soft Drop
  const softDrop = useCallback(() => {
    if (!currentPiece || phase !== 'playing') return;

    if (!checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y + 1, board)) {
      setCurrentPiece({
        ...currentPiece,
        y: currentPiece.y + 1,
      });
      tetrisAudio.playSoftDrop();
      setStats((s) => ({ ...s, score: s.score + 1 }));
    } else {
      lockPiece(currentPiece);
    }
  }, [board, checkCollision, currentPiece, lockPiece, phase]);

  // Hard Drop
  const hardDrop = useCallback(() => {
    if (!currentPiece || phase !== 'playing') return;

    const dropY = getGhostY(currentPiece, board);
    const dropDistance = dropY - currentPiece.y;
    setStats((s) => ({ ...s, score: s.score + dropDistance * 2 }));

    const droppedPiece = { ...currentPiece, y: dropY };
    lockPiece(droppedPiece);
  }, [board, currentPiece, getGhostY, lockPiece, phase]);

  // Hold Piece
  const holdPiece = useCallback(() => {
    if (!currentPiece || !canHold || phase !== 'playing') return;

    tetrisAudio.playHold();
    setCanHold(false);

    if (heldType === null) {
      setHeldType(currentPiece.type);
      setNextPieces((currentNext) => {
        const nextQueue = [...currentNext];
        const spawnedType = nextQueue.shift() || getNextPieceFromBag();
        while (nextQueue.length < 3) {
          nextQueue.push(getNextPieceFromBag());
        }
        setCurrentPiece(spawnNewPiece(spawnedType));
        setCurrentRotation(0);
        return nextQueue;
      });
    } else {
      const prevHeld = heldType;
      setHeldType(currentPiece.type);
      setCurrentPiece(spawnNewPiece(prevHeld));
      setCurrentRotation(0);
    }
  }, [canHold, currentPiece, getNextPieceFromBag, heldType, phase, spawnNewPiece]);

  // Start / Reset Game
  const startNewGame = useCallback(() => {
    bagRef.current = generateBag();
    const initialQueue: TetrominoType[] = [];
    while (initialQueue.length < 3) {
      initialQueue.push(bagRef.current.shift() || 'I');
    }

    const firstPieceType = bagRef.current.shift() || 'O';
    const firstPiece = spawnNewPiece(firstPieceType);

    setBoard(createEmptyBoard());
    setCurrentPiece(firstPiece);
    setCurrentRotation(0);
    setHeldType(null);
    setCanHold(true);
    setNextPieces(initialQueue);
    setIncomingAttack(0);
    setHasShield(false);
    setIsSmokeActive(false);
    setIsSpeedActive(false);
    setIsConfusionActive(false);

    setStats({
      score: 0,
      lines: 0,
      level: 1,
      combo: -1,
      maxCombo: 0,
      attacksSent: 0,
      attacksReceived: 0,
    });

    if (mode === 'ai') {
      aiBagRef.current = generateBag();
      aiNextPieceRef.current = aiBagRef.current.shift() || 'T';
      setAiBoard(createEmptyBoard());
      setAiScore(0);
      setAiLines(0);
      setAiIncomingAttack(0);
    }

    setPhase('playing');
  }, [mode, spawnNewPiece]);

  // Drop Tick Timer
  useEffect(() => {
    if (phase !== 'playing') return;

    let baseSpeed = Math.max(100, 800 - (stats.level - 1) * 70);
    if (isSpeedActive) {
      baseSpeed = Math.max(80, Math.floor(baseSpeed / 3));
    }

    const interval = setInterval(() => {
      softDrop();
    }, baseSpeed);

    return () => clearInterval(interval);
  }, [isSpeedActive, phase, softDrop, stats.level]);

  // AI Game Loop (Runs in 'ai' mode)
  useEffect(() => {
    if (mode !== 'ai' || phase !== 'playing') return;

    const delay = difficulty === 'easy' ? 850 : difficulty === 'normal' ? 450 : 200;

    const aiInterval = setInterval(() => {
      setAiBoard((prevAiBoard) => {
        // AI handles incoming attacks
        let currentBoard = prevAiBoard;
        if (aiIncomingAttack > 0) {
          applyAiGarbageLines(aiIncomingAttack);
          setAiIncomingAttack(0);
          return prevAiBoard;
        }

        const currentAiPieceType = aiNextPieceRef.current;
        aiNextPieceRef.current = getAiPieceFromBag();

        const bestMove = findBestMove(currentAiPieceType, currentBoard, difficulty);
        const rotations = TETROMINO_SHAPES[currentAiPieceType];
        const shape = rotations[bestMove.rotation % rotations.length];

        // Drop to bottom
        let dropY = 0;
        while (dropY < BOARD_HEIGHT) {
          let collided = false;
          for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
              if (shape[r][c]) {
                const ty = dropY + 1 + r;
                const tx = bestMove.x + c;
                if (ty >= BOARD_HEIGHT || (ty >= 0 && tx >= 0 && tx < BOARD_WIDTH && currentBoard[ty][tx] !== null)) {
                  collided = true;
                  break;
                }
              }
            }
            if (collided) break;
          }
          if (collided) break;
          dropY++;
        }

        // Place on board
        const nextBoard = currentBoard.map((row) => [...row]);
        let toppedOut = false;

        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              const ty = dropY + r;
              const tx = bestMove.x + c;
              if (ty < 0 || ty >= BOARD_HEIGHT || tx < 0 || tx >= BOARD_WIDTH || nextBoard[ty][tx] !== null) {
                toppedOut = true;
              } else {
                nextBoard[ty][tx] = { type: currentAiPieceType };
              }
            }
          }
        }

        if (toppedOut) {
          // AI Tops Out: Player Wins!
          tetrisAudio.playVictory();
          setPhase('victory');
          showNotice('🎉 AI를 격파했습니다! 승리!', '🏆', 'gain');
          return prevAiBoard;
        }

        // Check AI lines cleared
        let cleared = 0;
        const remainingRows: TetrisBoard = [];
        for (let r = 0; r < BOARD_HEIGHT; r++) {
          if (nextBoard[r].every((cell) => cell !== null)) {
            cleared++;
          } else {
            remainingRows.push(nextBoard[r]);
          }
        }

        while (remainingRows.length < BOARD_HEIGHT) {
          remainingRows.unshift(Array.from({ length: BOARD_WIDTH }, () => null));
        }

        if (cleared > 0) {
          setAiLines((l) => l + cleared);
          setAiScore((sc) => sc + cleared * 200);

          // 🤖 AI attacks Player!
          setIncomingAttack((inCount) => {
            showNotice(`🤖 AI가 ${cleared}줄 공격을 퍼부었습니다!`, '⚠️', 'hit');
            return inCount + cleared;
          });
        }

        return remainingRows;
      });
    }, delay);

    return () => clearInterval(aiInterval);
  }, [
    aiIncomingAttack,
    applyAiGarbageLines,
    difficulty,
    getAiPieceFromBag,
    mode,
    phase,
    showNotice
  ]);

  // PvP Socket Listeners
  useEffect(() => {
    if (mode !== 'pvp' || !socket) return;

    socket.emit('tetris-join', { room, username, rule });

    const handleUpdate = (data: {
      players?: Array<{ id: string; username: string; isReady: boolean }>;
      hostId?: string;
      rule?: TetrisRule;
      phase?: TetrisPhase;
      winner?: string | null;
      message?: string;
    }) => {
      if (data.players) setPvpPlayers(data.players);
      if (data.hostId) setPvpHostId(data.hostId);
      if (data.rule) setRule(data.rule);
      if (data.message) showNotice(data.message, '📢', 'gain');
    };

    const handleStart = () => {
      startNewGame();
    };

    const handleOpponentBoard = (data: {
      senderId: string;
      board: (string | null)[][];
      score: number;
      lines: number;
      level: number;
    }) => {
      setOpponentState({
        board: data.board,
        score: data.score,
        lines: data.lines,
        level: data.level,
        isAlive: true,
        incomingAttack: 0,
      });
    };

    const handleOpponentAttack = (data: { lines: number; senderUsername: string }) => {
      showNotice(`⚔️ [${data.senderUsername}]님이 ${data.lines}줄을 공격했습니다!`, '💥', 'hit');
      setIncomingAttack((prev) => prev + data.lines);
    };

    const handleItemEffect = (data: { item: TetrisItemType; senderUsername: string; senderId: string }) => {
      if (data.senderId !== socket.id) {
        handleTriggerItem(data.item, 'opponent');
      }
    };

    const handleGameOver = (data: { winner: string | null; message: string }) => {
      if (data.winner === username) {
        tetrisAudio.playVictory();
        setPhase('victory');
        setPvpWinner(username);
      } else {
        tetrisAudio.playGameOver();
        setPhase('gameover');
        setPvpWinner(data.winner);
      }
      showNotice(data.message, '🏆', 'gain');
    };

    socket.on('tetris-update', handleUpdate);
    socket.on('tetris-start', handleStart);
    socket.on('tetris-opponent-board', handleOpponentBoard);
    socket.on('tetris-opponent-attack', handleOpponentAttack);
    socket.on('tetris-item-effect', handleItemEffect);
    socket.on('tetris-gameover', handleGameOver);

    return () => {
      socket.emit('tetris-leave', { room, username });
      socket.off('tetris-update', handleUpdate);
      socket.off('tetris-start', handleStart);
      socket.off('tetris-opponent-board', handleOpponentBoard);
      socket.off('tetris-opponent-attack', handleOpponentAttack);
      socket.off('tetris-item-effect', handleItemEffect);
      socket.off('tetris-gameover', handleGameOver);
    };
  }, [handleTriggerItem, mode, room, rule, showNotice, socket, startNewGame, username]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        movePiece(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        movePiece(1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        softDrop();
      } else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        rotatePiece();
      } else if (e.key === ' ') {
        e.preventDefault();
        hardDrop();
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'Shift') {
        e.preventDefault();
        holdPiece();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hardDrop, holdPiece, movePiece, phase, rotatePiece, softDrop]);

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = tetrisAudio.toggleMute();
    setIsMuted(nextMuted);
  };

  // Toggle Rule (Normal vs Item)
  const handleSelectRule = (newRule: TetrisRule) => {
    if (phase === 'playing') return;
    setRule(newRule);
    if (mode === 'pvp' && socket) {
      socket.emit('tetris-set-rule', { room, rule: newRule });
    }
  };

  // Render Cell color helper
  const getCellColor = (type: TetrominoType | 'garbage'): string => {
    if (type === 'garbage') return GARBAGE_COLOR;
    return TETROMINO_COLORS[type] || '#64748b';
  };

  // Render Mini Matrix for Next / Hold preview
  const renderMiniShape = (type: TetrominoType | null) => {
    if (!type) {
      return (
        <div className="side-mini-grid">
          {Array.from({ length: 16 }).map((_, idx) => (
            <div key={idx} className="mini-cell" />
          ))}
        </div>
      );
    }
    const shape = TETROMINO_SHAPES[type][0];
    const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));

    // Center in 4x4
    const offsetR = Math.floor((4 - shape.length) / 2);
    const offsetC = Math.floor((4 - shape[0].length) / 2);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          grid[offsetR + r][offsetC + c] = 1;
        }
      }
    }

    return (
      <div className="side-mini-grid">
        {grid.flatMap((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              className="mini-cell"
              style={{
                backgroundColor: val ? TETROMINO_COLORS[type] : 'transparent',
                border: val ? '1px solid rgba(255,255,255,0.4)' : 'none',
              }}
            />
          ))
        )}
      </div>
    );
  };

  // Ghost Piece positions
  const ghostY = getGhostY(currentPiece, board);

  return (
    <div className="tetris-container">
      {/* 🚀 Top Header */}
      <div className="tetris-header">
        <div className="tetris-title-area">
          <span className="tetris-logo">🧱</span>
          <h2 className="tetris-title">포켓 테트리스</h2>
          <span className="tetris-badge">CYBER BATTLE</span>
        </div>

        <div className="tetris-controls-header">
          <button className="tetris-btn-icon" onClick={handleToggleMute} title="사운드 음소거/켜기">
            {isMuted ? <VolumeX size={16} color="#f87171" /> : <Volume2 size={16} color="#4ade80" />}
            <span>{isMuted ? '음소거' : '사운드 ON'}</span>
          </button>

          <button
            className="tetris-btn-icon"
            onClick={() => setShowRankings((prev) => !prev)}
            title="명예의 전당 랭킹 보기"
          >
            <Trophy size={16} color="#facc15" />
            <span>랭킹</span>
          </button>

          {onLeaveRoom && (
            <button className="tetris-btn-icon tetris-btn-leave" onClick={onLeaveRoom} title="나가기">
              <LogOut size={16} />
              <span>나가기</span>
            </button>
          )}
        </div>
      </div>

      {/* 🎮 Mode Selection Tabs */}
      <div className="tetris-mode-bar">
        <button
          className={`tetris-tab-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => { if (phase !== 'playing') { setMode('single'); setPhase('ready'); } }}
        >
          <User size={16} />
          점수 기록 모드
        </button>

        <button
          className={`tetris-tab-btn ${mode === 'ai' ? 'active' : ''}`}
          onClick={() => { if (phase !== 'playing') { setMode('ai'); setPhase('ready'); } }}
        >
          <Bot size={16} />
          AI 대전 모드
        </button>

        <button
          className={`tetris-tab-btn ${mode === 'pvp' ? 'active' : ''}`}
          onClick={() => { if (phase !== 'playing') { setMode('pvp'); setPhase('ready'); } }}
        >
          <Users size={16} />
          친구와 대전 모드
        </button>
      </div>

      {/* ⚙️ Sub Rule & Options Bar */}
      <div className="tetris-sub-bar">
        <div className="rule-toggle-group">
          <button
            className={`rule-btn ${rule === 'normal' ? 'active' : ''}`}
            onClick={() => handleSelectRule('normal')}
          >
            ⚔️ 일반 모드
          </button>
          <button
            className={`rule-btn ${rule === 'item' ? 'active' : ''}`}
            onClick={() => handleSelectRule('item')}
          >
            🎁 아이템전
          </button>
        </div>

        {mode === 'ai' && (
          <select
            className="difficulty-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as TetrisDifficulty)}
            disabled={phase === 'playing'}
          >
            <option value="easy">AI 난이도: 쉬움 (Easy)</option>
            <option value="normal">AI 난이도: 보통 (Normal)</option>
            <option value="hard">AI 난이도: 어려움 (Hard)</option>
          </select>
        )}
      </div>

      {/* 💥 Action Notice Pop */}
      {actionNotice && (
        <div className="action-banner">
          <span>{actionNotice.icon} {actionNotice.text}</span>
        </div>
      )}

      {/* 🏆 High Score Ranking Panel */}
      {showRankings && (
        <div className="tetris-rankings-panel">
          <div className="ranking-title">
            <Trophy size={16} color="#facc15" />
            <span>명예의 전당 (Top 10 최고 기록)</span>
          </div>
          {rankings.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '10px' }}>
              아직 기록된 랭킹이 없습니다. 1등에 도전해보세요!
            </div>
          ) : (
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>플레이어</th>
                  <th>점수</th>
                  <th>라인</th>
                  <th>최대콤보</th>
                  <th>날짜</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((rk, idx) => (
                  <tr key={rk.id}>
                    <td className={`rank-badge-${idx + 1}`}>{idx + 1}위</td>
                    <td>{rk.username}</td>
                    <td style={{ color: '#38bdf8', fontWeight: 'bold' }}>{rk.score.toLocaleString()}</td>
                    <td>{rk.lines}</td>
                    <td>{rk.maxCombo > 0 ? `${rk.maxCombo} Combo` : '-'}</td>
                    <td style={{ color: '#64748b' }}>{rk.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 🥊 Main Arena (Player Board + Opponent Board) */}
      <div className="tetris-arena">
        {/* Left Side Panel: Player Main Arena */}
        <div className="tetris-player-panel">
          {/* Left Column: HOLD & Stats */}
          <div className="tetris-side-col">
            <div className="side-box">
              <div className="side-title">HOLD (C)</div>
              {renderMiniShape(heldType)}
            </div>

            <div className="side-box">
              <div className="side-title">SCORE</div>
              <div className="side-stat-value">{stats.score.toLocaleString()}</div>
            </div>

            <div className="side-box">
              <div className="side-title">LINES</div>
              <div className="side-stat-value">{stats.lines}</div>
            </div>

            <div className="side-box">
              <div className="side-title">LEVEL</div>
              <div className="side-stat-value">{stats.level}</div>
            </div>

            {stats.combo > 0 && (
              <div className="side-box" style={{ borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)' }}>
                <div className="side-title" style={{ color: '#fbbf24' }}>COMBO</div>
                <div className="side-stat-value" style={{ color: '#fbbf24' }}>{stats.combo}x</div>
              </div>
            )}

            {hasShield && (
              <div className="side-box" style={{ borderColor: '#3b82f6', background: 'rgba(59, 130, 246, 0.2)' }}>
                <div className="side-title" style={{ color: '#60a5fa' }}>SHIELD</div>
                <div style={{ fontSize: '1.2rem' }}>🛡️</div>
              </div>
            )}
          </div>

          {/* Center Column: Garbage Warning Meter + 10x20 Main Matrix */}
          <div className="tetris-board-col">
            {/* Incoming Garbage Bar */}
            <div className="garbage-meter-wrapper" title={`받을 공격: ${incomingAttack}줄`}>
              <div
                className="garbage-meter-fill"
                style={{ height: `${Math.min(100, incomingAttack * 5)}%` }}
              />
            </div>

            {/* Matrix */}
            <div className="tetris-matrix">
              {/* Smoke effect */}
              {isSmokeActive && (
                <div className="smoke-overlay">
                  <span style={{ fontSize: '2rem' }}>🌫️</span>
                  <span className="smoke-text">연막 시야 차단!</span>
                </div>
              )}

              {/* Ready / Game Over / Victory Overlay */}
              {phase === 'ready' && (
                <div className="matrix-overlay">
                  <div className="overlay-title">준비 완료</div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 8px 0' }}>
                    {mode === 'single' && '점수 기록 마라톤에 도전하세요!'}
                    {mode === 'ai' && `AI (${difficulty.toUpperCase()}) 대전`}
                    {mode === 'pvp' && `친구 1:1 대전 [방: ${room}]`}
                  </p>

                  {mode === 'pvp' && (
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: '4px 0 10px 0', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', width: '85%' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>대기실 참가자 ({pvpPlayers.length}/2)</div>
                      {pvpPlayers.length === 0 ? (
                        <div style={{ color: '#94a3b8' }}>접속 중...</div>
                      ) : (
                        pvpPlayers.map((p) => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{p.id === pvpHostId ? '👑 ' : '👤 '}{p.username}</span>
                            <span style={{ color: p.isReady ? '#4ade80' : '#f59e0b' }}>
                              {p.id === pvpHostId ? '방장' : p.isReady ? '준비완료' : '대기중'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {mode === 'pvp' ? (
                    socket && socket.id === pvpHostId ? (
                      <button
                        className="overlay-btn"
                        onClick={() => socket.emit('tetris-start', { room })}
                      >
                        <Play size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                        게임 시작 (방장)
                      </button>
                    ) : (
                      <button
                        className="overlay-btn"
                        onClick={() => socket?.emit('tetris-ready', { room })}
                      >
                        <Play size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                        준비 완료 / 취소
                      </button>
                    )
                  ) : (
                    <button className="overlay-btn" onClick={startNewGame}>
                      <Play size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      게임 시작
                    </button>
                  )}
                </div>
              )}

              {phase === 'gameover' && (
                <div className="matrix-overlay">
                  <div className="overlay-title loss">GAME OVER</div>
                  {mode === 'pvp' && pvpWinner && (
                    <div style={{ fontSize: '0.85rem', color: '#facc15', marginBottom: '6px' }}>
                      🏆 승자: {pvpWinner}
                    </div>
                  )}
                  <div style={{ fontSize: '0.9rem', color: '#fca5a5', marginBottom: '8px' }}>
                    최종 점수: {stats.score.toLocaleString()}점 ({stats.lines}줄)
                  </div>
                  <button
                    className="overlay-btn"
                    onClick={() => {
                      if (mode === 'pvp' && socket) {
                        socket.emit('tetris-rematch', { room });
                        setPhase('ready');
                      } else {
                        startNewGame();
                      }
                    }}
                  >
                    <RefreshCw size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    {mode === 'pvp' ? '재경기 요청' : '다시 도전'}
                  </button>
                </div>
              )}

              {phase === 'victory' && (
                <div className="matrix-overlay">
                  <div className="overlay-title win">🏆 VICTORY!</div>
                  {mode === 'pvp' && pvpWinner && (
                    <div style={{ fontSize: '0.85rem', color: '#facc15', marginBottom: '6px' }}>
                      우승: {pvpWinner}
                    </div>
                  )}
                  <div style={{ fontSize: '0.9rem', color: '#86efac', marginBottom: '8px' }}>
                    대결에서 완승을 거두었습니다!
                  </div>
                  <button
                    className="overlay-btn"
                    onClick={() => {
                      if (mode === 'pvp' && socket) {
                        socket.emit('tetris-rematch', { room });
                        setPhase('ready');
                      } else {
                        startNewGame();
                      }
                    }}
                  >
                    <RefreshCw size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    {mode === 'pvp' ? '새 경기 요청' : '새 경기 시작'}
                  </button>
                </div>
              )}

              {/* Grid 20 rows x 10 cols */}
              {board.map((row, r) =>
                row.map((cell, c) => {
                  let isCurrent = false;
                  let isGhost = false;
                  let itemIcon: string | null = null;
                  let cellColor = cell ? getCellColor(cell.type) : undefined;

                  // Active piece check
                  if (currentPiece) {
                    const pr = r - currentPiece.y;
                    const pc = c - currentPiece.x;
                    if (
                      pr >= 0 &&
                      pr < currentPiece.shape.length &&
                      pc >= 0 &&
                      pc < currentPiece.shape[pr].length &&
                      currentPiece.shape[pr][pc]
                    ) {
                      isCurrent = true;
                      cellColor = TETROMINO_COLORS[currentPiece.type];
                      if (currentPiece.item && pr === 0 && pc === 0) {
                        itemIcon = ITEM_ICONS[currentPiece.item];
                      }
                    }

                    // Ghost piece check
                    if (!isCurrent) {
                      const gr = r - ghostY;
                      if (
                        gr >= 0 &&
                        gr < currentPiece.shape.length &&
                        pc >= 0 &&
                        pc < currentPiece.shape[gr].length &&
                        currentPiece.shape[gr][pc]
                      ) {
                        isGhost = true;
                      }
                    }
                  }

                  // Existing cell item
                  if (cell?.item) {
                    itemIcon = ITEM_ICONS[cell.item];
                  }

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`tetris-cell ${cell || isCurrent ? 'filled' : ''} ${isGhost ? 'ghost' : ''} ${cell?.type === 'garbage' ? 'garbage' : ''}`}
                      style={{
                        backgroundColor: isCurrent || cell ? cellColor : undefined,
                      }}
                    >
                      {itemIcon && <span className="cell-item-badge">{itemIcon}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: NEXT (3 Pieces) */}
          <div className="tetris-side-col">
            <div className="side-box">
              <div className="side-title">NEXT 1</div>
              {renderMiniShape(nextPieces[0] || null)}
            </div>

            <div className="side-box">
              <div className="side-title">NEXT 2</div>
              {renderMiniShape(nextPieces[1] || null)}
            </div>

            <div className="side-box">
              <div className="side-title">NEXT 3</div>
              {renderMiniShape(nextPieces[2] || null)}
            </div>
          </div>
        </div>

        {/* 🤖 Right Side: Opponent Panel (AI or PvP Friend) */}
        {(mode === 'ai' || mode === 'pvp') && (
          <div className="tetris-opponent-panel">
            <div className="opponent-header">
              {mode === 'ai' ? <Bot size={16} color="#60a5fa" /> : <Users size={16} color="#f43f5e" />}
              <span>{mode === 'ai' ? `AI (${difficulty.toUpperCase()})` : '상대 플레이어'}</span>
            </div>

            <div className="opponent-matrix">
              {mode === 'ai'
                ? aiBoard.map((row, r) =>
                    row.map((cell, c) => (
                      <div
                        key={`ai-${r}-${c}`}
                        className={`opponent-cell ${cell ? 'filled' : ''}`}
                        style={{
                          backgroundColor: cell
                            ? cell.type === 'garbage'
                              ? GARBAGE_COLOR
                              : TETROMINO_COLORS[cell.type as TetrominoType]
                            : undefined,
                        }}
                      />
                    ))
                  )
                : opponentState?.board
                ? opponentState.board.map((row, r) =>
                    row.map((cellType, c) => (
                      <div
                        key={`opp-${r}-${c}`}
                        className={`opponent-cell ${cellType ? 'filled' : ''}`}
                        style={{
                          backgroundColor: cellType
                            ? cellType === 'garbage'
                              ? GARBAGE_COLOR
                              : TETROMINO_COLORS[cellType as TetrominoType]
                            : undefined,
                        }}
                      />
                    ))
                  )
                : Array.from({ length: 200 }).map((_, idx) => (
                    <div key={`opp-empty-${idx}`} className="opponent-cell" />
                  ))}
            </div>

            <div className="opponent-stats">
              {mode === 'ai' ? (
                <>
                  <span>점수: {aiScore.toLocaleString()}</span>
                  <span>클리어: {aiLines}줄</span>
                  {aiIncomingAttack > 0 && (
                    <span style={{ color: '#ef4444' }}>공격 대기: {aiIncomingAttack}줄</span>
                  )}
                </>
              ) : (
                <>
                  <span>점수: {opponentState ? opponentState.score.toLocaleString() : '0'}</span>
                  <span>클리어: {opponentState ? opponentState.lines : '0'}줄</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 📱 Touch & Mobile Controls */}
      <div className="tetris-touch-controls">
        <div className="touch-row">
          <button className="touch-btn" onClick={holdPiece} title="블록 보관">
            HOLD (C)
          </button>
          <button className="touch-btn accent" onClick={rotatePiece} title="회전">
            <RotateCw size={18} /> 회전
          </button>
          <button className="touch-btn accent" onClick={hardDrop} title="즉시 착지">
            <Zap size={18} /> 드롭
          </button>
        </div>

        <div className="touch-row">
          <button className="touch-btn" onClick={() => movePiece(-1)}>
            <ArrowLeft size={20} />
          </button>
          <button className="touch-btn" onClick={softDrop}>
            <ArrowDown size={20} />
          </button>
          <button className="touch-btn" onClick={() => movePiece(1)}>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* ⌨️ Keyboard Shortcuts Guide */}
      <div className="tetris-key-guide">
        <span><span className="key-tag">←</span> <span className="key-tag">→</span> 이동</span>
        <span><span className="key-tag">↑</span> 또는 <span className="key-tag">X</span> 회전</span>
        <span><span className="key-tag">↓</span> 소프트 드롭</span>
        <span><span className="key-tag">Space</span> 하드 드롭</span>
        <span><span className="key-tag">C</span> 또는 <span className="key-tag">Shift</span> 홀드</span>
      </div>
    </div>
  );
};

export default TetrisGame;
