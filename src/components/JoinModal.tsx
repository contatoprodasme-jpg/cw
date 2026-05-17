'use client';
import { useEffect, useState } from 'react';
import { listenPlayers, joinCW, leaveCW, promoteFirst, canJoin } from '@/lib/cwService';
import { sendEmails } from '@/lib/emailService';
import { CWSession, Player, FORMAT_SIZES } from '@/types';
import { LocalPlayer } from './PlayerProvider';

export default function JoinModal({
  session, player, onClose,
}: { session: CWSession; player: LocalPlayer; onClose: () => void }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => listenPlayers(session.id, setPlayers), [session.id]);

  const confirmed = players.filter(p => p.status === 'confirmed');
  const waiting = players.filter(p => p.status === 'waiting');
  const total = FORMAT_SIZES[session.format];
  const myEntry = players.find(p => p.name === player.name);
  const check = canJoin(session.closingTime);

  const handleJoin = async () => {
    if (!check.allowed) return;
    setLoading(true);
    const pos = players.length + 1;
    const status = confirmed.length < total ? 'confirmed' : 'waiting';
    await joinCW(session.id, player.name, player.email,
      player.notifyNewCW, player.notifyAlmostFull, player.notifyClosed, pos, status);

    // Notificar se faltar 1 vaga
    const newConfirmedCount = status === 'confirmed' ? confirmed.length + 1 : confirmed.length;
    const remaining = total - newConfirmedCount;
    if (remaining === 1) {
      const allPlayers = await import('@/lib/cwService').then(m => m.getPlayers(session.id));
      await sendEmails(allPlayers, 'almostFull', session, `${window.location.origin}/cw/${session.id}`, 1);
    }
    setLoading(false);
    onClose();
  };

  const handleLeave = async () => {
    setLoading(true);
    await leaveCW(session.id, player.name);
    if (myEntry?.status === 'confirmed' && waiting.length > 0) {
      await promoteFirst(session.id);
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="bg-brand/10 border border-brand/20 text-brand font-black text-sm px-3 py-1 rounded-lg">{session.format}</span>
          </div>
          <span className="text-[#444] text-sm">{FORMAT_SIZES[session.format]} jogadores</span>
        </div>

        {/* Lista */}
        <div className="mb-4">
          <p className="text-[#333] text-xs tracking-widest mb-2">CONFIRMADOS ({confirmed.length}/{FORMAT_SIZES[session.format]})</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {confirmed.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 py-1">
                <span className="text-[#333] text-xs w-5">{i + 1}</span>
                <span className={`text-sm ${p.name === player.name ? 'text-brand font-bold' : 'text-[#aaa]'}`}>
                  {p.name}{p.name === player.name ? ' (você)' : ''}
                </span>
                <span className="ml-auto text-brand text-xs">✓</span>
              </div>
            ))}
          </div>
          {waiting.length > 0 && (
            <>
              <p className="text-yellow-500/60 text-xs tracking-widest mt-3 mb-2">FILA DE ESPERA</p>
              {waiting.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 py-1">
                  <span className="text-yellow-500/40 text-xs w-5">{i + 1}°</span>
                  <span className={`text-sm ${p.name === player.name ? 'text-yellow-400 font-bold' : 'text-[#555]'}`}>
                    {p.name}{p.name === player.name ? ' (você)' : ''}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {!check.allowed && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm font-bold">🔒 {check.reason}</p>
          </div>
        )}

        {myEntry ? (
          <button onClick={handleLeave} disabled={loading}
            className="w-full border border-red-500/30 text-red-400 font-bold text-sm py-4 rounded-xl hover:bg-red-500/10 transition disabled:opacity-40">
            {loading ? 'Saindo...' : myEntry.status === 'waiting' ? 'SAIR DA FILA' : 'SAIR DA CW'}
          </button>
        ) : (
          <button onClick={handleJoin} disabled={loading || !check.allowed}
            className="w-full bg-brand text-bg font-black text-sm tracking-widest py-4 rounded-xl disabled:opacity-20 hover:brightness-110 transition">
            {loading ? 'Entrando...' : confirmed.length >= FORMAT_SIZES[session.format] ? 'ENTRAR NA FILA' : 'QUERO JOGAR'}
          </button>
        )}

        <button onClick={onClose} className="w-full text-[#333] text-sm mt-3 hover:text-[#555] transition">Fechar</button>
      </div>
    </div>
  );
}
