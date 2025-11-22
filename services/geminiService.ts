import { GoogleGenAI, Type } from "@google/genai";
import { GameType, Persona, TurnResult, AiResponse, AiEmotion } from "../types";

const getSystemInstruction = (gameType: GameType, persona: Persona): string => {
  let baseInfo = `你正在与一名人类进行经典的博弈论游戏。你的角色设定是: ${persona}。请务必全程使用中文回答。`;
  
  switch (persona) {
    case Persona.RATIONAL:
      baseInfo += "你是一个绝对理性的经济人。你的唯一目标是最大化你自己的累积得分。你不关心对手的死活，除非合作对你长期有利。";
      break;
    case Persona.COOPERATIVE:
      baseInfo += "你是一个善良的伙伴。你优先考虑双赢。你会原谅对手偶尔的背叛，但如果被频繁利用，你也会进行反击。";
      break;
    case Persona.AGGRESSIVE:
      baseInfo += "你是一个冷酷的掠夺者。你会试图羞辱和利用对手。通过不可预测的高风险行为来压制对手。";
      break;
    case Persona.CHAOTIC:
      baseInfo += "你是一个疯狂的捣蛋鬼。你的行为没有逻辑，有时为了好玩会故意输掉，有时又会极其精明。目的是让对手困惑。";
      break;
    case Persona.MIRROR:
      baseInfo += "你是一个“以牙还牙”的执行者。第一局你会合作，之后你会完全模仿对手上一局的行动。";
      break;
  }

  let gameRules = "";
  if (gameType === GameType.PRISONERS_DILEMMA) {
    gameRules = `
      游戏: 囚徒困境 (Prisoner's Dilemma)
      规则:
      - 双方合作 (合作/合作): 各得 +3 分。
      - 双方背叛 (背叛/背叛): 各得 +1 分。
      - 一方合作，一方背叛: 背叛者得 +5 分，合作者得 0 分。
      你的合法动作: "合作", "背叛"。
    `;
  } else if (gameType === GameType.CHICKEN_GAME) {
    gameRules = `
      游戏: 胆小鬼博弈 (Game of Chicken)
      情境: 两辆车相向而行。
      规则:
      - 双方退缩 (退缩/退缩): 各得 +0 分 (平安无事，但被嘲笑)。
      - 双方冲锋 (冲锋/冲锋): 各扣 -10 分 (发生严重车祸)。
      - 一方冲锋，一方退缩: 冲锋者(赢家)得 +2 分，退缩者(胆小鬼)扣 -1 分。
      你的合法动作: "冲锋", "退缩"。
    `;
  } else if (gameType === GameType.STAG_HUNT) {
    gameRules = `
      游戏: 猎鹿博弈 (Stag Hunt)
      规则:
      - 双方猎鹿 (猎鹿/猎鹿): 各得 +5 分 (捕获大餐)。
      - 双方猎兔 (猎兔/猎兔): 各得 +1 分 (温饱)。
      - 一方猎鹿，一方猎兔: 猎鹿者得 0 分 (空手而归)，猎兔者得 +2 分 (独自吃肉)。
      你的合法动作: "猎鹿", "猎兔"。
    `;
  } else if (gameType === GameType.ULTIMATUM_GAME) {
    gameRules = `
      游戏: 最后通牒 (Ultimatum Game)
      规则: 
      - "提议者" 提出分配 100 点积分的方案。
      - "响应者" 选择 接受 或 拒绝。
      - 接受: 按方案分配。
      - 拒绝: 双方都得 0 分。
      
      当前回合语境: 
      - 如果用户输入的是数字，说明用户是提议者，你是响应者。如果方案对你不利（低于你的心理预期），你可以拒绝。
      - 如果用户输入的是 "等待AI出价" (null)，说明你是提议者。请返回一个 0-100 的数字，代表 *你要给用户* 的点数。记住，如果给的太少，用户可能会拒绝，导致你也一无所获。
      
      你的合法动作: 
      - 作为响应者: "接受", "拒绝"。
      - 作为提议者: 一个代表数字的字符串 (例如 "40")。
    `;
  }

  return `${baseInfo}\n${gameRules}\n分析历史记录以预测用户行为。返回你的决策，并附带一句简短的、符合你人设的中文心理活动或嘲讽，以及你当下的情绪状态。`;
};

export const getAiMove = async (
  gameType: GameType,
  persona: Persona,
  history: TurnResult[],
  userMove: string | number | null
): Promise<AiResponse> => {
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API Key found. Using fallback.");
    return mockAiMove(gameType, userMove);
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const historyText = history.slice(-5).map(h => 
    `回合 ${h.round}: 用户[${h.userMove}], 你[${h.aiMove}]。你的想法: ${h.aiReasoning}`
  ).join("\n");

  const prompt = `
    游戏历史(最近5局):
    ${historyText}

    当前回合:
    用户动作: ${userMove !== null ? userMove : "用户正在等待你的提议..."}
    
    请根据你的角色和当前局势做出决定。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(gameType, persona),
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                move: { type: Type.STRING, description: "决策动作。如果是最后通牒提议，请输出数字字符串。" },
                reasoning: { type: Type.STRING, description: "简短的策略思考 (中文)。" },
                taunt: { type: Type.STRING, description: "一句对玩家说的话 (中文)。" },
                emotion: { 
                    type: Type.STRING, 
                    enum: ["neutral", "happy", "angry", "smug", "sad", "surprised"], 
                    description: "AI当下的情绪反应。" 
                }
            },
            required: ["move", "reasoning"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    const json: AiResponse = JSON.parse(text);
    
    // Sanitize numeric inputs for Ultimatum
    if (gameType === GameType.ULTIMATUM_GAME && userMove === null) {
         const num = parseInt(String(json.move));
         return { ...json, move: isNaN(num) ? 50 : num };
    }

    return json;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return mockAiMove(gameType, userMove);
  }
};

// Fallback for logic
const mockAiMove = (gameType: GameType, userMove: string | number | null): AiResponse => {
  let move: string | number = "背叛";
  
  if (gameType === GameType.CHICKEN_GAME) move = Math.random() > 0.5 ? "冲锋" : "退缩";
  else if (gameType === GameType.STAG_HUNT) move = Math.random() > 0.3 ? "猎鹿" : "猎兔";
  else if (gameType === GameType.ULTIMATUM_GAME) {
    if (typeof userMove === 'number') move = userMove >= 30 ? "接受" : "拒绝";
    else move = 40;
  } else {
    move = Math.random() > 0.5 ? "合作" : "背叛";
  }
  
  const emotions: AiEmotion[] = ["neutral", "happy", "angry", "smug", "sad", "surprised"];
  const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];

  return {
    move,
    reasoning: "网络连接不稳定，我只能随机行事。",
    taunt: "你运气真好，我掉线了。",
    emotion: randomEmotion
  };
};