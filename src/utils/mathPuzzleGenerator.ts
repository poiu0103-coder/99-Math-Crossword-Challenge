import { DifficultyType, CellState, MathCrossword } from "../types";

// Safe operation evaluator
function evalOp(a: number, op: string, b: number): number | null {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "/") {
    if (b === 0 || a % b !== 0) return null;
    return a / b;
  }
  return null;
}

// Find operator that satisfies: X op Y = Result
function findValidOp(x: number, y: number, result: number, allowedOps: string[]): string | null {
  for (const op of allowedOps) {
    if (evalOp(x, op, y) === result) {
      return op;
    }
  }
  return null;
}

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomElement = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// Generates a mathematically correct 5x5 Grid representation
export function generateRawPuzzle(difficulty: DifficultyType) {
  let allowedOps: string[] = [];
  let maxVal = 99;

  if (difficulty === "초급") {
    allowedOps = ["+", "-"];
    maxVal = 30; // easy numbers under 30
  } else if (difficulty === "중급") {
    allowedOps = ["+", "-", "*"];
    maxVal = 70; // moderate numbers
  } else {
    allowedOps = ["+", "-", "*", "/"];
    maxVal = 99; // advanced numbers
  }

  let attempts = 0;
  while (attempts < 100000) {
    attempts++;

    const op1 = getRandomElement(allowedOps);
    const op2 = getRandomElement(allowedOps);
    const op3 = getRandomElement(allowedOps);
    const op5 = getRandomElement(allowedOps);

    // Limit multiplication input size so the result doesn't explode
    let maxA = maxVal;
    let maxB = maxVal;
    if (op1 === "*") { maxA = 12; maxB = 8; }
    if (op2 === "*") { maxA = Math.min(maxA, 9); }

    const a = getRandomInt(1, maxA);
    const b = getRandomInt(1, maxB);

    const c = evalOp(a, op1, b);
    if (c === null || c < 1 || c > maxVal) continue;

    let maxD = maxVal;
    if (op5 === "*") { maxD = 9; }
    const d = getRandomInt(1, Math.min(maxVal, maxD));
    const g = evalOp(a, op2, d);
    if (g === null || g < 1 || g > maxVal) continue;

    let maxE = maxVal;
    if (op5 === "*") maxE = 9;
    if (op3 === "*") maxE = Math.min(maxE, 9);
    const e = getRandomInt(1, Math.min(maxVal, maxE));

    const f = evalOp(d, op5, e);
    if (f === null || f < 1 || f > maxVal) continue;

    const h = evalOp(b, op3, e);
    if (h === null || h < 1 || h > maxVal) continue;

    // Find valid operators for intersection check
    let found = false;
    for (const o4 of allowedOps) {
      if (o4 === "/" && (f === 0 || c % f !== 0)) continue;
      const i4 = evalOp(c, o4, f);
      if (i4 === null || i4 < 1 || i4 > maxVal) continue;

      for (const o6 of allowedOps) {
        if (o6 === "/" && (h === 0 || g % h !== 0)) continue;
        const i6 = evalOp(g, o6, h);
        if (i6 === i4) {
          // Double verify division rules for intermediate cells
          if (op1 === "/" && a % b !== 0) continue;
          if (op2 === "/" && a % d !== 0) continue;
          if (op3 === "/" && b % e !== 0) continue;
          if (op5 === "/" && d % e !== 0) continue;
          if (o4 === "/" && c % f !== 0) continue;
          if (o6 === "/" && g % h !== 0) continue;

          return {
            A: a, B: b, C: c,
            D: d, E: e, F: f,
            G: g, H: h, I: i4,
            Op1: op1, Op2: op2, Op3: op3, Op4: o4, Op5: op5, Op6: o6
          };
        }
      }
    }
  }

  // Fallback grid in case space search overflows
  return {
    A: 5, B: 3, C: 8,
    D: 4, E: 2, F: 2,
    G: 9, H: 5, I: 10,
    Op1: "+", Op2: "+", Op3: "+", Op4: "+", Op5: "-", Op6: "+"
  };
}

// Converts a raw generated puzzle to a structured 5x5 grid with clues and inputs
export function makeMathCrossword(id: number, difficulty: DifficultyType): MathCrossword {
  const raw = generateRawPuzzle(difficulty);

  const grid: CellState[][] = Array(5).fill(null).map((_, r) => {
    return Array(5).fill(null).map((_, c) => {
      let type: "number" | "operator" | "equal" | "empty" = "empty";
      let value = "";

      // Assign cell values and types as defined in layout
      if (r === 0 && c === 0) { type = "number"; value = String(raw.A); }
      else if (r === 0 && c === 1) { type = "operator"; value = raw.Op1; }
      else if (r === 0 && c === 2) { type = "number"; value = String(raw.B); }
      else if (r === 0 && c === 3) { type = "equal"; value = "="; }
      else if (r === 0 && c === 4) { type = "number"; value = String(raw.C); }

      else if (r === 1 && c === 0) { type = "operator"; value = raw.Op2; }
      else if (r === 1 && c === 2) { type = "operator"; value = raw.Op3; }
      else if (r === 1 && c === 4) { type = "operator"; value = raw.Op4; }

      else if (r === 2 && c === 0) { type = "number"; value = String(raw.D); }
      else if (r === 2 && c === 1) { type = "operator"; value = raw.Op5; }
      else if (r === 2 && c === 2) { type = "number"; value = String(raw.E); }
      else if (r === 2 && c === 3) { type = "equal"; value = "="; }
      else if (r === 2 && c === 4) { type = "number"; value = String(raw.F); }

      else if (r === 3 && c === 0) { type = "equal"; value = "="; }
      else if (r === 3 && c === 2) { type = "equal"; value = "="; }
      else if (r === 3 && c === 4) { type = "equal"; value = "="; }

      else if (r === 4 && c === 0) { type = "number"; value = String(raw.G); }
      else if (r === 4 && c === 1) { type = "operator"; value = raw.Op6; }
      else if (r === 4 && c === 2) { type = "number"; value = String(raw.H); }
      else if (r === 4 && c === 3) { type = "equal"; value = "="; }
      else if (r === 4 && c === 4) { type = "number"; value = String(raw.I); }

      return {
        id: `${r}-${c}`,
        row: r,
        col: c,
        type,
        value,
        userValue: "",
        isClue: true,
      };
    });
  });

  // Decide which cells to hide as inputs based on difficulty
  const hiddenPositions: { r: number; c: number }[] = [];

  if (difficulty === "초급") {
    // Reveal all operators and equal signs
    // Hide 4 out of 9 numbers
    const numberCoords = [
      { r: 0, c: 0 }, { r: 0, c: 2 }, { r: 0, c: 4 },
      { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 4 },
      { r: 4, c: 0 }, { r: 4, c: 2 }, { r: 4, c: 4 }
    ];
    // shuffle and pick 4
    const shuffled = [...numberCoords].sort(() => Math.random() - 0.5);
    shuffled.slice(0, 4).forEach(pos => hiddenPositions.push(pos));

  } else if (difficulty === "중급") {
    // Reveal all operators and equal signs
    // Hide 6 out of 9 numbers
    const numberCoords = [
      { r: 0, c: 0 }, { r: 0, c: 2 }, { r: 0, c: 4 },
      { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 4 },
      { r: 4, c: 0 }, { r: 4, c: 2 }, { r: 4, c: 4 }
    ];
    const shuffled = [...numberCoords].sort(() => Math.random() - 0.5);
    shuffled.slice(0, 6).forEach(pos => hiddenPositions.push(pos));

  } else {
    // Advanced: Hide 6 numbers AND 2 operators to solve!
    const numberCoords = [
      { r: 0, c: 0 }, { r: 0, c: 2 }, { r: 0, c: 4 },
      { r: 2, c: 0 }, { r: 2, c: 2 }, { r: 2, c: 4 },
      { r: 4, c: 0 }, { r: 4, c: 2 }, { r: 4, c: 4 }
    ];
    const operatorCoords = [
      { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 2 },
      { r: 1, c: 4 }, { r: 2, c: 1 }, { r: 4, c: 1 }
    ];

    const shuffledNums = [...numberCoords].sort(() => Math.random() - 0.5);
    shuffledNums.slice(0, 6).forEach(pos => hiddenPositions.push(pos));

    const shuffledOps = [...operatorCoords].sort(() => Math.random() - 0.5);
    shuffledOps.slice(0, 2).forEach(pos => hiddenPositions.push(pos));
  }

  // Apply inputs properties
  hiddenPositions.forEach(pos => {
    grid[pos.r][pos.c].isClue = false;
    grid[pos.r][pos.c].userValue = "";
  });

  return {
    id,
    difficulty,
    grid,
    rawAnswers: raw,
    isCleared: false,
    hintsUsed: 0
  };
}
