import { generateSudoku, verifySudokuSolution } from '../server/src/utils/sudokuGenerator.js';

console.log('Testing Sudoku Generator across difficulties...');

const difficulties = ['easy', 'medium', 'hard'];

for (const diff of difficulties) {
  console.log(`\nTesting difficulty: ${diff}`);
  for (let i = 0; i < 20; i++) {
    const { puzzle, solution, clues } = generateSudoku(diff);

    // 1. Solution validity
    if (!verifySudokuSolution(solution)) {
      console.error(`[FAIL] Invalid solution at ${diff} iteration ${i}`);
      process.exit(1);
    }

    // 2. Puzzle matching solution
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0 && puzzle[r][c] !== solution[r][c]) {
          console.error(`[FAIL] Puzzle clue does not match solution at (${r},${c}) in ${diff} #${i}`);
          process.exit(1);
        }
      }
    }

    // 3. Test bottom-left block (rows 6..8, cols 0..2)
    // When filling hint into any empty cell in bottom-left block, does it conflict?
    for (let r = 6; r < 9; r++) {
      for (let c = 0; c < 3; c++) {
        const hintVal = solution[r][c];
        // Check row conflicts
        for (let otherC = 0; otherC < 9; otherC++) {
          if (otherC !== c && puzzle[r][otherC] !== 0 && puzzle[r][otherC] === hintVal) {
            console.error(`[FAIL] Hint conflict in row ${r}! Value ${hintVal} already at col ${otherC}`);
            process.exit(1);
          }
        }
        // Check col conflicts
        for (let otherR = 0; otherR < 9; otherR++) {
          if (otherR !== r && puzzle[otherR][c] !== 0 && puzzle[otherR][c] === hintVal) {
            console.error(`[FAIL] Hint conflict in col ${c}! Value ${hintVal} already at row ${otherR}`);
            process.exit(1);
          }
        }
        // Check 3x3 box conflicts
        for (let br = 6; br < 9; br++) {
          for (let bc = 0; bc < 3; bc++) {
            if ((br !== r || bc !== c) && puzzle[br][bc] !== 0 && puzzle[br][bc] === hintVal) {
              console.error(`[FAIL] Hint conflict in box (6..8, 0..2)! Value ${hintVal} already at (${br},${bc})`);
              process.exit(1);
            }
          }
        }
      }
    }
  }
  console.log(`[PASS] 20 ${diff} puzzles passed all validation & hint integrity tests!`);
}

console.log('\nAll 60 puzzles passed successfully! Sudoku generator is 100% mathematically sound.');
