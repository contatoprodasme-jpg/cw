'use client';
import { useEffect, useState, useCallback } from 'react';
import { listenSessions, listenPlayers, leaveCW, promoteFirst, closeCW, updateStatus, getPlayers } from '@/lib/cwService';
import { sendEmails } from '@/lib/emailService';
import { CWSession, Player, FORMAT_SIZES } from '@/types';
import { useLocalPlayer } from '@/components/PlayerProvider';
import LoginModal from '@/components/LoginModal';
import NewCWModal from '@/components/NewCWModal';
import CWCard from '@/components/CWCard';
import MuralDrawer from '@/components/MuralDrawer';
import JoinModal from '@/components/JoinModal';

export default function Home() {
  const { player, clearPlayer } = useLocalPlayer();
  const [sessions, setSessions] = useState<CWSession[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showNewCW, setShowNewCW] = useState(false);
  const [showMural, setShowMural] = useState(false);
  const [joinTarget, setJoinTarget] = useState<CWSession | null>(null);

  useEffect(() => { return listenSessions(setSessions); }, []);

  // Auto-fechar CWs que passaram do horário
  useEffect(() => {
    sessions.forEach(async s => {
      if (s.status === 'closed') return;
      const now = Date.now();
      const closing = s.closingTime?.getTime() ?? 0;
      const msLeft = closing - now;

      if (msLeft <= 0) {
        const players = await getPlayers(s.id);
        const confirmed = players.filter(p => p.status === 'confirmed');
        await closeCW(s.id, confirmed.map(p => p.name), s.sortTeams);
        await sendEmails(players, 'closed', s, `${window.location.origin}/cw/${s.id}`);
      } else if (msLeft <= 10 * 60 * 1000 && s.status === 'open') {
        await updateStatus(s.id, 'closing_soon');
      }
    });
  }, [sessions]);

  const handleOpenCW = () => {
    if (!player) { setShowLogin(true); return; }
    setShowNewCW(true);
  };

  const handleJoin = (session: CWSession) => {
    if (!player) { setShowLogin(true); return; }
    setJoinTarget(session);
  };

  const active = sessions.filter(s => s.status !== 'closed');
  const recent = sessions.filter(s => s.status === 'closed').slice(0, 5);

  return (
    <main className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-border px-4 py-4 flex items-center justify-between">
        <span className="text-brand text-3xl font-black tracking-[8px]">CW</span>
        <div className="flex items-center gap-3">
          {player ? (
            <>
              <span className="text-[#555] text-sm">{player.name}</span>
              <button onClick={clearPlayer} className="text-[#333] text-sm hover:text-[#666] transition">sair</button>
            </>
          ) : (
            <button onClick={() => setShowLogin(true)}
              className="text-sm text-brand border border-brand/30 px-3 py-1.5 rounded-lg hover:bg-brand/10 transition">
              Entrar
            </button>
          )}
          <button onClick={() => setShowMural(true)}
            className="border border-brand/30 text-brand px-3 py-2 rounded-lg text-sm hover:bg-brand/10 transition">
            📢 Mural
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pb-32 pt-6">
        {/* Abertas */}
        {active.length > 0 && (
          <section className="mb-8">
            <p className="text-[#333] text-xs tracking-[3px] mb-4">ABERTAS</p>
            <div className="space-y-3">
              {active.map(s => (
                <CWCard key={s.id} session={s} onJoin={() => handleJoin(s)} />
              ))}
            </div>
          </section>
        )}

        {/* Empty */}
        {active.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎮</div>
            <p className="text-[#444] text-lg font-bold">Nenhuma CW aberta agora</p>
            <p className="text-[#333] text-sm mt-1">Seja o primeiro a abrir uma!</p>
          </div>
        )}

        {/* Recentes */}
        {recent.length > 0 && (
          <section>
            <p className="text-[#333] text-xs tracking-[3px] mb-4">RECENTES</p>
            <div className="space-y-3 opacity-50">
              {recent.map(s => (
                <CWCard key={s.id} session={s} onJoin={() => {}} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
        <button onClick={handleOpenCW}
          className="w-full bg-brand text-bg font-black text-sm tracking-[3px] py-5 rounded-2xl hover:brightness-110 transition active:scale-95 shadow-lg shadow-brand/20">
          + ABRIR CW
        </button>
      </div>

      {/* Modals */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showNewCW && player && <NewCWModal player={player} onClose={() => setShowNewCW(false)} />}
      {joinTarget && player && (
        <JoinModal
          session={joinTarget}
          player={player}
          onClose={() => setJoinTarget(null)}
        />
      )}
      {showMural && <MuralDrawer player={player} onClose={() => setShowMural(false)} onLogin={() => { setShowMural(false); setShowLogin(true); }} />}
    </main>
  );
}
