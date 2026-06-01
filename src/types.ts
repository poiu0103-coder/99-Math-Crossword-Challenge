export type DifficultyType = "초급" | "중급" | "고급";

export type CellType = "number" | "operator" | "equal" | "empty";

export interface CellState {
  id: string; // "row-col" format, e.g. "0-2"
  row: number;
  col: number;
  type: CellType;
  value: string; // The correct value, e.g. "12", "+", "="
  userValue: string; // What the user enters
  isClue: boolean; // Is this revealed to the user as a clue?
  isCorrect?: boolean; // Null/undefined or true/false after validation
}

export interface MathCrossword {
  id: number; // 1 to 10
  difficulty: DifficultyType;
  grid: CellState[][]; // 5x5 Grid
  rawAnswers: {
    A: number; B: number; C: number;
    D: number; E: number; F: number;
    G: number; H: number; I: number;
    Op1: string; Op2: string; Op3: string;
    Op4: string; Op5: string; Op6: string;
  };
  isCleared: boolean;
  hintsUsed: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
}

export interface GameHistorySession {
  studentId: string; // 학번
  studentName: string; // 이름
  difficulty: DifficultyType;
  date: string;
  timeSpentSeconds: number;
  stagesCleared: number; // 완료한 단계 수 (최대 10)
  totalHintsUsed: number;
}
