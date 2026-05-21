'use client';
import { useEffect, useState } from 'react';
import { listenSessions, listenPlayers, leaveCW, promoteFirst, closeCW, updateStatus, canJoin, joinCW } from '@/lib/cwService';
import { sendEmails } from '@/lib/emailService';
import { CWSession, Player } from '@/types';
import { useLocalPlayer } from '@/components/PlayerProvider';
import LoginModal from '@/components/LoginModal';
import Link from 'next/link';

export default function CWPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { player, setPlayer } = useLocalPlayer();
  const [session, setSession] = useState<CWSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => { 
    const t = setInterval(() => setNow(new Date()), 1000); 
    return () => clearInterval(t); 
  }, []);

  useEffect(() => {
    return listenSessions(all => {
      const s = all.find(s => s.id === id);
      if (s) setSession(s);
    });
  }, [id]);

  useEffect(() => listenPlayers(id, setPlayers), [id]);

  // Lógica Dinâmica para verificar e fechar CWs por tamanho de lista completo
  useEffect(() => {
    if (!session || session.status === 'closed') return;

    const confirmedPlayers = players.filter(p => p.status === 'confirmed');
    const totalConfirmed = confirmedPlayers.length;

    // Tamanhos válidos aceitos para fechamento automático: 6(3v3), 8(4v4), 10(5v5), 12(6v6), 14(7v7), 16(8v8)
    const validSizes = [6, 8, 10, 12, 14, 16];
    
    if (validSizes.includes(totalConfirmed) && session.format !== `${totalConfirmed/2}v${totalConfirmed/2}`) {
      const currentFormat = `${totalConfirmed/2}v${totalConfirmed/2}`;
      
      const autoClose = async () => {
        await updateStatus(id, 'closed', currentFormat, totalConfirmed);
        
        const timeLabel = session.closingTime ? new Date(session.closingTime.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        
        await sendEmails({
          type: 'cw_closed',
          cwId: id,
          time: timeLabel,
          creator: session.createdBy,
          format: currentFormat
        });
      };
      
      autoClose().catch(console.error);
    }
  }, [players, session, id]);

  // Auto-fechar por tempo esgotado
  useEffect(() => {
    if (!session || session.status === 'closed' || !session.closingTime) return;
    const limit = new Date(session.closingTime.seconds * 1000);
    if (now >= limit) {
      const confirmed = players.filter(p => p.status === 'confirmed').length;
      const finalFormat = confirmed >= 6 ? `${Math.floor(confirmed/2)}v${Math.floor(confirmed/2)}` : 'Cancelada';
      closeCW(id, finalFormat).catch(console.error);
    }
  }, [now, session, players, id]);

  if (!session) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
        <p className="text-[#444] text-sm font-bold animate-pulse">Carregando dados do lobby...</p>
      </div>
    );
  }

  const confirmed = players.filter(p => p.status === 'confirmed');
  const waiting = players.filter(p => p.status === 'waiting');
  const myEntry = players.find(p => p.name === player?.name);
  const isClosed = session.status === 'closed';

  const check = canJoin(session, players, player?.name || '');

  const handleJoin = async () => {
    if (!player) { setShowLogin(true); return; }
    setLoading(true);
    try {
      const targetStatus = confirmed.length < 16 ? 'confirmed' : 'waiting';
      await joinCW(id, player, targetStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!player || !myEntry) return;
    setLoading(true);
    try {
      await leaveCW(id, myEntry.id);
      if (myEntry.status === 'confirmed' && waiting.length > 0) {
        // Correção aplicada para passar os dois parâmetros esperados pelo cwService
        await promoteFirst(id, waiting[0]); 
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const limitDate = session.closingTime ? new Date(session.closingTime.seconds * 1000) : null;
  const diffMs = limitDate ? limitDate.getTime() - now.getTime() : 0;
  const diffMin = Math.ceil(diffMs / (1000 * 60));
  const timeLabel = limitDate ? limitDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  return (
    <div className="min-h-screen bg-bg text-white font-sans pb-32">
      {/* Top Bar */}
      <div className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-[#555] hover:text-white font-bold text-sm transition flex items-center gap-2">
            <span>←</span> Voltar para a Home
          </Link>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isClosed ? 'bg-red-500' : 'bg-brand animate-pulse'}`} />
            <span className="text-xs font-black tracking-widest text-[#555] uppercase">
              {isClosed ? `FECHADA (${session.format})` : 'LOBBY DINÂMICO'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6">
        {/* Card Principal */}
        <div className="bg-surface border border-border rounded-3xl p-6 relative overflow-hidden mb-6">
          <p className="text-[#444] text-xs font-black tracking-widest uppercase mb-1">Horário do Jogo</p>
          <h2 className="text-white font-black text-4xl mb-4">🕒 {timeLabel}</h2>
          
          {!isClosed && diffMin > 0 && (
            <div className="bg-brand/5 border border-brand/10 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-xs text-[#666] font-medium">Tempo restante para fechar a lista:</span>
              <span className="text-brand font-black text-sm">{diffMin} min</span>
            </div>
          )}
        </div>

        {/* Lista de Confirmados */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-black text-sm tracking-widest text-[#444] uppercase">Jogadores no Lobby ({confirmed.length})</h3>
            <span className="text-xs text-[#555] font-bold">Próximo corte em: 6, 8, 10, 12, 14, 16</span>
          </div>

          <div className="space-y-2.5">
            {confirmed.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition ${p.name === player?.name ? 'bg-brand/5 border-brand/30' : 'bg-surface border-border'}`}>
                <span className={`text-sm font-bold ${p.name === player?.name ? 'text-brand' : 'text-white'}`}>
                  {i + 1}. {p.name} {p.name === player?.name ? ' (você)' : ''}
                </span>
                <span className="text-brand/60 text-xs font-black">✔ CONFIRMADO</span>
              </div>
            ))}
            {confirmed.length === 0 && (
              <p className="text-[#333] text-center text-sm font-bold py-8 border border-dashed border-border rounded-2xl">Nenhum jogador confirmado ainda.</p>
            )}
          </div>
        </div>

        {/* Lista de Espera */}
        {waiting.length > 0 && (
          <div>
            <h3 className="font-black text-sm tracking-widest text-