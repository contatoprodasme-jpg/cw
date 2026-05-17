'use client';
import { useState } from 'react';
import { createCW, joinCW, getPlayers } from '@/lib/cwService';
import { sendEmails } from '@/lib/emailService';
import { CWFormat, FORMAT_SIZES } from '@/types';
import { LocalPlayer } from './PlayerProvider';

const FORMATS: CWFormat[] = ['3v3', '4v4', '5v5', '6v6', '7v7'];

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
  const [format, setFormat] = useState<CWFormat>('5v5');
  const [sortTeams, setSortTeams] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    const cwId = await createCW(format, player.name, sortTeams);
    await joinCW(cwId, player.name, player.email,
      player.notifyNewCW, player.notifyAlmostFull, player.notifyClosed,
      1, 'confirmed');

    // Notificar todos os jogadores cadastrados sobre nova CW
    const allPlayers = await getPlayers(cwId);
    const cwUrl = `${window.location.origin}/cw/${cwId}`;
    // Busca jogadores em outras sessões para notificar (simplificado: notifica quem estiver cadastrado)
    // Em produção, manter uma coleção de usuários registrados
    await sendEmails(allPlayers, 'newCW', {
      id: cwId, format, totalSlots: FORMAT_SIZES[format],
      closingTime: new Date(), createdBy: player.name,
      createdAt: new Date(), status: 'open', sortTeams,
    }, cwUrl);

    setLoading(false);
    onClose();
    window.location.href = `/cw/${cwId}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-black mb-1">Nova CW</h2>
        <p className="text-[#444] text-sm mb-6">Fecha previsto: <span className="text-white font-bold">{getNextRoundLabel()}</span></p>

        <p className="text-[#555] text-xs tracking-widest mb-3">FORMATO</p>
        <div className="grid grid-cols-5 gap-2 mb-6">
          {FORMATS.map(f => (
            <button key={f} onClick={() => setFormat(f)}
              className={`py-3 rounded-xl text-sm font-black transition border ${format === f ? 'bg-brand/10 border-brand text-brand' : 'bg-bg border-border text-[#444] hover:border-[#333]'}`}>
              {f}
            </button>
          ))}
        </div>

        <button onClick={() => setSortTeams(!sortTeams)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition mb-6 ${sortTeams ? 'border-brand/40 bg-brand/5' : 'border-border bg-bg'}`}>
          <div>
            <p className="text-white text-sm font-bold text-left">Sortear times</p>
            <p className="text-[#444] text-xs text-left">O app divide automaticamente ao fechar</p>
          </div>
          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${sortTeams ? 'border-brand bg-brand' : 'border-[#333]'}`}>
            {sortTeams && <span className="text-bg text-xs font-black">✓</span>}
          </span>
        </button>

        <button onClick={handle} disabled={loading}
          className="w-full bg-brand text-bg font-black text-sm tracking-widest py-4 rounded-xl disabled:opacity-40 hover:brightness-110 transition">
          {loading ? 'Abrindo...' : '⚡ ABRIR CW'}
        </button>
        <button onClick={onClose} className="w-full text-[#333] text-sm mt-3 hover:text-[#555] transition">Cancelar</button>
      </div>
    </div>
  );
}
