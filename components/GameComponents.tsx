import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AiEmotion } from '../types';

// --- Buttons & Cards ---

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'success' | 'neutral' | 'cyan' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.3)]',
    cyan: 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.3)]',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.3)]',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(5,150,105,0.3)]',
    neutral: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 border-zinc-600',
    ghost: 'bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border-transparent border-b-0 shadow-none',
  };

  return (
    <button
      className={`relative px-6 py-3 rounded-none clip-path-slant font-bold text-sm uppercase tracking-widest border-b-2 active:border-b-0 active:translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none ${variants[variant]} ${className}`}
      {...props}
      style={variant !== 'ghost' ? { clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' } : {}}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; fullHeight?: boolean }> = ({ children, className = '', title, fullHeight = false }) => (
  <div className={`glass-panel rounded-xl p-6 relative overflow-hidden flex flex-col ${fullHeight ? 'h-full' : ''} ${className}`}>
    {title && (
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3 shrink-0">
            <div className="w-1 h-4 bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">{title}</h3>
        </div>
    )}
    <div className="flex-1 min-h-0 relative">
        {children}
    </div>
  </div>
);

// --- Modals ---

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  matrix?: {
    rows: string[];
    cols: string[];
    values: string[][];
  };
  personaDescription?: string;
}

export const RuleModal: React.FC<RuleModalProps> = ({ isOpen, onClose, title, description, matrix, personaDescription }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl glass-panel rounded-xl p-8 animate-in fade-in zoom-in duration-200 border border-zinc-700 shadow-2xl">
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
              <span className="text-cyan-500">#</span> {title}
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-violet-500"></div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">任务简报</h3>
            <p className="text-zinc-300 leading-relaxed">{description}</p>
          </div>

          {matrix && (
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">收益矩阵 (Payoff Matrix)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-center border-collapse border border-zinc-700">
                  <thead>
                    <tr>
                      <th className="p-2 bg-zinc-800/50 text-zinc-500 border border-zinc-700 font-mono text-xs">你 \ AI</th>
                      {matrix.cols.map((col, i) => (
                        <th key={i} className="p-2 bg-zinc-900 text-violet-400 border border-zinc-700 font-bold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 bg-zinc-900 text-cyan-400 border border-zinc-700 font-bold">{row}</td>
                        {matrix.values[i].map((val, j) => (
                          <td key={j} className="p-3 border border-zinc-700 text-zinc-300 whitespace-pre-line">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-zinc-500 mt-2 italic">* 格式: (你的得分, AI得分)</p>
            </div>
          )}

          {personaDescription && (
             <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">对手档案</h3>
                <div className="bg-violet-500/5 border border-violet-500/20 p-4 rounded text-sm text-violet-200">
                    {personaDescription}
                </div>
             </div>
          )}
        </div>

        <div className="mt-8 flex justify-end">
            <Button variant="neutral" onClick={onClose}>明白 (ACKNOWLEDGED)</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- Game Visuals ---

export const HistoryLog: React.FC<{ history: any[] }> = ({ history }) => {
  const [revealedIds, setRevealedIds] = useState<number[]>([]);

  const toggleReveal = (idx: number) => {
    if (revealedIds.includes(idx)) return; // Once revealed, stays revealed
    setRevealedIds(prev => [...prev, idx]);
  };
  
  const emotionMap: Record<string, string> = {
    neutral: "😐",
    happy: "😈",
    angry: "😡",
    smug: "😏",
    sad: "😵",
    surprised: "😲"
  };

  return (
    <div className="absolute inset-0 overflow-y-auto pr-2 space-y-3 scrollbar-thin">
      {[...history].reverse().map((turn, idx) => {
        // Correct index because we reversed the array for display
        const originalIdx = history.length - 1 - idx;
        const isRevealed = revealedIds.includes(originalIdx);
        const emotionEmoji = turn.aiEmotion ? emotionMap[turn.aiEmotion] || "🤖" : "🤖";

        return (
        <div key={originalIdx} className="bg-black/20 p-3 rounded border-l-2 border-zinc-700 hover:border-cyan-500 transition-colors group animate-fade-in">
          <div className="flex justify-between text-[10px] text-zinc-500 mb-1 font-mono">
            <span>ROUND_{String(turn.round).padStart(3, '0')}</span>
            <span>{new Date(turn.timestamp).toLocaleTimeString([], {hour12: false})}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold text-sm">{turn.userMove}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${turn.userScoreDelta >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {turn.userScoreDelta > 0 ? '+' : ''}{turn.userScoreDelta}
                </span>
            </div>
            <div className="h-px flex-1 bg-zinc-800 mx-4"></div>
            <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${turn.aiScoreDelta >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {turn.aiScoreDelta > 0 ? '+' : ''}{turn.aiScoreDelta}
                </span>
                <span className="text-violet-400 font-bold text-sm">{turn.aiMove}</span>
            </div>
          </div>
          
          {/* Reasoning Area */}
          <div className="flex gap-2 items-start mt-2">
             <div className="text-[10px] font-bold text-violet-500 mt-0.5 uppercase tracking-wider flex items-center gap-1">
                 <span>AI LOG</span>
                 {isRevealed && <span className="text-base leading-none">{emotionEmoji}</span>}
                 <span>:</span>
             </div>
             {isRevealed ? (
                <div className="text-xs text-zinc-400 italic leading-relaxed animate-in fade-in">
                    "{turn.aiReasoning}"
                </div>
             ) : (
                <div 
                    onClick={() => toggleReveal(originalIdx)}
                    className="redacted text-xs font-mono flex-1 py-0.5 px-2"
                    title="点击解密 AI 思考过程"
                >
                    DATA_ENCRYPTED_CLICK_TO_DECRYPT_PACKET_{originalIdx}
                </div>
             )}
          </div>
        </div>
      )})}
      {history.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
            <div className="w-8 h-8 border-2 border-zinc-700 rounded-full border-t-transparent animate-spin opacity-20"></div>
            <span className="text-xs font-mono">等待数据流输入...</span>
        </div>
      )}
    </div>
  );
};

export const ScoreBoard: React.FC<{ userScore: number; aiScore: number }> = ({ userScore, aiScore }) => (
  <div className="grid grid-cols-2 gap-4 mb-2">
    <div className="relative bg-gradient-to-br from-zinc-900 to-black rounded p-4 border border-cyan-500/20 overflow-hidden">
      <div className="absolute top-0 right-0 p-1 opacity-10 text-6xl grayscale">👤</div>
      <div className="text-cyan-500/80 text-xs uppercase font-bold tracking-widest mb-1 flex items-center gap-2">
         <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_5px_#06b6d4]"></div> 玩家得分
      </div>
      <div className="text-4xl font-black text-white font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
        {String(userScore).padStart(4, '0')}
      </div>
    </div>
    <div className="relative bg-gradient-to-br from-zinc-900 to-black rounded p-4 border border-violet-500/20 overflow-hidden">
      <div className="absolute top-0 right-0 p-1 opacity-10 text-6xl grayscale">🤖</div>
      <div className="text-violet-500/80 text-xs uppercase font-bold tracking-widest mb-1 flex items-center gap-2">
         <div className="w-2 h-2 bg-violet-500 rounded-full shadow-[0_0_5px_#8b5cf6]"></div> AI 得分
      </div>
      <div className="text-4xl font-black text-white font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]">
        {String(aiScore).padStart(4, '0')}
      </div>
    </div>
  </div>
);

export const AiStatus: React.FC<{ isThinking: boolean; message?: string; persona: string; emotion?: AiEmotion }> = ({ isThinking, message, persona, emotion = 'neutral' }) => {
  const emotionMap: Record<string, string> = {
    neutral: "😐",
    happy: "😈",
    angry: "😡",
    smug: "😏",
    sad: "😵",
    surprised: "😲"
  };
  
  const currentEmoji = emotionMap[emotion] || "🤖";

  return (
  <div className="glass-panel p-5 rounded-lg mb-6 border-l-4 border-violet-500 flex items-start gap-5 relative overflow-hidden group shadow-lg transition-all">
    {/* Background scanline effect */}
    {isThinking && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/10 to-transparent w-[200%] animate-[shimmer_2s_infinite] -skew-x-12 pointer-events-none"></div>}
    
    <div className="relative shrink-0">
        <div className={`w-14 h-14 rounded-lg flex items-center justify-center font-mono text-xl font-bold border border-violet-500/30 bg-violet-500/10 text-violet-400 overflow-hidden relative ${isThinking ? 'animate-pulse shadow-[0_0_20px_rgba(139,92,246,0.4)]' : 'shadow-[0_0_10px_rgba(139,92,246,0.1)]'}`}>
            {isThinking ? (
               <span className="animate-pulse text-xs">...</span> 
            ) : (
               <span className="text-3xl transform group-hover:scale-110 transition-transform duration-300" role="img" aria-label={emotion}>{currentEmoji}</span>
            )}
        </div>
        {isThinking && <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-400 rounded-full animate-ping"></div>}
    </div>
    
    <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-violet-300 font-bold tracking-wider uppercase border border-violet-500/30 px-1.5 py-0.5 rounded bg-violet-500/5">{persona}</span>
            <span className="text-[10px] text-zinc-600 font-mono bg-black/20 px-2 py-0.5 rounded">{isThinking ? 'COMPUTING_STRATEGY...' : `STATUS: ${emotion.toUpperCase()}`}</span>
        </div>
        {isThinking ? (
            <div className="flex flex-col space-y-1.5 mt-1">
                <div className="h-1.5 w-2/3 bg-violet-900/40 rounded animate-pulse"></div>
                <div className="h-1.5 w-1/2 bg-violet-900/40 rounded animate-pulse delay-75"></div>
            </div>
        ) : (
            <p className="text-sm text-zinc-300 leading-relaxed italic">
                "{message || "我已准备就绪。"}"
            </p>
        )}
    </div>
  </div>
)};