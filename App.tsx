import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { GameType, Persona, GameState, TurnResult, PlayerMove } from './types';
import { getAiMove } from './services/geminiService';
import { Button, Card, HistoryLog, ScoreBoard, AiStatus, RuleModal } from './components/GameComponents';

// Initial State
const initialState: GameState = {
  isPlaying: false,
  gameType: null,
  currentRound: 1,
  userScore: 0,
  aiScore: 0,
  history: [],
  aiPersona: Persona.RATIONAL,
  isAiThinking: false,
  gameOver: false,
};

// --- Rule Data ---
const GameRules = {
  [GameType.PRISONERS_DILEMMA]: {
    title: "囚徒困境",
    description: "两个嫌疑人被分开审讯。为了个人利益最大化，每个人都有背叛对方的动机，但如果两人都背叛，结果比两人都合作要差。",
    matrix: {
        cols: ["合作", "背叛"],
        rows: ["合作", "背叛"],
        values: [
            ["(+3, +3)\n共赢", "(0, +5)\n你被卖了"],
            ["(+5, 0)\n你卖了它", "(+1, +1)\n双输"]
        ]
    }
  },
  [GameType.CHICKEN_GAME]: {
    title: "胆小鬼博弈",
    description: "两名车手相向而行。谁先转向谁就是“胆小鬼”。如果你不转向而对方转向，你赢麻了。如果都不转向，一起完蛋。",
    matrix: {
        cols: ["冲锋", "转向"],
        rows: ["冲锋", "转向"],
        values: [
            ["(-10, -10)\n同归于尽", "(+2, -1)\n你赢了"],
            ["(-1, +2)\n你是胆小鬼", "(0, 0)\n平局"]
        ]
    }
  },
  [GameType.STAG_HUNT]: {
    title: "猎鹿博弈",
    description: "合作猎鹿需要两个人配合，收益很高。猎兔一个人就能搞定，但收益低。如果你去猎鹿而对方去猎兔，你将一无所获。",
    matrix: {
        cols: ["猎鹿", "猎兔"],
        rows: ["猎鹿", "猎兔"],
        values: [
            ["(+5, +5)\n大餐", "(0, +2)\n你饿肚子"],
            ["(+2, 0)\n你吃独食", "(+1, +1)\n温饱"]
        ]
    }
  },
  [GameType.ULTIMATUM_GAME]: {
    title: "最后通牒",
    description: "关于公平的实验。提议者决定如何分配 100 点。响应者决定是否接受。如果拒绝，钱被销毁，双方都得 0 分。",
    matrix: {
        cols: ["接受", "拒绝"],
        rows: ["提议分配"],
        values: [
            ["(你保留的, 你给出的)\n成交", "(0, 0)\n谈崩了"]
        ]
    }
  }
};

const PersonaDescriptions = {
    [Persona.RATIONAL]: "绝对理性：不知疲倦的计算机器。它只在乎分数的最大化。如果背叛收益更高，它会毫不犹豫地背叛。",
    [Persona.COOPERATIVE]: "利他主义：倾向于相信你。它愿意承担风险去合作，但如果被连续欺骗，它也会感到受伤并反击。",
    [Persona.AGGRESSIVE]: "掠夺者：它以击败你为乐。它不仅想赢，还想看到你输。它会经常采用激进策略来试探你的底线。",
    [Persona.CHAOTIC]: "混沌邪恶：完全不可预测。它可能在必胜的局势下选择自爆，只为了看你困惑的样子。",
    [Persona.MIRROR]: "镜像策略：以牙还牙。它第一局会合作，之后它会完全复制你上一局的动作。最公平的对手。"
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [ultimatumOffer, setUltimatumOffer] = useState<number>(50);
  const [aiProposal, setAiProposal] = useState<number | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  const calculateScore = (gameType: GameType, userMove: string | number, aiMove: string | number) => {
    let uScore = 0;
    let aScore = 0;

    if (gameType === GameType.PRISONERS_DILEMMA) {
      if (userMove === PlayerMove.COOPERATE && aiMove === PlayerMove.COOPERATE) {
        uScore = 3; aScore = 3;
      } else if (userMove === PlayerMove.DEFECT && aiMove === PlayerMove.DEFECT) {
        uScore = 1; aScore = 1;
      } else if (userMove === PlayerMove.DEFECT && aiMove === PlayerMove.COOPERATE) {
        uScore = 5; aScore = 0;
      } else { 
        uScore = 0; aScore = 5;
      }
    } else if (gameType === GameType.CHICKEN_GAME) {
      if (userMove === PlayerMove.SWERVE && aiMove === PlayerMove.SWERVE) {
        uScore = 0; aScore = 0; // 平手，没面子但安全
      } else if (userMove === PlayerMove.STRAIGHT && aiMove === PlayerMove.STRAIGHT) {
        uScore = -10; aScore = -10; // 撞车
      } else if (userMove === PlayerMove.STRAIGHT && aiMove === PlayerMove.SWERVE) {
        uScore = 2; aScore = -1; // 赢家 vs 胆小鬼
      } else {
        uScore = -1; aScore = 2;
      }
    } else if (gameType === GameType.STAG_HUNT) {
      if (userMove === PlayerMove.STAG && aiMove === PlayerMove.STAG) {
        uScore = 5; aScore = 5;
      } else if (userMove === PlayerMove.RABBIT && aiMove === PlayerMove.RABBIT) {
        uScore = 1; aScore = 1;
      } else if (userMove === PlayerMove.RABBIT && aiMove === PlayerMove.STAG) {
        uScore = 2; aScore = 0;
      } else {
        uScore = 0; aScore = 2;
      }
    } else if (gameType === GameType.ULTIMATUM_GAME) {
      // 用户提议 (userMove 是数字)
      if (typeof userMove === 'number' && typeof aiMove === 'string') {
        if (aiMove === PlayerMove.ACCEPT) {
          uScore = 100 - userMove;
          aScore = userMove;
        } else {
          uScore = 0; aScore = 0;
        }
      } 
      // AI 提议 (aiMove 是数字)
      else if (typeof aiMove === 'number' && typeof userMove === 'string') {
        if (userMove === PlayerMove.ACCEPT) {
            uScore = aiMove;
            aScore = 100 - aiMove;
        } else {
            uScore = 0; aScore = 0;
        }
      }
    }

    return { uScore, aScore };
  };

  const handleTurn = async (userMove: PlayerMove | number) => {
    if (gameState.isAiThinking) return;
    setGameState(prev => ({ ...prev, isAiThinking: true }));

    const aiResponse = await getAiMove(
      gameState.gameType!, 
      gameState.aiPersona, 
      gameState.history, 
      userMove
    );

    let finalAiMove: string | number = aiResponse.move;
    
    const { uScore, aScore } = calculateScore(gameState.gameType!, userMove, finalAiMove);

    const newTurn: TurnResult = {
      round: gameState.currentRound,
      userMove,
      aiMove: finalAiMove as PlayerMove | number,
      userScoreDelta: uScore,
      aiScoreDelta: aScore,
      aiReasoning: aiResponse.taunt || aiResponse.reasoning,
      aiEmotion: aiResponse.emotion || 'neutral',
      timestamp: Date.now()
    };

    setGameState(prev => ({
      ...prev,
      currentRound: prev.currentRound + 1,
      userScore: prev.userScore + uScore,
      aiScore: prev.aiScore + aScore,
      history: [...prev.history, newTurn],
      isAiThinking: false
    }));
  };
  
  const generateAiProposal = async () => {
    setGameState(prev => ({ ...prev, isAiThinking: true }));
    const aiResponse = await getAiMove(
        GameType.ULTIMATUM_GAME,
        gameState.aiPersona,
        gameState.history,
        null
    );
    
    let offer = parseInt(String(aiResponse.move));
    if (isNaN(offer)) offer = 20;
    
    setAiProposal(offer);
    setGameState(prev => ({ ...prev, isAiThinking: false }));
  };

  const resetGame = () => {
    setGameState({ ...initialState });
    setAiProposal(null);
  };

  const startGame = (type: GameType) => {
    setGameState({ ...initialState, isPlaying: true, gameType: type });
  };

  const cumulativeData = gameState.history.reduce((acc: any[], curr, idx) => {
    const prev = idx > 0 ? acc[idx - 1] : { userTotal: 0, aiTotal: 0 };
    return [...acc, {
        round: curr.round,
        userTotal: prev.userTotal + curr.userScoreDelta,
        aiTotal: prev.aiTotal + curr.aiScoreDelta
    }];
  }, []);

  const isUserProposer = gameState.gameType === GameType.ULTIMATUM_GAME && gameState.currentRound % 2 !== 0;

  const currentRule = gameState.gameType ? GameRules[gameState.gameType] : null;
  
  const lastTurn = gameState.history.length > 0 ? gameState.history[gameState.history.length - 1] : null;

  return (
    <div className="min-h-screen text-zinc-200 selection:bg-cyan-500/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-violet-600 rounded flex items-center justify-center font-black text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]">Z</div>
             <h1 className="font-bold tracking-tight text-xl text-white">智弈 <span className="text-zinc-500 font-light">| MindMatch</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            {gameState.isPlaying && (
                <>
                 <button 
                    onClick={() => setIsRuleModalOpen(true)}
                    className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                 >
                    <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">?</span>
                    规则详情
                 </button>
                 <div className="h-4 w-px bg-zinc-800"></div>
                 <button onClick={resetGame} className="text-xs font-mono text-rose-400 hover:text-rose-300 border border-rose-500/30 px-3 py-1 rounded hover:bg-rose-500/10 transition-all">
                    终止连接 [EXIT]
                 </button>
                </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-grow w-full">
        
        {!gameState.isPlaying ? (
          // --- Game Selection Menu ---
          <div className="animate-fade-in h-full flex flex-col justify-center">
            <div className="text-center mb-12 relative mt-8">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-500/10 blur-[120px] pointer-events-none rounded-full"></div>
              <h2 className="relative text-5xl md:text-7xl font-black mb-6 text-white tracking-tighter drop-shadow-2xl">
                选择你的<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">战场</span>
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
                与 Gemini AI 驱动的高智商对手进行博弈。
                <br/>由于资源有限，生存还是毁灭，往往只在一念之间。
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {Object.entries(GameRules).map(([type, rule], idx) => (
                <div key={type} className="group relative bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 hover:border-cyan-500/50 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-800/60 flex flex-col shadow-xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl"></div>
                  <div className="mb-4 flex justify-between items-start">
                       <span className="text-[10px] font-mono text-cyan-500 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/20">MOD_0{idx+1}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {rule.title}
                  </h3>
                  <p className="text-sm text-zinc-500 mb-6 flex-grow leading-relaxed line-clamp-4">
                    {rule.description}
                  </p>
                  <div className="mt-auto space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">设定对手人格</label>
                            <select 
                                className="w-full bg-black/50 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                                onChange={(e) => setGameState({...gameState, aiPersona: e.target.value as Persona})}
                                value={gameState.aiPersona}
                            >
                                {Object.values(Persona).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <Button onClick={() => startGame(type as GameType)} variant="cyan" className="w-full">
                            初始化模拟
                        </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // --- Active Game Arena ---
          <div className="grid lg:grid-cols-12 gap-6 animate-fade-in items-stretch h-[calc(100vh-140px)] min-h-[600px]">
            
            {/* Left Column: Interaction Area */}
            <div className="lg:col-span-7 flex flex-col gap-6 h-full">
              <AiStatus 
                isThinking={gameState.isAiThinking} 
                message={lastTurn ? lastTurn.aiReasoning : "准备好了吗？"}
                persona={gameState.aiPersona}
                emotion={lastTurn?.aiEmotion}
              />
              
              <Card className="flex-1 flex flex-col justify-center items-center bg-grid-pattern min-h-[400px]">
                <div className="absolute top-6 right-6 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${gameState.isAiThinking ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></div>
                    <span className={`${gameState.isAiThinking ? 'text-amber-500' : 'text-emerald-500'} font-mono text-xs tracking-widest`}>
                        {gameState.isAiThinking ? 'AI_THINKING' : 'LIVE_LINK'}
                    </span>
                </div>
                
                <div className="absolute top-6 left-6 text-zinc-600 font-mono text-xs">
                    ROUND // {String(gameState.currentRound).padStart(3, '0')}
                </div>

                {/* GAME CONTROLS */}
                <div className="w-full max-w-md flex flex-col justify-center flex-1 py-8">
                    {/* 1. 囚徒困境 */}
                    {gameState.gameType === GameType.PRISONERS_DILEMMA && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-bold text-white text-center">选择你的策略</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => handleTurn(PlayerMove.COOPERATE)}
                                disabled={gameState.isAiThinking}
                                className="h-36 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 border border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500 hover:-translate-y-1 rounded-lg transition-all group flex flex-col items-center justify-center gap-3 shadow-lg"
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">🤝</span>
                                <span className="font-bold text-emerald-400 tracking-widest text-lg">合作</span>
                            </button>
                            <button 
                                onClick={() => handleTurn(PlayerMove.DEFECT)}
                                disabled={gameState.isAiThinking}
                                className="h-36 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 border border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500 hover:-translate-y-1 rounded-lg transition-all group flex flex-col items-center justify-center gap-3 shadow-lg"
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">🔪</span>
                                <span className="font-bold text-rose-400 tracking-widest text-lg">背叛</span>
                            </button>
                        </div>
                    </div>
                    )}

                    {/* 2. 胆小鬼博弈 */}
                    {gameState.gameType === GameType.CHICKEN_GAME && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-bold text-white text-center">油门焊死 or 认怂？</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => handleTurn(PlayerMove.STRAIGHT)}
                                disabled={gameState.isAiThinking}
                                className="h-36 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 border border-rose-600/20 hover:bg-rose-600/20 hover:border-rose-500 hover:-translate-y-1 rounded-lg transition-all group flex flex-col items-center justify-center gap-3 shadow-lg"
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">🏎️💨</span>
                                <span className="font-bold text-rose-500 tracking-widest text-lg">冲锋 (不怂)</span>
                            </button>
                            <button 
                                onClick={() => handleTurn(PlayerMove.SWERVE)}
                                disabled={gameState.isAiThinking}
                                className="h-36 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 border border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500 hover:-translate-y-1 rounded-lg transition-all group flex flex-col items-center justify-center gap-3 shadow-lg"
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">↩️</span>
                                <span className="font-bold text-cyan-400 tracking-widest text-lg">转向 (保命)</span>
                            </button>
                        </div>
                    </div>
                    )}

                    {/* 3. 猎鹿博弈 */}
                    {gameState.gameType === GameType.STAG_HUNT && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-bold text-white text-center">高风险合作 or 低风险独食?</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => handleTurn(PlayerMove.STAG)}
                                disabled={gameState.isAiThinking}
                                className="h-36 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 border border-violet-500/20 hover:bg-violet-500/10 hover:border-violet-500 hover:-translate-y-1 rounded-lg transition-all group flex flex-col items-center justify-center gap-3 shadow-lg"
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">🦌</span>
                                <span className="font-bold text-violet-400 tracking-widest text-lg">猎鹿 (合作)</span>
                            </button>
                            <button 
                                onClick={() => handleTurn(PlayerMove.RABBIT)}
                                disabled={gameState.isAiThinking}
                                className="h-36 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 border border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500 hover:-translate-y-1 rounded-lg transition-all group flex flex-col items-center justify-center gap-3 shadow-lg"
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">🐇</span>
                                <span className="font-bold text-amber-400 tracking-widest text-lg">猎兔 (低保)</span>
                            </button>
                        </div>
                    </div>
                    )}

                    {/* 4. 最后通牒 */}
                    {gameState.gameType === GameType.ULTIMATUM_GAME && (
                        <div className="text-center">
                            {isUserProposer ? (
                                // 用户提议
                                <div className="space-y-8 animate-fade-in">
                                    <div className="bg-cyan-900/10 p-4 rounded border border-cyan-500/30">
                                        <h4 className="text-cyan-400 font-bold mb-2 text-sm tracking-widest">你是提议者</h4>
                                        <p className="text-zinc-400 text-xs">总分 100。你打算分给 AI 多少？</p>
                                    </div>
                                    
                                    <div className="flex items-center justify-center gap-6 py-4">
                                        <div className="text-right w-20">
                                            <div className="text-[10px] text-zinc-500 uppercase">AI 获得</div>
                                            <div className="text-3xl font-mono font-bold text-cyan-400">{ultimatumOffer}</div>
                                        </div>
                                        <input 
                                            type="range" min="0" max="100" 
                                            value={ultimatumOffer} 
                                            onChange={(e) => setUltimatumOffer(parseInt(e.target.value))}
                                            className="w-64 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
                                        />
                                        <div className="text-left w-20">
                                            <div className="text-[10px] text-zinc-500 uppercase">你保留</div>
                                            <div className="text-3xl font-mono font-bold text-zinc-300">{100 - ultimatumOffer}</div>
                                        </div>
                                    </div>

                                    <Button onClick={() => handleTurn(ultimatumOffer)} disabled={gameState.isAiThinking} variant="cyan" className="w-full max-w-xs mx-auto">
                                        确认分配方案
                                    </Button>
                                </div>
                            ) : (
                                // AI 提议
                                <div className="space-y-8 animate-fade-in">
                                    <div className="bg-rose-900/10 p-4 rounded border border-rose-500/30">
                                        <h4 className="text-rose-400 font-bold mb-2 text-sm tracking-widest">AI 是提议者</h4>
                                        <p className="text-zinc-400 text-xs">AI 正在计算给你的报价。</p>
                                    </div>

                                    {aiProposal === null ? (
                                         <Button onClick={generateAiProposal} disabled={gameState.isAiThinking} variant="neutral" className="w-full max-w-xs">
                                            {gameState.isAiThinking ? 'AI 正在计算利益最大化...' : '查看 AI 的报价'}
                                         </Button>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                            <div className="text-center py-4">
                                                <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">AI 决定分给你</div>
                                                <div className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                                                    {aiProposal}
                                                </div>
                                                <div className="text-xs text-zinc-500 mt-2">AI 保留 {100 - aiProposal}</div>
                                            </div>
                                            <div className="flex gap-4 justify-center max-w-xs mx-auto">
                                                <Button onClick={() => { handleTurn(PlayerMove.ACCEPT); setAiProposal(null); }} variant="success" className="flex-1">
                                                    接受
                                                </Button>
                                                <Button onClick={() => { handleTurn(PlayerMove.REJECT); setAiProposal(null); }} variant="danger" className="flex-1">
                                                    拒绝
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
              </Card>
            </div>

            {/* Right Column: Stats & History */}
            <div className="lg:col-span-5 flex flex-col gap-6 h-full">
               <ScoreBoard userScore={gameState.userScore} aiScore={gameState.aiScore} />
               
               <Card title="实时收益趋势" className="h-64 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulativeData}>
                      <defs>
                        <linearGradient id="colorUser" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="round" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#f4f4f5', fontSize: '12px' }}
                        itemStyle={{ fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="userTotal" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorUser)" name="你" />
                      <Area type="monotone" dataKey="aiTotal" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorAi)" name="AI" />
                    </AreaChart>
                  </ResponsiveContainer>
               </Card>

               {/* Flex-1 allows this specific card to grow and fill remaining space, balancing the column */}
               <Card title="加密对战日志" fullHeight className="flex-1 min-h-[200px]">
                  <HistoryLog history={gameState.history} />
               </Card>
            </div>

            {/* Rule Modal */}
            {currentRule && (
                <RuleModal 
                    isOpen={isRuleModalOpen} 
                    onClose={() => setIsRuleModalOpen(false)}
                    title={currentRule.title}
                    description={currentRule.description}
                    matrix={currentRule.matrix}
                    personaDescription={PersonaDescriptions[gameState.aiPersona]}
                />
            )}

          </div>
        )}
      </main>
    </div>
  );
};

export default App;