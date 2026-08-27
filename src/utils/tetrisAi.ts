// Tetris AI Heuristic Engine (Dellacherie Algorithm)
import type { TetrominoType, TetrisDifficulty } from '../types/tetris';

export interface AIMove {
  rotation: number; // 0, 1, 2, 3
  x: number;
}

// 7 Tetromino Shapes in 4 rotations
export const TETROMINO_SHAPES: Record<TetrominoType, number[][][]> = {
  I: [
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
    [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
    [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]],
  ],
  J: [
    [[1,0,0], [1,1,1], [0,0,0]],
    [[0,1,1], [0,1,0], [0,1,0]],
    [[0,0,0], [1,1,1], [0,0,1]],
    [[0,1,0], [0,1,0], [1,1,0]],
  ],
  L: [
    [[0,0,1], [1,1,1], [0,0,0]],
    [[0,1,0], [0,1,0], [0,1,1]],
    [[0,0,0], [1,1,1], [1,0,0]],
    [[1,1,0], [0,1,0], [0,1,0]],
  ],
  O: [
    [[1,1], [1,1]],
    [[1,1], [1,1]],
    [[1,1], [1,1]],
    [[1,1], [1,1]],
  ],
  S: [
    [[0,1,1], [1,1,0], [0,0,0]],
    [[0,1,0], [0,1,1], [0,0,1]],
    [[0,0,0], [0,1,1], [1,1,0]],
    [[1,0,0], [1,1,0], [0,1,0]],
  ],
  T: [
    [[0,1,0], [1,1,1], [0,0,0]],
    [[0,1,0], [0,1,1], [0,1,0]],
    [[0,0,0], [1,1,1], [0,1,0]],
    [[0,1,0], [1,1,0], [0,1,0]],
  ],
  Z: [
    [[1,1,0], [0,1,1], [0,0,0]],
    [[0,0,1], [0,1,1], [0,1,0]],
    [[0,0,0], [1,1,0], [0,1,1]],
    [[0,1,0], [1,1,0], [1,0,0]],
  ],
};

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#06b6d4', // Cyan
  J: '#3b82f6', // Blue
  L: '#f97316', // Orange
  O: '#eab308', // Yellow
  S: '#10b981', // Green
  T: '#a855f7', // Purple
  Z: '#ef4444', // Red
};

export const GARBAGE_COLOR = '#64748b'; // Gray for garbage line

// Collision test helper
function isValidPosition(
  shape: number[][],
  posX: number,
  posY: number,
  board: (unknown | null)[][]
): boolean {
  const rows = board.length;
  const cols = board[0].length;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const targetX = posX + c;
        const targetY = posY + r;
        if (targetX < 0 || targetX >= cols || targetY >= rows) {
          return false;
        }
        if (targetY >= 0 && board[targetY][targetX] !== null) {
          return false;
        }
      }
    }
  }
  return true;
}

// Find lowest y position for a piece
function dropPiece(
  shape: number[][],
  posX: number,
  board: (unknown | null)[][]
): number | null {
  let y = 0;
  if (!isValidPosition(shape, posX, y, board)) {
    return null;
  }
  while (isValidPosition(shape, posX, y + 1, board)) {
    y++;
  }
  return y;
}

// Heuristic Evaluation function
function evaluateBoard(
  simBoard: boolean[][],
  linesCleared: number,
  landingHeight: number,
  difficulty: TetrisDifficulty
): number {
  const rows = simBoard.length;
  const cols = simBoard[0].length;

  // Column heights
  const heights: number[] = new Array(cols).fill(0);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (simBoard[r][c]) {
        heights[c] = rows - r;
        break;
      }
    }
  }

  // Aggregate height
  const aggregateHeight = heights.reduce((sum, h) => sum + h, 0);

  // Holes (empty spaces underneath a filled block)
  let holes = 0;
  for (let c = 0; c < cols; c++) {
    let blockFound = false;
    for (let r = 0; r < rows; r++) {
      if (simBoard[r][c]) {
        blockFound = true;
      } else if (blockFound) {
        holes++;
      }
    }
  }

  // Bumpiness (sum of absolute differences between adjacent columns)
  let bumpiness = 0;
  for (let c = 0; c < cols - 1; c++) {
    bumpiness += Math.abs(heights[c] - heights[c + 1]);
  }

  // Weights according to difficulty
  let wHeight = -0.51;
  let wLines = 0.76;
  let wHoles = -0.36;
  let wBumpiness = -0.18;

  if (difficulty === 'easy') {
    wHeight = -0.3;
    wHoles = -0.2;
    wBumpiness = -0.1;
  } else if (difficulty === 'hard') {
    // Highly aggressive: prefer lines cleared, strong penalty on holes
    wHeight = -0.6;
    wLines = linesCleared === 4 ? 4.0 : linesCleared * 0.8;
    wHoles = -0.65;
    wBumpiness = -0.25;
  }

  return (
    wHeight * aggregateHeight +
    wLines * linesCleared +
    wHoles * holes +
    wBumpiness * bumpiness -
    landingHeight * 0.05
  );
}

// Find the best move for AI
export function findBestMove(
  type: TetrominoType,
  board: (unknown | null)[][],
  difficulty: TetrisDifficulty
): AIMove {
  const rotations = TETROMINO_SHAPES[type];
  const candidates: Array<{ move: AIMove; score: number }> = [];

  const rows = board.length;
  const cols = board[0].length;

  for (let rot = 0; rot < rotations.length; rot++) {
    const shape = rotations[rot];
    const shapeWidth = shape[0].length;

    for (let x = -2; x <= cols - shapeWidth + 2; x++) {
      const dropY = dropPiece(shape, x, board);
      if (dropY === null) continue;

      // Simulate board
      const simBoard: boolean[][] = board.map((row) =>
        row.map((cell) => cell !== null)
      );

      // Place shape
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const targetY = dropY + r;
            const targetX = x + c;
            if (targetY >= 0 && targetY < rows && targetX >= 0 && targetX < cols) {
              simBoard[targetY][targetX] = true;
            }
          }
        }
      }

      // Check lines cleared
      let cleared = 0;
      for (let r = 0; r < rows; r++) {
        if (simBoard[r].every((cell) => cell)) {
          cleared++;
        }
      }

      const landingHeight = rows - dropY;
      const score = evaluateBoard(simBoard, cleared, landingHeight, difficulty);

      candidates.push({
        move: { rotation: rot, x },
        score,
      });
    }
  }

  if (candidates.length === 0) {
    return { rotation: 0, x: 3 };
  }

  candidates.sort((a, b) => b.score - a.score);

  // Easy difficulty introduces 25% random suboptimal play
  if (difficulty === 'easy' && Math.random() < 0.25 && candidates.length > 2) {
    const randomIndex = Math.min(candidates.length - 1, Math.floor(Math.random() * 4) + 1);
    return candidates[randomIndex].move;
  }

  return candidates[0].move;
}
