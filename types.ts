export enum GameType {
  PRISONERS_DILEMMA = 'PRISONERS_DILEMMA', // 囚徒困境
  ULTIMATUM_GAME = 'ULTIMATUM_GAME',       // 最后通牒
  CHICKEN_GAME = 'CHICKEN_GAME',           // 胆小鬼博弈
  STAG_HUNT = 'STAG_HUNT'                  // 猎鹿博弈
}

export enum Persona {
  RATIONAL = '绝对理性',       // 利益最大化
  COOPERATIVE = '利他主义',     // 倾向合作
  AGGRESSIVE = '掠夺者',       // 极具攻击性
  CHAOTIC = '混沌邪恶',         // 难以预测
  MIRROR = '镜像策略'          // 以牙还牙
}

export enum PlayerMove {
  // 通用/囚徒困境
  COOPERATE = '合作',
  DEFECT = '背叛',
  
  // 胆小鬼博弈
  SWERVE = '退缩', // 转向
  STRAIGHT = '冲锋', // 直行

  // 猎鹿博弈
  STAG = '猎鹿', // 高风险高收益
  RABBIT = '猎兔', // 低风险低收益

  // 最后通牒
  ACCEPT = '接受',
  REJECT = '拒绝',
  OFFER = 'OFFER' // 用户出价
}

export type AiEmotion = 'neutral' | 'happy' | 'angry' | 'smug' | 'sad' | 'surprised';

export interface TurnResult {
  round: number;
  userMove: PlayerMove | number; 
  aiMove: PlayerMove | number;
  userScoreDelta: number;
  aiScoreDelta: number;
  aiReasoning: string;
  aiEmotion?: AiEmotion;
  timestamp: number;
}

export interface GameState {
  isPlaying: boolean;
  gameType: GameType | null;
  currentRound: number;
  userScore: number;
  aiScore: number;
  history: TurnResult[];
  aiPersona: Persona;
  isAiThinking: boolean;
  gameOver: boolean;
}

export interface AiResponse {
  move: string | number;
  reasoning: string;
  taunt?: string;
  emotion?: AiEmotion;
}