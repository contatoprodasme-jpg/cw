'use client';
import { useEffect, useState, useRef } from 'react';
import { listenNotices, postNotice } from '@/lib/cwService';
import { Notice } from '@/types';
import { LocalPlayer } from './PlayerProvider';

const COOLDOWN = 60000;

function fmt(d: Date) {
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function MuralDrawer({
  player, onClose, onLogin,
}: { player: LocalPlayer | null; onClose: () => void; onLogin: () => void }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [lastPost, setLastPost] = useState(0);
  const [cd, setCd] = useState(0);

  useEffect(() => listenNotices(setNotices), []);

  useEffect(() => {
    if (cd <= 0) return;
    const t = setInterval(() => {
      const r = Math.max(0, COOLDOWN - (Date.now() - lastPost));
      setCd(r);
    }, 500);
    return () => clearInterval(t);
  }, [cd, lastPost]);

  const canPost = player && text.trim().length > 0 && cd <= 0 && !posting;

  const handle = async () => {
    if (!canPost || !player) return;
    setPosting(true);
    await postNotice(player.name, text.trim());
    setText('');
    const n = Date.now();
    setLastPost(n);
    setCd(COOLDOWN);
    setPosting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur" onClick={onClose} />
      <div className="w-full max-w-sm bg-surface border-l border-border flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-brand">📢</span>
            <span className="font-black text-sm tracking-widest">MURAL DE AVISOS</span>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-[#666] text-xl">✕</button>
        </div>
        <p className="text-[#333] text-xs text-center py-2 border-b border-border">
          Somente avisos sobre CW. Sem conversa.
        </p>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col-reverse">
          {notices.length === 0 && (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📢</div>
              <p className="text-[#333] text-sm">Nenhum aviso ainda</p>
            </div>
          )}
          {notices.map(n => (
            <div key={n.id}
              className={`rounded-xl p-3 max-w-[85%] border ${n.playerName === player?.name
                ? 'ml-auto bg-brand/5 border-brand/20'
                : 'bg-bg border-border'}`}>
              <div className="flex justify-between items-center mb-1 gap-4">
                <span className={`text-xs font-bold ${n.playerName === player?.name ? 'text-brand/80' : 'text-[#555]'}`}>
                  {n.playerName}
                </span>
                <span className="text-[#333] text-xs">{fmt(n.createdAt)}</span>
              </div>
              <p className="text-sm text-[#ccc] leading-relaxed">{n.text}</p>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          {!player ? (
            <button onClick={onLogin}
              className="w-full border border-brand/30 text-brand text-sm font-bold py-3 rounded-xl hover:bg-brand/10 transition">
              Entrar para postar aviso
            </button>
          ) : (
            <>
              {cd > 0 && (
                <p className="text-yellow-500 text-xs text-center mb-2">
                  ⏳ Aguarde {Math.ceil(cd / 1000)}s para postar novamente
                </p>
              )}
              <div className="flex gap-2">
                <textarea
                  className="flex-1 bg-bg border border-border rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:border-brand/40 transition"
                  placeholder="Aviso sobre a CW..."
                  rows={2} maxLength={200}
                  value={text} onChange={e => setText(e.target.value)}
                />
                <button onClick={handle} disabled={!canPost}
                  className="bg-brand text-bg font-black px-4 rounded-xl disabled:opacity-20 hover:brightness-110 transition self-end py-2.5">
                  {posting ? '...' : '→'}
                </button>
              </div>
              <p className="text-[#222] text-xs text-right mt-1">{text.length}/200</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
