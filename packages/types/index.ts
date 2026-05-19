// Player
export interface Player {
  id: string;
  username: string;
  usernameFA: string;
  email: string;
  role: 'player' | 'team_captain' | 'tournament_admin' | 'super_admin';
  teamId: string | null;
  banStatus: 'clean' | 'flagged' | 'banned';
  createdAt: string;
  updatedAt: string;
}

// Team
export interface Team {
  id: string;
  name: string;
  nameFA: string;
  captainId: string;
  players: Player[];
  createdAt: string;
}

// Tournament
export interface Tournament {
  id: string;
  name: string;
  nameFA: string;
  status: 'upcoming' | 'registration' | 'active' | 'completed';
  maxTeams: number;
  registeredTeams: number;
  startDate: string;
  prizePool: number;
  currency: 'IRR' | 'USDT';
}

// Detection Report
export interface DetectionReport {
  id: string;
  playerId: string;
  matchId: string;
  detectionType: DetectionType;
  confidence: number;
  reasonCode: string;
  requiresHumanReview: boolean;
  autoAction: 'none' | 'flag' | 'kick';
  reviewedBy: string | null;
  createdAt: string;
}

export type DetectionType =
  | 'AIMBOT'
  | 'WALLHACK'
  | 'RADAR_HACK'
  | 'TRIGGER_BOT'
  | 'NO_RECOIL'
  | 'SPEED_HACK'
  | 'SPOOFER'
  | 'DMA_CARD'
  | 'KMBOX'
  | 'ARDUINO_INPUT'
  | 'DUAL_PC_STREAM'
  | 'MACRO_PATTERN'
  | 'STATISTICAL_OUTLIER';

export interface Match {
  id: string;
  tournamentId: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamANameFA: string;
  teamBNameFA: string;
  teamALogo?: string;
  teamBLogo?: string;
  durationSeconds: number;
  detectionAlertsCount: number;
  status: 'live' | 'paused' | 'ended';
  createdAt: string;
}

