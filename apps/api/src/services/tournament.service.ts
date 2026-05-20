import { PlayerRepository } from '../repositories/player.repository';
import { TournamentRepository } from '../repositories/tournament.repository';
import { WebSocketService } from './websocket.service';

export class TournamentService {
  static async getTournaments(params: {
    page: number;
    limit: number;
    status?: 'upcoming' | 'registration' | 'active' | 'completed';
  }) {
    return TournamentRepository.findAll(params);
  }

  static async createTournament(
    data: {
      name: string;
      nameFA?: string;
      status: 'upcoming' | 'registration' | 'active' | 'completed';
      maxTeams: number;
      prizePool: number;
      currency: 'IRR' | 'USDT';
      startDate: string;
      endDate?: string | null;
    },
    createdBy: string
  ) {
    const t = await TournamentRepository.create({
      name: data.name,
      nameFa: data.nameFA,
      status: data.status,
      maxTeams: data.maxTeams,
      prizePool: data.prizePool,
      currency: data.currency,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      createdBy,
    });

    await WebSocketService.broadcast({
      type: 'tournament:status_changed',
      payload: {
        tournamentId: t.id,
        status: t.status,
      },
    });

    return t;
  }

  static async getTournamentById(id: string) {
    const t = await TournamentRepository.findById(id);
    if (!t) {
      throw { statusCode: 404, message: 'Tournament not found.', messageFA: 'تورنمنت مورد نظر یافت نشد.' };
    }
    return t;
  }

  static async registerTeam(tournamentId: string, teamCaptainId: string) {
    const player = await PlayerRepository.findById(teamCaptainId);
    if (!player || !player.teamId || player.role !== 'team_captain') {
      throw {
        statusCode: 403,
        message: 'Only a team captain can register a team.',
        messageFA: 'فقط کاپیتان تیم می‌تواند در تورنمنت ثبت‌نام کند.',
      };
    }

    const t = await TournamentRepository.findById(tournamentId);
    if (!t || t.status !== 'registration') {
      throw {
        statusCode: 400,
        message: 'Tournament is not open for registration.',
        messageFA: 'زمان ثبت‌نام در این تورنمنت به پایان رسیده یا شروع نشده است.',
      };
    }

    if (t.registeredTeamsCount >= t.maxTeams) {
      throw {
        statusCode: 400,
        message: 'Tournament has reached maximum team capacity.',
        messageFA: 'ظرفیت تورنمنت تکمیل شده است.',
      };
    }

    const isRegistered = await TournamentRepository.isTeamRegistered(tournamentId, player.teamId);
    if (isRegistered) {
      throw { statusCode: 400, message: 'Team is already registered.', messageFA: 'تیم شما قبلاً ثبت‌نام کرده است.' };
    }

    return TournamentRepository.registerTeam(tournamentId, player.teamId);
  }

  static async getBracket(tournamentId: string) {
    return TournamentRepository.getBracket(tournamentId);
  }

  static async updateMatch(
    tournamentId: string,
    matchId: string,
    data: {
      status: 'scheduled' | 'live' | 'paused' | 'completed';
      scoreA: number;
      scoreB: number;
      electroSessionCode?: string | null;
    }
  ) {
    const m = await TournamentRepository.findMatchById(matchId);
    if (!m || m.tournamentId !== tournamentId) {
      throw { statusCode: 404, message: 'Match not found in this tournament.', messageFA: 'مسابقه مورد نظر یافت نشد.' };
    }

    const updated = await TournamentRepository.updateMatch(matchId, data);

    await WebSocketService.broadcast(
      {
        type: 'match:updated',
        payload: {
          matchId: updated.id,
          tournamentId,
          status: updated.status,
          scoreA: updated.scoreA,
          scoreB: updated.scoreB,
        },
      },
      matchId,
      tournamentId
    );

    return updated;
  }

  static async getLiveMatches() {
    return TournamentRepository.findLiveMatches();
  }
}
