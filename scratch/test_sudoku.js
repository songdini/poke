function createEmptyGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function copyGrid(grid) {
  return grid.map(row => [...row]);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValid(grid, r, c, val) {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === val) return false;
    if (grid[i][c] === val) return false;
  }
  const boxRow = Math.floor(r / 3) * 3;
  const boxCol = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[boxRow + i][boxCol + j] === val) return false;
    }
  }
  return true;
}

function fillDiagonalBoxes(grid) {
  for (let i = 0; i < 9; i += 3) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        grid[i + r][i + c] = nums[idx++];
      }
    }
  }
}

function solveRandom(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValid(grid, r, c, num)) {
            grid[r][c] = num;
            if (solveRandom(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(grid, limit = 2) {
  let count = 0;

  function solve() {
    let minPossibilities = 10;
    let bestR = -1;
    let bestC = -1;
    let bestNums = null;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const possible = [];
          for (let num = 1; num <= 9; num++) {
            if (isValid(grid, r, c, num)) possible.push(num);
          }
          if (possible.length === 0) return;
          if (possible.length < minPossibilities) {
            minPossibilities = possible.length;
            bestR = r;
            bestC = c;
            bestNums = possible;
            if (minPossibilities === 1) break;
          }
        }
      }
      if (minPossibilities === 1) break;
    }

    if (bestR === -1) {
      count++;
      return;
    }

    for (const num of bestNums) {
      grid[bestR][bestC] = num;
      solve();
      grid[bestR][bestC] = 0;
      if (count >= limit) return;
    }
  }

  solve();
  return count;
}

function generateSudoku(difficulty = 'easy') {
  const targetClues = {
    easy: 38,
    medium: 30,
    hard: 25
  }[difficulty] || 38;

  const fullGrid = createEmptyGrid();
  fillDiagonalBoxes(fullGrid);
  solveRandom(fullGrid);

  const solution = copyGrid(fullGrid);
  const puzzle = copyGrid(fullGrid);

  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  const shuffledPositions = shuffle(positions);

  let currentClues = 81;
  for (const [r, c] of shuffledPositions) {
    if (currentClues <= targetClues) break;

    const temp = puzzle[r][c];
    puzzle[r][c] = 0;

    const tempGrid = copyGrid(puzzle);
    if (countSolutions(tempGrid, 2) !== 1) {
      puzzle[r][c] = temp;
    } else {
      currentClues--;
    }
  }

  return { puzzle, solution, clues: currentClues };
}

function verifySolution(grid) {
  for (let r = 0; r < 9; r++) {
    const rowSet = new Set(grid[r]);
    if (rowSet.size !== 9 || rowSet.has(0)) return false;
  }
  for (let c = 0; c < 9; c++) {
    const colSet = new Set();
    for (let r = 0; r < 9; r++) colSet.add(grid[r][c]);
    if (colSet.size !== 9 || colSet.has(0)) return false;
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const boxSet = new Set();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          boxSet.add(grid[br * 3 + r][bc * 3 + c]);
        }
      }
      if (boxSet.size !== 9 || boxSet.has(0)) return false;
    }
  }
  return true;
}

console.time('gen-easy');
const easy = generateSudoku('easy');
console.timeEnd('gen-easy');
console.log('Easy clues:', easy.clues, 'valid solution?', verifySolution(easy.solution));

console.time('gen-medium');
const medium = generateSudoku('medium');
console.timeEnd('gen-medium');
console.log('Medium clues:', medium.clues, 'valid solution?', verifySolution(medium.solution));

console.time('gen-hard');
const hard = generateSudoku('hard');
console.timeEnd('gen-hard');
console.log('Hard clues:', hard.clues, 'valid solution?', verifySolution(hard.solution));
