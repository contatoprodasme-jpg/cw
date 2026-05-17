'use client';
import { useEffect, useState } from 'react';
import { listenSessions, listenPlayers, leaveCW, promoteFirst, closeCW, updateStatus, getPlayers, canJoin, joinCW } from '@/lib/cwService';
import { sendEmails } from '@/lib/emailService';
import { CWSession, Player, FORMAT_SIZES } from '@/types';
import { useLocalPlayer } from '@/components/PlayerProvider';
import LoginModal from '@/components/LoginModal';
import Link from 'next/link';
import { use } from 'react';

export default function CWPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { player, setPlayer } = useLocalPlayer();
  const [session, setSession] = useState<CWSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    return listenSessions(all => {
      const s = all.find(s => s.id === id);
      if (s) setSession(s);
    });
  }, [id]);

  useEffect(() => listenPlayers(id, setPlayers), [id]);

  // Auto-fechar
  useEffect(() => {
    if (!session || session.status === 'closed' || !session.closingTime) return;
    const ms = session.closingTime.getTime() - now.getTime();
    if (ms <= 0) {
      const conf = players.filter(p => p.status === 'confirmed');
      closeCW(id, conf.map(p => p.name), session.sortTeams).then(() => {
        sendEmails(players, 'closed', session, window.location.href);
      });
    } else if (ms <= 10 * 60 * 1000 && session.status === 'open') {
      updateStatus(id, 'closing_soon');
    }
  }, [now, session, players]);

  const confirmed = players.filter(p => p.status === 'confirmed');
  const waiting = players.filter(p => p.status === 'waiting');
  const total = session ? FORMAT_SIZES[session.format] : 0;
  const myEntry = players.find(p => p.name === player?.name);
  const isClosed = session?.status === 'closed';
  const check = session ? canJoin(session.closingTime) : { allowed: false };

  const ms = session?.closingTime ? session.closingTime.getTime() - now.getTime() : 0;
  const min = Math.max(0, Math.floor(ms / 60000));
  const sec = Math.max(0, Math.floor((ms % 60000) / 1000));

  const handleJoin = async () => {
    if (!player) { setShowLogin(true); return; }
    if (!check.allowed) return;
    setLoading(true);
    const pos = players.length + 1;
    const status = confirmed.length < total ? 'confirmed' : 'waiting';
    await joinCW(id, player.name, player.email,
      player.notifyNewCW, player.notifyAlmostFull, player.notifyClosed, pos, status);
    const newConf = status === 'confirmed' ? confirmed.length + 1 : confirmed.length;
    if (total - newConf === 1) {
      const all = await getPlayers(id);
      await sendEmails(all, 'almostFull', session!, window.location.href, 1);
    }
    setLoading(false);
  };

  const handleLeave = async () => {
    if (!player) return;
    setLoading(true);
    await leaveCW(id, player.name);
    if (myEntry?.status === 'confirmed' && waiting.length > 0) await promoteFirst(id);
    setLoading(false);
  };

  if (!session) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-brand animate-pulse text-2xl font-black tracking-widest">CW</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-bg">
      <header className="px-4 py-4 flex items-center gap-4 border-b border-border">
        <Link href="/" className="text-[#444] hover:text-[#666] transition">← voltar</Link>
        <span className="text-brand font-black tracking-widest text-xl">CW</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-32 space-y-6">
        {/* Timer */}
        {!isClosed && (
          <div className="text-center">
            <p className="text-[#333] text-xs tracking-widest mb-1">FECHA EM</p>
            <p className={`text-7xl font-black tabular-nums tracking-wider ${min <= 5 ? 'text-red-400' : min <= 10 ? 'text-yellow-500' : 'text-brand'}`}>
              {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
            </p>
            {!check.allowed && (
              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2 mt-3">
                <span className="text-red-400 text-sm font-bold">🔒 {check.reason}</span>
              </div>
            )}
          </div>
        )}

        {/* Times sorteados */}
        {isClosed && session.teamA && session.teamB && (
          <div className="bg-surface border border-brand/20 rounded-2xl p-5">
            <p className="text-brand text-xs tracking-widest text-center mb-4">TIMES SORTEADOS</p>
            <div className="grid grid-cols-2 gap-4">
              {[{ label: 'TIME A', color: 'text-brand', bg: 'bg-brand/5', players: session.teamA },
                { label: 'TIME B', color: 'text-blue-400', bg: 'bg-blue-400/5', players: session.teamB }]
                .map(({ label, color, bg, players: tp }) => (
                  <div key={label} className={`${bg} rounded-xl p-4`}>
                    <p className={`${color} text-xs tracking-widest mb-3`}>{label}</p>
                    {tp.map(n => (
                      <p key={n} className={`text-sm py-1 ${n === player?.name ? `${color} font-black` : 'text-[#aaa]'}`}>
                        {n}{n === player?.name ? ' (você)' : ''}
                      </p>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Vagas */}
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-black">{confirmed.length}</span>
            <span className="text-[#333] text-3xl">/{total}</span>
            <span className="text-[#444] text-sm">confirmados</span>
            {waiting.length > 0 && <span className="text-yellow-500 text-sm">+{waiting.length} fila</span>}
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (confirmed.length / total) * 100)}%`, background: confirmed.length >= total ? '#00ff88' : '#00aaff' }} />
          </div>
        </div>

        {/* Lista confirmados */}
        <div>
          <p className="text-[#333] text-xs tracking-widest mb-3">CONFIRMADOS</p>
          <div className="space-y-1">
            {confirmed.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border/50">
                <span className="text-[#333] text-xs w-6">{i + 1}</span>
                <span className={`flex-1 text-sm ${p.name === player?.name ? 'text-white font-bold' : 'text-[#aaa]'}`}>
                  {p.name}{p.name === player?.name ? ' (você)' : ''}
                </span>
                <span className="text-brand text-xs">✓</span>
              </div>
            ))}
            {confirmed.length === 0 && <p className="text-[#333] text-sm py-2">Ninguém ainda — seja o primeiro!</p>}
          </div>
        </div>

        {/* Fila espera */}
        {waiting.length > 0 && (
          <div>
            <p className="text-yellow-500/60 text-xs tracking-widest mb-3">FILA DE ESPERA</p>
            <div className="space-y-1">
              {waiting.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border/50">
                  <span className="text-yellow-500/40 text-xs w-6">{i + 1}°</span>
                  <span className={`flex-1 text-sm ${p.name === player?.name ? 'text-yellow-400 font-bold' : 'text-[#555]'}`}>
                    {p.name}{p.name === player?.name ? ' (você)' : ''}
                    {i === 0 && <span className="text-yellow-500/60 text-xs ml-2">· prioridade na próxima</span>}
                  </span>
                  <span className="text-yellow-500/60 text-xs">⏳</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botão fixo */}
      {!isClosed && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
          {myEntry ? (
            <button onClick={handleLeave} disabled={loading}
              className="w-full border border-red-500/30 text-red-400 font-bold text-sm py-5 rounded-2xl hover:bg-red-500/10 transition disabled:opacity-40">
              {loading ? 'Saindo...' : myEntry.status === 'waiting' ? 'SAIR DA FILA' : 'SAIR DA CW'}
            </button>
          ) : (
            <button onClick={handleJoin} disabled={loading || !check.allowed}
              className="w-full bg-brand text-bg font-black text-sm tracking-widest py-5 rounded-2xl disabled:opacity-20 hover:brightness-110 transition shadow-lg shadow-brand/20">
              {loading ? 'Entrando...' : !check.allowed ? `🔒 ${check.reason}` : confirmed.length >= total ? 'ENTRAR NA FILA' : 'QUERO JOGAR'}
            </button>
          )}
        </div>
      )}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </main>
  );
}
