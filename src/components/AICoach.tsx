import { useState, useRef, useEffect } from "react";
import { Sparkles, MessageSquare, Send, RefreshCw, HelpCircle, GraduationCap } from "lucide-react";
import { CellState, MathCrossword, ChatMessage } from "../types";

interface AICoachProps {
  currentCrossword: MathCrossword;
  stage: number;
  difficulty: string;
}

export default function AICoach({ currentCrossword, stage, difficulty }: AICoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: `안녕하세요! 십자수리 수학 튜터입니다. 🎓\n지금 ${difficulty} 난이도 ${stage}단계를 풀고 계시는군요!\n\n어려운 칸이 생겼거나 힌트가 필요할 땐 언제든 제게 말씀해 주세요. 무엇이든 친절하게 가이드해 드릴게요.`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Auto-scroll to the bottom of the chat
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string, customAction?: "hint" | "explain") => {
    if (!textToSend.trim() && !customAction) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: "user",
      text: customAction === "hint" ? "💡 유용한 힌트 하나 주세요!" : customAction === "explain" ? "📖 전체적인 풀이 방법을 가이드해 주세요!" : textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Map simplified model matrix for Gemini tutor payload
      const gridData = currentCrossword.grid.map(row => 
        row.map(cell => ({
          coord: `${cell.row}-${cell.col}`,
          type: cell.type,
          correctValue: cell.value,
          userInput: cell.userValue,
          isClue: cell.isClue
        }))
      );

      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grid: gridData,
          stage,
          difficulty,
          action: customAction || "chat",
          userMessage: textToSend,
          chatHistory: messages.map(m => ({
            role: m.role,
            text: m.text
          }))
        })
      });

      const data = await response.json();
      
      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: "model",
        text: data.message || "문제가 생겨 답변을 제공해 드리지 못했습니다. 다시 시도해 주세요!"
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: "model",
        text: "앗, API 연결에 실패했어요. 하지만 좌절하지 마세요! 가로 또는 세로줄 중 이미 완성되었거나 숫자가 2개 들어있는 줄부터 계산해 보시면 답을 유추하기 쉽답니다!"
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "model",
        text: "채팅 기록을 정리해 드렸습니다. 다시 시작해 볼까요? 궁금한 연산 계산이 있거나 공식이 헷갈린다면 편하게 질문해 주세요!"
      }
    ]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[520px] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-sm font-display tracking-tight flex items-center">
              AI 수학 쌤 수리 
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-mono bg-white/20 text-indigo-50 border border-white/10 rounded">Gemini</span>
            </h3>
            <p className="text-[10px] text-indigo-200">친절한 실시간 퀴즈 가이드</p>
          </div>
        </div>

        <button 
          onClick={clearChat}
          className="text-[10px] text-indigo-100 hover:text-white border border-indigo-400 hover:bg-white/10 px-2 py-1 rounded-md transition-colors"
        >
          초기화
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none px-4"
                  : "bg-white border border-slate-100 shadow-sm text-slate-800 rounded-tl-none whitespace-pre-wrap"
              }`}
            >
              {msg.role === "model" && (
                <div className="flex items-center space-x-1 mb-1 text-[10px] font-semibold text-indigo-600 font-display">
                  <GraduationCap className="w-3 h-3 text-indigo-600" />
                  <span>수리 쌤 튜터링</span>
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-none p-3 max-w-[85%] flex items-center space-x-2">
              <span className="text-[10px] text-slate-400 font-mono">수리 쌤이 생각하는 중...</span>
              <span className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Recommended Prompt Buttons */}
      <div className="p-2.5 border-t border-slate-100 bg-white grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSendMessage("", "hint")}
          disabled={isLoading}
          className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-100 transition-colors disabled:opacity-50"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>💡 힌트 하나 콕 집어줘</span>
        </button>
        <button
          onClick={() => handleSendMessage("", "explain")}
          disabled={isLoading}
          className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-100 transition-colors disabled:opacity-50"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>📖 풀이 로드맵 보기</span>
        </button>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="p-3 bg-slate-50 border-t border-slate-100 flex items-center space-x-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="수리 쌤에게 편하게 질문해보세요..."
          disabled={isLoading}
          className="flex-1 py-2 px-3 bg-white border border-slate-200 outline-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-indigo-600 flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
