'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface LocalPlayer {
  name: string;
  email: string;
  notifyNewCW: boolean;
  notifyAlmostFull: boolean;
  notifyClosed: boolean;
}

interface Ctx {
  player: LocalPlayer | null;
  setPlayer: (p: LocalPlayer) => void;
  clearPlayer: () => void;
}

const PlayerCtx = createContext<Ctx>({ player: null, setPlayer: () => {}, clearPlayer: () => {} });

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayerState] = useState<LocalPlayer | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('cw_player');
    if (raw) setPlayerState(JSON.parse(raw));
  }, []);

  const setPlayer = (p: LocalPlayer) => {
    localStorage.setItem('cw_player', JSON.stringify(p));
    setPlayerState(p);
  };

  const clearPlayer = () => {
    localStorage.removeItem('cw_player');
    setPlayerState(null);
  };

  return <PlayerCtx.Provider value={{ player, setPlayer, clearPlayer }}>{children}</PlayerCtx.Provider>;
}

export const useLocalPlayer = () => useContext(PlayerCtx);
