'use client';
import { useEffect, useState } from 'react';
import { listenPlayers } from '@/lib/cwService';
import { CWSession, Player, FORMAT_SIZES } from '@/types';
import { useLocalPlayer } from './PlayerProvider';
import Link from 'next/link';

function timeUntil(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return 'Encerrada';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}min` : `${m} min`;
}

export default function CWCard({ session, onJoin }: { session: CWSession; onJoin: () => void }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const { player } = useLocalPlayer();

  useEffect(() => listenPlayers(session.id, setPlayers), [session.id]);

  const confirmed = players.filter(p => p.status === 'confirmed');
  const waiting = players.filter(p => p.status === 'waiting');
  const total = FORMAT_SIZES[session.format];
  const remaining = Math.max(0, total - confirmed.length);
  const myEntry = players.find(p => p.name === player?.name);
  const isClosed = session.status === 'closed';
  const pct = Math.min(100, (confirmed.length / total) * 100);

  return (
    <div className={`bg-surface border border-border rounded-2xl p-5 ${isClosed ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="bg-brand/10 border border-brand/20 text-brand font-black text-sm px-3 py-1 rounded-lg tracking-wider">
          {session.format}
        </span>
        <span className={`text-xs font-bold tracking-widest ${isClosed ? 'text-[#333]' : session.status === 'closing_soon' ? 'text-yellow-500' : 'text-brand'}`}>
          {isClosed ? 'ENCERRADA' : session.status === 'closing_soon' ? '⚠ FECHANDO LOGO' : '● ABERTA'}
        </span>
        {!isClosed && (
          <span className="ml-auto text-[#444] text-xs">{timeUntil(session.closingTime)}</span>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-4xl font-black">{confirmed.length}</span>
        <span className="text-[#333] text-2xl">/{total}</span>
        <span className="text-[#444] text-sm ml-1">confirmados</span>
        {waiting.length > 0 && <span className="text-yellow-500 text-xs ml-2">+{waiting.length} fila</span>}
      </div>

      <div className="h-1 bg-border rounded-full mb-4 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: confirmed.length >= total ? '#00ff88' : '#00aaff' }} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[#444] text-xs">por {session.createdBy}</span>
        <div className="flex items-center gap-2">
          {myEntry && !isClosed && (
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${myEntry.status === 'confirmed' ? 'bg-brand/10 text-brand' : 'bg-yellow-500/10 text-yellow-500'}`}>
              {myEntry.status === 'confirmed' ? '✓ Confirmado' : '⏳ Fila'}
            </span>
          )}
          {!isClosed && (
            <button onClick={onJoin}
              className="bg-brand/10 border border-brand/30 text-brand text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-brand/20 transition">
              {myEntry ? 'Ver' : remaining > 0 ? 'Entrar' : 'Fila'}
            </button>
          )}
          <Link href={`/cw/${session.id}`}
            className="text-[#444] text-xs hover:text-[#666] transition">detalhes →</Link>
        </div>
      </div>
    </div>
  );
}
