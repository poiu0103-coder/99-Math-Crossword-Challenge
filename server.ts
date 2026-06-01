import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined. AI Tutor feature will return simulated hints.");
}

// AI Math Tutor endpoint
app.post("/api/tutor", async (req, res) => {
  try {
    const { grid, stage, difficulty, action, userMessage, chatHistory } = req.body;

    if (!ai) {
      return res.json({
        message: "Gemini API 키가 아직 설정되지 않았습니다. AI 가이드 모드를 실행하기 위해 환경 변수를 확인해주세요. (시뮬레이션 가이드: '가로 1행은 더하기 식입니다. 차분히 풀어보세요!')",
        simulated: true
      });
    }

    const gridString = JSON.stringify(grid, null, 2);

    let systemInstruction = `당신은 친절하고 똑똑한 어린이/학생용 '일대일 인공지능 수학 튜터'입니다.
현재 학생은 사칙연산 십자말풀이(사칙연산 십자풀이, 99 이하 연산)를 풀고 있습니다.
퍼즐 정보:
- 난이도: ${difficulty}
- 문항 단계: 10단계 중 ${stage}단계
- 사칙연산 범위: 1부터 99 이하의 정수 연산.

풀이 상태(그리드 데이터):
${gridString}

그리드 설명:
그리드는 5x5 행렬입니다.
- 가로 식 3개: 
  - 1행(index 0): (0,0) (0,1) (0,2) = (0,4)
  - 3행(index 2): (2,0) (2,1) (2,2) = (2,4)
  - 5행(index 4): (4,0) (4,1) (4,2) = (4,4)
- 세로 식 3개:
  - 1열(index 0): (0,0) (1,0) (2,0) = (4,0)
  - 3열(index 2): (0,2) (1,2) (2,2) = (4,2)
  - 5열(index 4): (0,4) (1,4) (2,4) = (4,4)

* 참고: index 1과 index 3은 각각 연산자(+, -, *, /)와 '='를 나타냅니다. 빈 칸은 사용자가 채워야 하는 상태입니다.

원칙:
1. 답변은 반드시 한국어(Korean)로 작성하세요. 친근하게 존댓말('~해요', '~입니다')을 장려하십시오.
2. 초등학생이나 초보자가 이해하기 쉽도록 아주 친밀하고 쉽게 핵심을 짚어줍니다.
3. 정답을 바로 다 말해주지 마세요! 아이가 스스로 생각할 수 있도록 유도하는 힌트를 주는 것을 최선으로 하십시오.
4. 만약 'explain' 요구나 힌트 요청 시, 어떤 줄을 먼저 풀면 쉬울지 우선순위를 짚어주세요. (예: 빈 칸이 1개만 있는 줄부터 풀기 등)`;

    let prompt = "";
    if (action === "explain") {
      prompt = "이 퍼즐의 전체적인 풀이 순서와 힌트를 설명해주세요. 어떤 행이나 열부터 해결해 나가는 것이 유리한지 가이드해주세요. 최종 정답을 즉시 노출해 버리지는 말고 생각할 단서를 주세요.";
    } else if (action === "hint") {
      prompt = "사용자가 풀고 있는 5x5 십자풀이 퍼즐 상황을 보고, 가장 풀기 쉬운 빈칸 한곳을 골라 해결할 수 있는 유용한 '힌트 문장'을 한 줄(또는 두 줄) 분량으로 친절하게 알려주세요.";
    } else {
      prompt = userMessage || "안녕하세요! 연산 십자풀이 중인데 도와주세요.";
    }

    const contents: any[] = [];
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach((msg: any) => {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.text }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      message: response.text,
      simulated: false
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Gemini API를 호출하는 중 오류가 발생했습니다.", details: error.message });
  }
});

// Create path for history database file
import fs from "fs";
const HISTORY_FILE = path.join(process.cwd(), "crossmath_history.json");

let gameHistories: any[] = [];
try {
  if (fs.existsSync(HISTORY_FILE)) {
    gameHistories = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  }
} catch (e) {
  console.error("실패: 참여 이력 파일을 불러오지 못했습니다.", e);
}

function saveHistoryToFile() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(gameHistories, null, 2), "utf-8");
  } catch (e) {
    console.error("실패: 참여 이력을 저장하지 못했습니다.", e);
  }
}

// 1. Get all student game logs
app.get("/api/history", (req, res) => {
  res.json(gameHistories);
});

// 2. Add student game log
app.post("/api/history", (req, res) => {
  try {
    const session = req.body;
    if (!session || !session.studentName) {
      return res.status(400).json({ error: "유효하지 않은 참여 이력 데이터입니다." });
    }
    // Append at the beginning so newest appears first
    gameHistories.unshift(session);
    saveHistoryToFile();
    res.json({ success: true, history: gameHistories });
  } catch (error: any) {
    res.status(500).json({ error: "참여 이력을 저장하는 중 오류 발생", details: error.message });
  }
});

// 3. Delete a specific history log item by its index
app.post("/api/history/delete", (req, res) => {
  try {
    const { index } = req.body;
    if (typeof index !== "number" || index < 0 || index >= gameHistories.length) {
      return res.status(400).json({ error: "유효하지 않은 인덱스입니다." });
    }
    gameHistories.splice(index, 1);
    saveHistoryToFile();
    res.json({ success: true, history: gameHistories });
  } catch (error: any) {
    res.status(500).json({ error: "참여 이력을 삭제하는 중 오류 발생", details: error.message });
  }
});

// 4. Clear all history logs
app.post("/api/history/clear", (req, res) => {
  try {
    gameHistories = [];
    saveHistoryToFile();
    res.json({ success: true, history: gameHistories });
  } catch (error: any) {
    res.status(500).json({ error: "전체 초기화 중 오류 발생", details: error.message });
  }
});

// Setup dev/prod mode static assets handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} with Node environment: ${process.env.NODE_ENV}`);
  });
}

startServer();
