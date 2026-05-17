export type CWFormat = '3v3' | '4v4' | '5v5' | '6v6' | '7v7';

export const FORMAT_SIZES: Record<CWFormat, number> = {
  '3v3': 6, '4v4': 8, '5v5': 10, '6v6': 12, '7v7': 14,
};

export interface Player {
  id: string;
  name: string;
  email: string;
  notifyNewCW: boolean;
  notifyAlmostFull: boolean;
  notifyClosed: boolean;
  joinedAt: Date;
  status: 'confirmed' | 'waiting';
  position: number;
}

export interface CWSession {
  id: string;
  format: CWFormat;
  totalSlots: number;
  closingTime: Date;
  createdBy: string;
  createdAt: Date;
  status: 'open' | 'closing_soon' | 'closed';
  sortTeams: boolean;
  teamA?: string[];
  teamB?: string[];
}

export interface Notice {
  id: string;
  playerName: string;
  text: string;
  createdAt: Date;
}
