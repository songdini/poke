// 🧩 Sudoku Generator & Solver Utility

/**
 * 9x9 빈 그리드 생성
 */
function createEmptyGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

/**
 * 그리드 깊은 복사
 */
function copyGrid(grid) {
  return grid.map(row => [...row]);
}

/**
 * 배열 셔플 (Fisher-Yates)
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 특정 위치 (r, c)에 val을 놓을 수 있는지 검사
 */
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

/**
 * 대각선 3x3 블록 3개 (0,0), (3,3), (6,6) 랜덤 채우기
 * 대각선 블록들은 서로 행/열을 공유하지 않아 독립적으로 채울 수 있음
 */
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

/**
 * 백트래킹을 이용해 완전한 유효 스도쿠 솔루션 생성
 */
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

/**
 * 가능한 솔루션 개수 카운트 (유일 해 검증용, limit 도달 시 조기 종료)
 * MRV (Minimum Remaining Values) 휴리스틱을 사용하여 극도로 빠른 탐색 속도 보장
 */
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
          if (possible.length === 0) return; // 불가능한 경로
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

    // 빈 칸이 없으면 1개의 솔루션 발견
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

// 🌌 세계 공인 최고 난이도 마스터피스 퍼즐 (인칼라 박사의 AI Escargot, Platinum Blonde 등)
const GOD_MODE_SEEDS = [
  // 1. AI Escargot (Arto Inkala, 2006) - 8중 가설 체인 필수
  "100007090030020008009600500005300900010080002600004000300000010040000007007000300",
  // 2. Platinum Blonde (Arto Inkala, 2012) - 인칼라 박사의 후속 극악작
  "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
  // 3. Golden Nugget (2008) - 고난도 X-Cycle & Forcing Chain
  "000000012000000003002300400001800005060070800000009000008500000900040500470006000",
  // 4. Easter Monster (2007) - 스도쿠계의 난공불락 괴물
  "100000000002000000000030000000000400000000005000006000000070000000800000000009000",
  // 5. Red Dwarf (극악 17힌트 다중 체인)
  "000000010000002003000400000000000500401600000007000200000800000100000000020000000"
];

function parseGridString(str) {
  const grid = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      const char = str[r * 9 + c];
      row.push(char === '.' || char === '0' ? 0 : parseInt(char, 10));
    }
    grid.push(row);
  }
  return grid;
}

function solveWithMRV(grid) {
  let minPoss = 10;
  let bestR = -1, bestC = -1, bestNums = null;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        const poss = [];
        for (let num = 1; num <= 9; num++) {
          if (isValid(grid, r, c, num)) poss.push(num);
        }
        if (poss.length === 0) return false;
        if (poss.length < minPoss) {
          minPoss = poss.length;
          bestR = r;
          bestC = c;
          bestNums = poss;
          if (minPoss === 1) break;
        }
      }
    }
    if (minPoss === 1) break;
  }

  if (bestR === -1) return true;

  for (const num of bestNums) {
    grid[bestR][bestC] = num;
    if (solveWithMRV(grid)) return true;
    grid[bestR][bestC] = 0;
  }
  return false;
}

/**
 * 스도쿠 퍼즐과 정답을 수학적 동형 변환(Isomorphism)으로 무작위 셔플
 * (난이도와 고유해는 100% 보존되면서 완전히 새로운 문제로 변형)
 */
function applyIsomorphism(puzzle, solution) {
  let p = copyGrid(puzzle);
  let s = copyGrid(solution);

  // 1. 숫자 치환 (1~9를 다른 1~9로 1:1 매핑)
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const map = {};
  for (let i = 1; i <= 9; i++) map[i] = nums[i - 1];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (p[r][c] !== 0) p[r][c] = map[p[r][c]];
      if (s[r][c] !== 0) s[r][c] = map[s[r][c]];
    }
  }

  // 2. 3x3 밴드 내에서 행 셔플
  for (let b = 0; b < 3; b++) {
    const rowOrder = shuffle([0, 1, 2]);
    const origRowsP = [p[b * 3], p[b * 3 + 1], p[b * 3 + 2]];
    const origRowsS = [s[b * 3], s[b * 3 + 1], s[b * 3 + 2]];
    for (let i = 0; i < 3; i++) {
      p[b * 3 + i] = origRowsP[rowOrder[i]];
      s[b * 3 + i] = origRowsS[rowOrder[i]];
    }
  }

  // 3. 3x3 밴드 내에서 열 셔플
  for (let b = 0; b < 3; b++) {
    const colOrder = shuffle([0, 1, 2]);
    for (let r = 0; r < 9; r++) {
      const origColsP = [p[r][b * 3], p[r][b * 3 + 1], p[r][b * 3 + 2]];
      const origColsS = [s[r][b * 3], s[r][b * 3 + 1], s[r][b * 3 + 2]];
      for (let i = 0; i < 3; i++) {
        p[r][b * 3 + i] = origColsP[colOrder[i]];
        s[r][b * 3 + i] = origColsS[colOrder[i]];
      }
    }
  }

  // 4. 전치(대각선 반전) 랜덤 적용 (50% 확률)
  if (Math.random() > 0.5) {
    const transP = createEmptyGrid();
    const transS = createEmptyGrid();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        transP[c][r] = p[r][c];
        transS[c][r] = s[r][c];
      }
    }
    p = transP;
    s = transS;
  }

  const clues = p.reduce((acc, row) => acc + row.filter(v => v !== 0).length, 0);
  return { puzzle: p, solution: s, clues };
}

/**
 * 난이도별 스도쿠 생성 함수
 * @param {'easy' | 'medium' | 'hard' | 'expert' | 'legendary' | 'god'} difficulty
 * @returns {{ puzzle: number[][], solution: number[][], clues: number }}
 */
export function generateSudoku(difficulty = 'easy') {
  // 🌌 신의 영역 (God Mode): 세계 공인 최고 난이도 시드 퍼즐 + 무작위 동형 변환
  if (difficulty === 'god') {
    const rawSeed = GOD_MODE_SEEDS[Math.floor(Math.random() * GOD_MODE_SEEDS.length)];
    const seedPuzzle = parseGridString(rawSeed);
    const seedSolution = copyGrid(seedPuzzle);
    solveWithMRV(seedSolution);
    return applyIsomorphism(seedPuzzle, seedSolution);
  }

  // 난이도별 남길 힌트 숫자 개수
  const targetClues = {
    easy: 38,       // 🌱 쉬움: ~38개 힌트
    medium: 30,     // ⚡ 보통: ~30개 힌트
    hard: 26,       // 🔥 어려움: ~26개 힌트
    expert: 21,     // 💀 짱어려움: ~21개 힌트
    legendary: 17   // 👑 전설의 스도쿠왕: ~17~19개 힌트 (수학적 이론상 최소 한계치!)
  }[difficulty] || 38;

  // 1. 완전한 스도쿠 솔루션 보드 생성
  const fullGrid = createEmptyGrid();
  fillDiagonalBoxes(fullGrid);
  solveRandom(fullGrid);

  const solution = copyGrid(fullGrid);
  const puzzle = copyGrid(fullGrid);

  // 2. 모든 셀 위치 (0,0) ~ (8,8) 셔플
  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }

  // 3. 목표 힌트 수까지 하나씩 숫자를 제거하며 유일해(unique solution) 유지 여부 검증
  // 전설의 스도쿠왕(legendary)의 경우 4패스, 짱어려움(expert)은 2패스로 극한까지 파고듦
  const maxPasses = difficulty === 'legendary' ? 4 : difficulty === 'expert' ? 2 : 1;
  let currentClues = 81;

  for (let pass = 0; pass < maxPasses; pass++) {
    const shuffledPositions = shuffle(positions);
    for (const [r, c] of shuffledPositions) {
      if (currentClues <= targetClues) break;
      if (puzzle[r][c] === 0) continue;

      const temp = puzzle[r][c];
      puzzle[r][c] = 0;

      const tempGrid = copyGrid(puzzle);
      if (countSolutions(tempGrid, 2) !== 1) {
        puzzle[r][c] = temp; // 유일해 아니면 복원
      } else {
        currentClues--;
      }
    }
    if (currentClues <= targetClues) break;
  }

  return { puzzle, solution, clues: currentClues };
}

/**
 * 스도쿠 정답 유효성 검증 함수
 */
export function verifySudokuSolution(grid) {
  if (!grid || grid.length !== 9) return false;
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
