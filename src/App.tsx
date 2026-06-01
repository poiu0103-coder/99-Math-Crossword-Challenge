import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  HelpCircle, 
  CheckCircle, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Clock, 
  Award, 
  BookOpen, 
  TrendingUp, 
  PenTool, 
  Maximize2, 
  Lightbulb, 
  Lock, 
  Check, 
  Share2, 
  Smile, 
  Gamepad2,
  ListOrdered,
  Search,
  Trash2,
  Download,
  UserCheck,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DifficultyType, CellState, MathCrossword, GameHistorySession } from "./types";
import { makeMathCrossword } from "./utils/mathPuzzleGenerator";
import DrawingPad from "./components/DrawingPad";
import AICoach from "./components/AICoach";

export default function App() {
  // Game state
  const [difficulty, setDifficulty] = useState<DifficultyType | null>(null);
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [crosswords, setCrosswords] = useState<MathCrossword[]>([]);
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number } | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState<boolean>(false);
  const [lastCheckResult, setLastCheckResult] = useState<{ checked: boolean; allCorrect: boolean } | null>(null);
  const [isCongratsOpen, setIsCongratsOpen] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<GameHistorySession[]>([]);

  // Student Identity state
  const [studentId, setStudentId] = useState<string>(() => localStorage.getItem("crossmath_student_id") || "");
  const [studentName, setStudentName] = useState<string>(() => localStorage.getItem("crossmath_student_name") || "");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sound effects or simple animations state
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Load high scores / stats from localstorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crossmath_history");
      if (saved) {
        setCompletedSessions(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not load game history from localStorage", e);
    }
  }, []);

  // Synchronize student credentials with localStorage
  useEffect(() => {
    localStorage.setItem("crossmath_student_id", studentId);
  }, [studentId]);

  useEffect(() => {
    localStorage.setItem("crossmath_student_name", studentName);
  }, [studentName]);

  // Timer run loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive]);

  // Handle keypress from real keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedCell || !difficulty) return;
      const { r, c } = focusedCell;
      const activeCrossword = crosswords[activeStageIdx];
      if (!activeCrossword) return;

      const cell = activeCrossword.grid[r][c];
      if (cell.isClue) return;

      if (e.key >= "0" && e.key <= "9") {
        updateCellInput(r, c, cell.userValue + e.key);
      } else if (["+", "-", "*", "/"].includes(e.key)) {
        updateCellInput(r, c, e.key);
      } else if (e.key === "Backspace") {
        updateCellInput(r, c, cell.userValue.slice(0, -1));
      } else if (e.key === "Delete" || e.key === "Clear") {
        updateCellInput(r, c, "");
      } else if (e.key === "ArrowUp" && r > 0) {
        // Move focus up skipping empty spaces
        let prevR = r - 1;
        while (prevR >= 0 && activeCrossword.grid[prevR][c].type === "empty") {
          prevR--;
        }
        if (prevR >= 0) setFocusedCell({ r: prevR, c });
      } else if (e.key === "ArrowDown" && r < 4) {
        let nextR = r + 1;
        while (nextR <= 4 && activeCrossword.grid[nextR][c].type === "empty") {
          nextR++;
        }
        if (nextR <= 4) setFocusedCell({ r: nextR, c });
      } else if (e.key === "ArrowLeft" && c > 0) {
        let prevC = c - 1;
        while (prevC >= 0 && activeCrossword.grid[r][prevC].type === "empty") {
          prevC--;
        }
        if (prevC >= 0) setFocusedCell({ r, c: prevC });
      } else if (e.key === "ArrowRight" && c < 4) {
        let nextC = c + 1;
        while (nextC <= 4 && activeCrossword.grid[r][nextC].type === "empty") {
          nextC++;
        }
        if (nextC <= 4) setFocusedCell({ r, c: nextC });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusedCell, crosswords, activeStageIdx, difficulty]);

  // Start new run session
  const startSession = (selectedDiff: DifficultyType) => {
    const trimmedId = studentId.trim();
    const trimmedName = studentName.trim();
    
    if (!trimmedId || !trimmedName) {
      if (!window.confirm("학번과 이름을 비워두시면 '정보없음/게스트'로 참여 이력이 누적 저장됩니다. 참여자 정보를 입력하고 시작할까요?\n\n(취소를 누르면 정보 입력 없이 곧바로 게임을 시작합니다.)")) {
        // Continue as Guest
      } else {
        const cardElem = document.getElementById("student-info-card");
        if (cardElem) {
          cardElem.scrollIntoView({ behavior: "smooth" });
          cardElem.classList.add("ring-animated");
          setTimeout(() => cardElem.classList.remove("ring-animated"), 2000);
        }
        return;
      }
    }

    const list: MathCrossword[] = [];
    for (let i = 1; i <= 10; i++) {
      list.push(makeMathCrossword(i, selectedDiff));
    }
    setCrosswords(list);
    setDifficulty(selectedDiff);
    setActiveStageIdx(0);
    setTimeSpent(0);
    setIsTimerActive(true);
    setFocusedCell(null);
    setLastCheckResult(null);
    setIsCongratsOpen(false);
    setFeedbackMessage(null);
  };

  const updateCellInput = (r: number, c: number, val: string) => {
    // Only numbers or simple single operator
    let processed = val.trim();
    const cellType = crosswords[activeStageIdx].grid[r][c].type;

    if (cellType === "number") {
      // Keep only numbers, max 2 chars digits
      processed = processed.replace(/[^0-9]/g, "").slice(0, 2);
    } else if (cellType === "operator") {
      // Keep only valid operators, max 1 char
      processed = processed.replace(/[^+/*-]/g, "").slice(0, 1);
    }

    setCrosswords((prev) => {
      const updated = [...prev];
      const stageObj = { ...updated[activeStageIdx] };
      const newGrid = stageObj.grid.map((rowArr) =>
        rowArr.map((cellItem) => {
          if (cellItem.row === r && cellItem.col === c) {
            return { 
              ...cellItem, 
              userValue: processed,
              isCorrect: undefined // Clear previous check red/green highlight on change
            };
          }
          return cellItem;
        })
      );
      stageObj.grid = newGrid;
      updated[activeStageIdx] = stageObj;
      return updated;
    });

    if (lastCheckResult) {
      setLastCheckResult(null);
    }
  };

  // Check correctness of currently played stage in real-time
  const checkCurrentStageCorrectness = (showBanner: boolean = true) => {
    const stageObj = crosswords[activeStageIdx];
    let allFine = true;

    const checkedGrid = stageObj.grid.map((rowArr) =>
      rowArr.map((cellItem) => {
        if (!cellItem.isClue) {
          const isCorrect = cellItem.userValue === cellItem.value;
          if (!isCorrect) allFine = false;
          return { ...cellItem, isCorrect };
        }
        return cellItem;
      })
    );

    // Update crosswords state with correctness markers
    setCrosswords((prev) => {
      const updated = [...prev];
      updated[activeStageIdx] = {
        ...stageObj,
        grid: checkedGrid,
        isCleared: allFine
      };
      return updated;
    });

    setLastCheckResult({ checked: true, allCorrect: allFine });

    if (allFine) {
      setFeedbackMessage({ text: "자축해요! 모든 칸을 완벽하게 다 채웠습니다!", isError: false });
      
      // If it is the 10th stage, finalize session and show final congrats card
      const allDone = crosswords.every((item, idx) => {
        if (idx === activeStageIdx) return true; // Checked above
        return item.isCleared;
      });

      if (activeStageIdx === 9 && allFine) {
        setIsTimerActive(false);
        setIsCongratsOpen(true);
        saveSessionToHistory(10);
      }
    } else if (showBanner) {
      setFeedbackMessage({ text: "앗! 잘못 채운 칸이 있어요. 수리쌤 힌트를 참고하여 다시 한 번 생각해보세요!", isError: true });
    }

    // Auto clear feedback banner after 4 seconds
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  const saveSessionToHistory = (stagesClearedCount: number) => {
    if (!difficulty) return;
    
    // Ensure fallback values if left completely empty
    const finalStudentId = studentId.trim() || "정보없음";
    const finalStudentName = studentName.trim() || "게스트";

    const session: GameHistorySession = {
      studentId: finalStudentId,
      studentName: finalStudentName,
      difficulty,
      date: new Date().toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      timeSpentSeconds: timeSpent,
      stagesCleared: stagesClearedCount,
      totalHintsUsed: crosswords.reduce((sum, item) => sum + item.hintsUsed, 0)
    };

    try {
      const saved = localStorage.getItem("crossmath_history");
      const currentHistory = saved ? JSON.parse(saved) : [];
      const updatedList = [session, ...currentHistory]; // Cumulative storage without slicing limits
      setCompletedSessions(updatedList);
      localStorage.setItem("crossmath_history", JSON.stringify(updatedList));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  };

  // Helper trigger to auto-reveal 1 blank cell for the student as a visual hint
  const useVisualRevealHint = () => {
    const activeCW = crosswords[activeStageIdx];
    const emptyOrWrongCells: CellState[] = [];

    activeCW.grid.forEach(row => {
      row.forEach(cell => {
        if (!cell.isClue && cell.userValue !== cell.value) {
          emptyOrWrongCells.push(cell);
        }
      });
    });

    if (emptyOrWrongCells.length === 0) {
      setFeedbackMessage({ text: "이미 모든 정답을 완벽하게 채우셨어요!", isError: false });
      return;
    }

    // Random pick one cell and reveal it
    const randomCell = emptyOrWrongCells[Math.floor(Math.random() * emptyOrWrongCells.length)];
    
    setCrosswords(prev => {
      const updated = [...prev];
      const stageObj = { ...updated[activeStageIdx] };
      stageObj.hintsUsed += 1;
      stageObj.grid = stageObj.grid.map(row => 
        row.map(cell => {
          if (cell.id === randomCell.id) {
            return {
              ...cell,
              userValue: cell.value,
              isCorrect: true
            };
          }
          return cell;
        })
      );
      updated[activeStageIdx] = stageObj;
      return updated;
    });

    setFeedbackMessage({ text: "AI 튜터의 마법 같은 힌트! 빈칸 하나가 정답으로 드러났습니다.", isError: false });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const nextStage = () => {
    if (activeStageIdx < 9) {
      setActiveStageIdx(idx => idx + 1);
      setFocusedCell(null);
      setLastCheckResult(null);
      setFeedbackMessage(null);
    }
  };

  const prevStage = () => {
    if (activeStageIdx > 0) {
      setActiveStageIdx(idx => idx - 1);
      setFocusedCell(null);
      setLastCheckResult(null);
      setFeedbackMessage(null);
    }
  };

  const handleExitToMain = () => {
    if (difficulty) {
      const clearedCount = crosswords.filter(cw => cw.isCleared).length;
      if (window.confirm(`퀴즈 풀이를 종료하고 메인화면으로 갈까요?\n\n이름: ${studentName.trim() || "게스트"}\n완료한 단계: ${clearedCount}단계 완료\n걸린 시간: ${formatTime(timeSpent)}\n\n지금까지 진행한 이력이 대장에 누적 저장됩니다.`)) {
        saveSessionToHistory(clearedCount);
        setDifficulty(null);
        setIsTimerActive(false);
      }
    } else {
      setDifficulty(null);
    }
  };

  const downloadHistoryCSV = () => {
    if (completedSessions.length === 0) {
      alert("다운로드할 참여 이력이 없습니다.");
      return;
    }

    let csvContent = "\uFEFF";
    csvContent += "학번,이름,난이도,참여 날짜,소요 시간,수행한 단계 수(최대 10),사용 힌트 갯수\n";

    completedSessions.forEach((session) => {
      const formattedTime = `${Math.floor(session.timeSpentSeconds / 60)}분 ${session.timeSpentSeconds % 60}초`;
      csvContent += `"${session.studentId}","${session.studentName}","${session.difficulty}","${session.date}","${formattedTime}",${session.stagesCleared},${session.totalHintsUsed}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `수학_십자풀이_참여이력_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteHistoryItem = (indexToDelete: number) => {
    if (window.confirm("선택한 참여 이력을 대장에서 영구 삭제하시겠습니까?")) {
      const updated = completedSessions.filter((_, idx) => idx !== indexToDelete);
      setCompletedSessions(updated);
      localStorage.setItem("crossmath_history", JSON.stringify(updated));
    }
  };

  const clearAllHistory = () => {
    if (window.confirm("정말 모든 학생의 참여 이력을 완전히 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
      setCompletedSessions([]);
      localStorage.removeItem("crossmath_history");
    }
  };

  // On-screen numeric keypad input handling
  const handleKeypadPress = (key: string) => {
    if (!focusedCell) {
      setFeedbackMessage({ text: "값을 입력할 빈 칸을 먼저 마우스로 콕 선택해 주세요!", isError: true });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }
    const { r, c } = focusedCell;
    const currentVal = crosswords[activeStageIdx].grid[r][c].userValue;

    if (key === "backspace") {
      updateCellInput(r, c, currentVal.slice(0, -1));
    } else if (key === "clear") {
      updateCellInput(r, c, "");
    } else {
      updateCellInput(r, c, currentVal + key);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}분 ${secs}초`;
  };

  // Highlights equation cells passing through focused cell
  const isCellHighlightedByFocus = (r: number, c: number) => {
    if (!focusedCell) return false;
    const { r: fr, c: fc } = focusedCell;
    return (r === fr && c % 2 === 0) || (c === fc && r % 2 === 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm font-display">
              십
            </div>
            <div>
              <h1 id="main-title" className="font-bold text-md text-slate-900 tracking-tight flex items-center font-display">
                사칙연산 십자풀이 🧩
              </h1>
              <p className="text-[11px] text-slate-500 font-mono">가로 세로의 연산 퍼즐을 맞춰 나만의 숫자 지도를 완성해요!</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {difficulty && (
              <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 shadow-2xs">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-slate-500">난이도:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    difficulty === "초급" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                    difficulty === "중급" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                    "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}>
                    {difficulty}
                  </span>
                </div>

                <div className="w-px h-4 bg-slate-300" />

                <div className="flex items-center space-x-1.5 text-slate-700 font-mono text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{formatTime(timeSpent)}</span>
                </div>
              </div>
            )}

            {difficulty && (
              <button
                onClick={handleExitToMain}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg hover:shadow-xs transition-all"
              >
                메인으로
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center">
        {/* Welcome and Difficulty Choice Screen */}
        {!difficulty ? (
          <div className="max-w-4xl mx-auto w-full my-4 space-y-8">
            {/* Main Visual Callout */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-2xl mb-4">
                <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-950 tracking-tight font-display">
                재미있게 똑똑해지는 수학 연산 퍼즐 🧩
              </h2>
              <p className="mt-2 text-slate-600 text-sm max-w-md mx-auto">
                가로와 세로의 연산 수식이 맞물리는 정밀한 숫자 퍼즐!
                이력을 안전하게 누적 기록하기 위해 학번과 이름을 입력하고 도전하세요.
              </p>
            </div>

            {/* Student Registration Form Card */}
            <div 
              id="student-info-card" 
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden transition-all duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900 font-display">도전자 정보 등록</h3>
                  </div>
                  <p className="text-xs text-slate-500">학년 반 번호와 이름을 입력해 이력을 정성적으로 기록해요.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-lg">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">학번 (예: 30112)</label>
                    <input 
                      type="text" 
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="학번 입력 (예: 3학년1반12번)" 
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">이름 (예: 홍길동)</label>
                    <input 
                      type="text" 
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="이름 입력" 
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center p-3 rounded-2xl bg-indigo-50/50">
                  {studentId.trim() && studentName.trim() ? (
                    <div className="text-center">
                      <span className="text-emerald-600 text-xs font-bold flex items-center justify-center">
                        <Check className="w-4 h-4 mr-1" /> 등록 완료!
                      </span>
                      <p className="text-[10px] text-indigo-600 font-medium font-mono mt-0.5">{studentId} {studentName}님</p>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs font-medium block">정보를 작성해 주세요</span>
                  )}
                </div>
              </div>
            </div>

            {/* Difficulty Cards */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3.5 font-display flex items-center">
                <Gamepad2 className="w-4.5 h-4.5 mr-1.5 text-indigo-600" />
                원하는 연산 난이도 선택하기
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Beginner */}
                <div 
                  onClick={() => startSession("초급")}
                  className="bg-white border-2 border-slate-100 hover:border-emerald-500 p-6 rounded-3xl cursor-pointer shadow-xs hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 group-hover:bg-emerald-500/10 rounded-full translate-x-4 -translate-y-4 transition-all" />
                  <span className="text-2xl mb-3 block animate-bounce">🌱</span>
                  <h3 className="text-base font-bold text-slate-900 font-display">초급 레벨</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[40px]">
                    더하기(+)와 빼기(-)만 등장합니다. 쉬운 두 자리 수 숫자연산으로 계산에 자신감을 얻어요!
                  </p>
                  <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600">
                    <span>이력 기록하며 도전</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Medium */}
                <div 
                  onClick={() => startSession("중급")}
                  className="bg-white border-2 border-slate-100 hover:border-amber-500 p-6 rounded-3xl cursor-pointer shadow-xs hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 group-hover:bg-amber-500/10 rounded-full translate-x-4 -translate-y-4 transition-all" />
                  <span className="text-2xl mb-3 block">⚡</span>
                  <h3 className="text-base font-bold text-slate-900 font-display">중급 레벨</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[40px]">
                    단순 더하기, 빼기와 함께 구구단 곱하기(*) 연산이 추가되어 논리적이고도 복합적인 연산이 행해져요.
                  </p>
                  <div className="mt-4 flex items-center text-xs font-semibold text-amber-600">
                    <span>이력 기록하며 도전</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Advanced */}
                <div 
                  onClick={() => startSession("고급")}
                  className="bg-white border-2 border-slate-100 hover:border-rose-500 p-6 rounded-3xl cursor-pointer shadow-xs hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 group-hover:bg-rose-500/10 rounded-full translate-x-4 -translate-y-4 transition-all" />
                  <span className="text-2xl mb-3 block">👑</span>
                  <h3 className="text-base font-bold text-slate-900 font-display">고급 레벨</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[40px]">
                    나누기(/) 사칙연산 총집합! 빈칸 연산 기호 배치까지 유추해야 하는 최고의 브레인 퍼즐 맵!
                  </p>
                  <div className="mt-4 flex items-center text-xs font-semibold text-rose-600">
                    <span>이력 기록하며 도전</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Student Leaderboard / Cumulative History Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1">전체 학생 참여 이력 관리대장</h3>
                    <p className="text-[11px] text-slate-400">누계 저장된 학생들의 도전 역사가 고스란히 담긴 투명한 대장입니다.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button 
                    onClick={downloadHistoryCSV}
                    className="inline-flex items-center space-x-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100/75 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                    title="Excel 스프레드시트 호환 파일 다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV 엑셀 다운로드</span>
                  </button>
                  <button 
                    onClick={clearAllHistory}
                    className="inline-flex items-center space-x-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100/75 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>전체 초기화</span>
                  </button>
                </div>
              </div>

              {/* Filtering bar and statistics indicators */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center space-x-2 flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="도전자 학번 또는 이름 검색" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-xs focus:ring-0 focus:outline-none placeholder-slate-400"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                    >
                      지움
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  전체 기록 수: <span className="font-mono text-indigo-600 font-bold">{completedSessions.length}</span>개 
                  {searchQuery && (
                    <span> (필터됨: <span className="font-mono text-emerald-600 font-bold">
                      {completedSessions.filter(c => c.studentId.includes(searchQuery) || c.studentName.includes(searchQuery)).length}
                    </span>개)</span>
                  )}
                </div>
              </div>

              {/* Log Table view */}
              {completedSessions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">아직 등록된 학생들의 풀이 및 중도 참여 이력이 존재하지 않습니다.</p>
                  <p className="text-[10px] text-slate-400/85 mt-1">도전자 정보를 적고 새로운 사칙연산 퍼즐을 기동해 보세요!</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-3 px-4">순번</th>
                        <th className="py-3 px-4">학번</th>
                        <th className="py-3 px-4">이름</th>
                        <th className="py-3 px-4 text-center">도전 난이도</th>
                        <th className="py-3 px-4 text-center">참여 단계 / 결과</th>
                        <th className="py-3 px-4 text-center">걸린 시간</th>
                        <th className="py-3 px-4 text-center">사용 힌트</th>
                        <th className="py-3 px-4 text-center">날짜 및 일시</th>
                        <th className="py-3 px-4 text-center">이력 삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                      {completedSessions
                        .filter(item => {
                          const s = searchQuery.trim();
                          if (!s) return true;
                          return item.studentId.toLowerCase().includes(s.toLowerCase()) || 
                                 item.studentName.toLowerCase().includes(s.toLowerCase());
                        })
                        .map((session, index) => {
                          const isFullyCleared = session.stagesCleared === 10;
                          return (
                            <tr key={index} className="hover:bg-slate-50/75 transition-colors">
                              <td className="py-2.5 px-4 font-mono text-slate-400">{completedSessions.length - index}</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{session.studentId}</td>
                              <td className="py-2.5 px-4 font-semibold text-slate-700">{session.studentName}</td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  session.difficulty === "초급" ? "bg-emerald-50 text-emerald-700" :
                                  session.difficulty === "중급" ? "bg-amber-50 text-amber-700" :
                                  "bg-rose-50 text-rose-700"
                                }`}>
                                  {session.difficulty}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center font-semibold">
                                {isFullyCleared ? (
                                  <span className="text-emerald-700 inline-flex items-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[10px] font-bold">
                                    ★ 완벽완주 (10/10)
                                  </span>
                                ) : (
                                  <span className="text-indigo-600 inline-flex items-center bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[10px] font-bold">
                                    {session.stagesCleared}과정까지 참여
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono text-slate-600 font-medium">
                                {formatTime(session.timeSpentSeconds)}
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono text-amber-700">{session.totalHintsUsed}개</td>
                              <td className="py-2.5 px-4 text-center text-slate-400 text-[10px] whitespace-nowrap">{session.date}</td>
                              <td className="py-2.5 px-4 text-center">
                                <button
                                  onClick={() => deleteHistoryItem(index)}
                                  className="text-rose-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition cursor-pointer"
                                  title="삭제하기"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Active Gameplay View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT / CENTER: Puzzle Board Column */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Stage Progression Indicator Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <ListOrdered className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 font-display">단계 진행도</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-600">{activeStageIdx + 1} / 10 단계</span>
                </div>

                {/* Progress bar dots */}
                <div className="flex items-center space-x-1">
                  {crosswords.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveStageIdx(idx);
                        setFocusedCell(null);
                        setFeedbackMessage(null);
                        setLastCheckResult(null);
                      }}
                      className={`flex-1 h-3 rounded-full border transition-all relative group ${
                        idx === activeStageIdx ? "ring-2 ring-indigo-500/20 bg-indigo-600 border-indigo-700" :
                        item.isCleared ? "bg-emerald-500 border-emerald-600 text-white" :
                        "bg-slate-100 hover:bg-slate-200 border-slate-200"
                      }`}
                      title={`Stage ${idx + 1}`}
                    >
                      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {idx + 1}단계 {item.isCleared ? "완료!" : "진행중"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Banner */}
              <AnimatePresence>
                {feedbackMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`p-3 rounded-xl border text-xs text-center font-medium ${
                      feedbackMessage.isError 
                        ? "bg-rose-50 border-rose-200 text-rose-800" 
                        : "bg-emerald-50 border-emerald-200 text-emerald-800"
                    }`}
                  >
                    {feedbackMessage.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* The math board */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center relative overflow-hidden" style={{ minHeight: "360px" }}>
                
                {/* Solved Stamp indicator overlays */}
                {crosswords[activeStageIdx]?.isCleared && (
                  <div className="absolute inset-0 bg-emerald-50/90 flex flex-col items-center justify-center z-10 backdrop-blur-xs">
                    <div className="w-16 h-16 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle className="w-10 h-10 text-emerald-600 animate-bounce" />
                    </div>
                    <h3 className="text-lg font-bold text-emerald-800 font-display">참 잘했어요! 완료!</h3>
                    <p className="text-xs text-emerald-600/90 mt-1">풀이가 연립 사칙연산과 완전히 일치해요.</p>
                    
                    <button
                      onClick={() => {
                        if (activeStageIdx < 9) {
                          nextStage();
                        } else {
                          // Restart or show final screen
                          setFeedbackMessage({ text: "마지막 단계까지 정말 훌륭하게 완주했습니다!", isError: false });
                        }
                      }}
                      className="mt-4 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
                    >
                      <span>{activeStageIdx < 9 ? "다음 단계로 가기" : "최종 결과 확인하기"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* 5x5 Crossmath Grid */}
                <div className="grid grid-cols-5 gap-2.5 max-w-[340px] w-full p-2 bg-slate-50 border border-slate-100 rounded-2xl">
                  {crosswords[activeStageIdx]?.grid.map((rowArr, rIdx) => 
                    rowArr.map((cell, cIdx) => {
                      if (cell.type === "empty") {
                        // Empty spacer block
                        return (
                          <div 
                            key={cell.id} 
                            className="aspect-square bg-slate-100/60 rounded-xl"
                          />
                        );
                      }

                      // Operator card
                      if (cell.type === "operator") {
                        const isInteractive = !cell.isClue;
                        return (
                          <button
                            key={cell.id}
                            disabled={!isInteractive}
                            onClick={() => {
                              if (isInteractive) setFocusedCell({ r: rIdx, c: cIdx });
                            }}
                            className={`aspect-square flex items-center justify-center font-display text-lg font-bold rounded-xl transition-all ${
                              isInteractive 
                                ? (focusedCell?.r === rIdx && focusedCell?.c === cIdx)
                                  ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300"
                                  : "bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-700 cursor-pointer"
                                : "bg-indigo-50/50 text-indigo-700 font-medium"
                            }`}
                          >
                            {isInteractive ? (cell.userValue || "?") : cell.value}
                          </button>
                        );
                      }

                      // Equal symbol card
                      if (cell.type === "equal") {
                        return (
                          <div 
                            key={cell.id} 
                            className="aspect-square flex items-center justify-center font-bold text-md text-slate-400 bg-slate-100/30 rounded-xl"
                          >
                            =
                          </div>
                        );
                      }

                      // Number operands card
                      if (cell.type === "number") {
                        const isInteractive = !cell.isClue;
                        const hasTyped = cell.userValue.length > 0;
                        const isFocused = focusedCell?.r === rIdx && focusedCell?.c === cIdx;
                        
                        // Style based on validation status
                        let borderStyle = "border-slate-200 hover:border-slate-300 bg-white";
                        let textStyle = "text-slate-800";

                        if (isFocused) {
                          borderStyle = "border-indigo-600 bg-white ring-3 ring-indigo-500/10 shadow-sm";
                          textStyle = "text-indigo-900";
                        } else if (cell.isCorrect === true) {
                          borderStyle = "border-emerald-500 bg-emerald-50/50";
                          textStyle = "text-emerald-700 font-bold";
                        } else if (cell.isCorrect === false) {
                          borderStyle = "border-rose-400 bg-rose-50/50 animate-shake";
                          textStyle = "text-rose-700 font-semibold";
                        } else if (isCellHighlightedByFocus(rIdx, cIdx)) {
                          borderStyle = "border-slate-300 bg-yellow-50/40";
                        }

                        return (
                          <button
                            key={cell.id}
                            onClick={() => setFocusedCell({ r: rIdx, c: cIdx })}
                            className={`aspect-square w-full flex flex-col items-center justify-center text-md font-mono font-medium rounded-xl border transition-all ${borderStyle}`}
                          >
                            <span className={textStyle}>
                              {isInteractive ? (cell.userValue || "") : cell.value}
                            </span>
                            {isInteractive && !hasTyped && (
                              <span className="text-[9px] text-slate-300 font-sans block leading-none">?</span>
                            )}
                          </button>
                        );
                      }

                      return null;
                    })
                  )}
                </div>

                {/* Subtitle helper showing focused equation formulas */}
                <div className="mt-4 text-xs font-mono text-center text-slate-500 max-w-[340px] px-2 min-h-[36px]">
                  {focusedCell ? (
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col space-y-1">
                      <span className="text-[10px] text-slate-400 font-sans font-semibold text-left">선택한 빈칸 공식 단서:</span>
                      <div className="flex justify-around text-slate-700">
                        {/* Build formulas */}
                        <span>
                          가로: {(() => {
                            const activeGrid = crosswords[activeStageIdx].grid;
                            const r = focusedCell.r;
                            const r0 = activeGrid[r][0].isClue ? activeGrid[r][0].value : (activeGrid[r][0].userValue || "?");
                            const op = activeGrid[r][1].isClue ? activeGrid[r][1].value : (activeGrid[r][1].userValue || "?");
                            const r2 = activeGrid[r][2].isClue ? activeGrid[r][2].value : (activeGrid[r][2].userValue || "?");
                            const r4 = activeGrid[r][4].isClue ? activeGrid[r][4].value : (activeGrid[r][4].userValue || "?");
                            return `${r0} ${op} ${r2} = ${r4}`;
                          })()}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span>
                          세로: {(() => {
                            const activeGrid = crosswords[activeStageIdx].grid;
                            const c = focusedCell.c;
                            const c0 = activeGrid[0][c].isClue ? activeGrid[0][c].value : (activeGrid[0][c].userValue || "?");
                            const op = activeGrid[1][c].isClue ? activeGrid[1][c].value : (activeGrid[1][c].userValue || "?");
                            const c2 = activeGrid[2][c].isClue ? activeGrid[2][c].value : (activeGrid[2][c].userValue || "?");
                            const c4 = activeGrid[4][c].isClue ? activeGrid[4][c].value : (activeGrid[4][c].userValue || "?");
                            return `${c0} ${op} ${c2} = ${c4}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 block pt-1">연필 모양 칸을 클릭하면 가로/세로 수식이 여기에 해석됩니다.</span>
                  )}
                </div>
              </div>

              {/* Action Buttons underneath Board */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={prevStage}
                  disabled={activeStageIdx === 0}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 flex items-center justify-center space-x-1 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>이전 문제</span>
                </button>

                {/* Draw Pad Show trigger */}
                <button
                  onClick={() => setIsScratchpadOpen(!isScratchpadOpen)}
                  className={`px-4 py-2.5 rounded-xl border font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                    isScratchpadOpen 
                      ? "bg-teal-50 border-teal-200 text-teal-800 shadow-sm" 
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span>연습장 {isScratchpadOpen ? "닫기" : "열기"}</span>
                </button>

                {/* Instant Reveal Spot Helper */}
                <button
                  onClick={useVisualRevealHint}
                  className="px-4 py-2.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1"
                  title="힌트로 정답 문자 하나 강제 공개"
                >
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>매직 힌트</span>
                </button>

                {/* Check Board validation */}
                <button
                  onClick={() => checkCurrentStageCorrectness()}
                  className="flex-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>정답 확인</span>
                </button>

                <button
                  onClick={nextStage}
                  disabled={activeStageIdx === 9}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 flex items-center justify-center space-x-1 disabled:opacity-40"
                >
                  <span>다음 문제</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Sribble Board (DrawingPad) Integration */}
              <DrawingPad isOpen={isScratchpadOpen} />

              {/* On-screen virtual touchscreen keypad helper */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700 font-display">터치용 숫자 키패드</span>
                  <span className="text-[10px] text-slate-400 font-mono">가상 입력</span>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {/* Numbers */}
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(num => (
                    <button
                      key={num}
                      onClick={() => handleKeypadPress(num)}
                      className="py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-sm rounded-lg active:scale-95 transition-all"
                    >
                      {num}
                    </button>
                  ))}
                  {/* Operators for direct typing */}
                  {["+", "-", "*", "/"].map(op => (
                    <button
                      key={op}
                      onClick={() => handleKeypadPress(op)}
                      className="py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold text-sm rounded-lg active:scale-95 transition-all"
                    >
                      {op}
                    </button>
                  ))}
                  {/* Tools */}
                  <button
                    onClick={() => handleKeypadPress("clear")}
                    className="col-span-2 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg active:scale-95 transition-all"
                  >
                    전체지움
                  </button>
                  <button
                    onClick={() => handleKeypadPress("backspace")}
                    className="col-span-2 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg active:scale-95 transition-all"
                  >
                    지우기
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR: AI Math Coach Companion Panel */}
            <div className="lg:col-span-5 space-y-4">
              <AICoach 
                currentCrossword={crosswords[activeStageIdx]}
                stage={activeStageIdx + 1}
                difficulty={difficulty}
              />
            </div>

          </div>
        )}

        {/* Final congrats session model/overlay */}
        <AnimatePresence>
          {isCongratsOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-xl text-center relative overflow-hidden"
              >
                {/* Gold glitter effects background */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600" />
                
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <Award className="w-12 h-12 text-amber-500 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-bold text-slate-950 font-display">
                    축하합니다! 완벽 정복! 🎉
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">가로세로 99 연산 마스터 과정 수료</p>
                </div>

                {/* Printable dynamic certificate summary box */}
                <div className="my-6 bg-amber-50/40 border border-amber-200/50 rounded-2xl p-5 text-left font-sans">
                  <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
                    공 식 수 료 증 서
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs border-b border-dashed border-amber-200 pb-1.5">
                      <span className="text-slate-500">도전자</span>
                      <span className="font-bold text-slate-800">
                        {studentId.trim() ? `[${studentId.trim()}] ` : ""}{studentName.trim() || "게스트"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-dashed border-amber-200 pb-1.5">
                      <span className="text-slate-500">도전 난이도</span>
                      <span className="font-bold text-indigo-700">{difficulty}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-dashed border-amber-200 pb-1.5">
                      <span className="text-slate-500">클리어 소요 시간</span>
                      <span className="font-mono font-bold text-slate-800">{formatTime(timeSpent)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">사용 힌트 갯수</span>
                      <span className="font-bold text-amber-700">
                        총 {crosswords.reduce((sum, item) => sum + item.hintsUsed, 0)}개
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-5 text-center">
                    <p className="text-[10px] text-slate-400 font-display italic">
                      "귀하의 뛰어난 수학적 사고력과 십자풀이 도전 정신을 칭찬합니다."
                    </p>
                    <p className="text-[9px] font-mono text-slate-400/80 mt-1">수리 쌤 AI 튜터 칭찬 도장 쾅!</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setDifficulty(null);
                      setIsCongratsOpen(false);
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
                  >
                    메인 화면으로
                  </button>
                  <button
                    onClick={() => {
                      if (difficulty) startSession(difficulty);
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    새로운 퍼즐 다시 풀기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer credits bar */}
      <footer className="bg-white border-t border-slate-200 mt-20 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-400 space-y-2 md:space-y-0">
          <p>© 2026 사칙연산 십자풀이 - 어린이 연산력 트레이너</p>
          <div className="flex space-x-4">
            <span>실시간 퀴즈 동적 생성</span>
            <span>·</span>
            <span>Gemini AI Tutor 연계</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
