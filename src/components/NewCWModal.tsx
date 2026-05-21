'use client';
import { useState } from 'react';
import { createCW, joinCW } from '@/lib/cwService';
import { sendEmails } from '@/lib/emailService';
import { LocalPlayer } from './PlayerProvider';

function getNextRoundLabel(): string {
  const now = new Date();
  const r = new Date(now);
  if (now.getMinutes() < 30) r.setMinutes(30, 0, 0);
  else r.setHours(now.getHours() + 1, 0, 0, 0);
  if (r.getTime() - now.getTime() < 20 * 60 * 1000) {
    if (r.getMinutes() === 30) r.setHours(r.getHours() + 1, 0, 0, 0);
    else r.setMinutes(30, 0, 0);
  }
  return r.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function NewCWModal({ player, onClose }: { player: LocalPlayer; onClose: () => void }) {
  const [sortTeams, setSortTeams] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!player) return;
    setLoading(true);
    try {
      const closingLabel = getNextRoundLabel();
      const [h, m] = closingLabel.split(':').map(Number);
      const closingTime = new Date();
      closingTime.setHours(h, m, 0, 0);
      if (closingTime < new Date()) closingTime.setDate(closingTime.getDate() + 1);

      // Inicia como 'Lobby' com slots máximos de 16 (8x8)
      const sessionId = await createCW({
        format: 'Lobby',
        totalSlots: 16,
        sortTeams,
        closingTime,
        createdBy: player.name
      });

      await joinCW(sessionId, player, 'confirmed');

      await sendEmails({
        type: 'new_cw',
        cwId: sessionId,
        time: closingLabel,
        creator: player.name,
        format: 'Dinâmico'
      });

      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=\"fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in\">
      <div className=\"bg-surface border border-border w-full max-w-md rounded-3xl p-6 text-center relative shadow-2xl shadow-brand/5\">
        <button onClick={onClose} className=\"absolute top-5 right-5 text-[#444] hover:text-white text-lg transition\">✕</button>
        
        <div className=\"w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center text-xl font-black mx-auto mb-4\">⚡</div>
        <h3 className=\"text-white font-black text-xl tracking-wide mb-1\">Iniciar Novo Lobby</h3>
        <p className=\"text-[#555] text-xs mb-6 px-4\">O formato da CW (3v3 a 8v8) será definido automaticamente conforme os jogadores confirmarem presença.</p>

        <button onClick={() => setSortTeams(!sortTeams)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition mb-6 ${sortTeams ? 'border-brand/40 bg-brand/5' : 'border-border bg-bg'}` Civ>
          <div className=\"text-left\">
            <p className=\"text-white text-sm font-bold\">Sortear times automaticamente</p>
            <p className=\"text-[#555] text-xs\">O app divide os times ao fechar os tamanhos válidos</p>
          </div>
          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${sortTeams ? 'border-brand bg-brand' : 'border-[#333]'}`}>
            {sortTeams && <span className=\"text-bg text-xs font-black\">✓</span>}
          </span>
        </button>

        <button onClick={handle} disabled={loading}
          className=\"w-full bg-brand text-bg font-black text-sm tracking-widest py-4 rounded-xl disabled:opacity-40 hover:brightness-110 transition\">
          {loading ? 'Abrindo...' : '⚡ INICIAR LOBBY DINÂMICO'}
        </button>
      </div>
    </div>
  );
}