'use client';
import { useEffect, useState, use } from 'react';
import { listenSessions, listenPlayers, leaveCW, promoteFirst, closeCW, updateStatus, canJoin, joinCW } from '@/lib/cwService';
import { sendEmails } from '@/lib/emailService';
import { CWSession, Player } from '@/types';
import { useLocalPlayer } from '@/components/PlayerProvider';
import LoginModal from '@/components/LoginModal';
import Link from 'next/link';

export default function CWPage({ params }: { params: Promise<{ id: string }> }) {
  // Desembrulha os parâmetros usando o hook 'use' nativo do Next.js
  const resolvedParams = use(params);
  const id = resolvedParams.id;

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
    if (!id) return;
    return listenSessions(all => {
      const s = all.find(s => s.id === id);
      if (s) setSession(s);
    });
  }, [id]);

  useEffect(() => {
    if (id) return listenPlayers(id, setPlayers);
  }, [id]);

  // Lógica Dinâmica para verificar e fechar CWs por tamanho de lista completo
  useEffect(() => {
    if (!session || session.status === 'closed' || !id) return;

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
    if (!session || session.status === 'closed' || !session.closingTime || !id) return;
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
    if (!id) return;
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
    if (!player || !myEntry || !id) return;
    setLoading(true);
    try {
      await leaveCW(id, myEntry.id);
      if (myEntry.status === 'confirmed' && waiting.length > 0) {
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
          <p className="text-[#444] text-xs