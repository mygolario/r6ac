import { PlayerRepository } from '../repositories/player.repository';
import { EncryptionService } from './encryption.service';
import { WebSocketService } from './websocket.service';

export class PlayerService {
  static async getPlayers(params: {
    page: number;
    limit: number;
    search?: string;
    banStatus?: 'clean' | 'flagged' | 'banned';
    teamId?: string;
  }) {
    const result = await PlayerRepository.findAll(params);
    const connectedUserIds = WebSocketService.getConnectedUserIds();

    const mappedItems = result.items.map((player) => ({
      ...player,
      isLive: connectedUserIds.has(player.id)
    }));

    return {
      ...result,
      items: mappedItems,
      players: mappedItems,
    };
  }

  static async getPlayerById(id: string) {
    const player = await PlayerRepository.findById(id);
    if (!player) {
      throw { statusCode: 404, message: 'Player not found.', messageFA: 'بازیکن مورد نظر یافت نشد.' };
    }
    return player;
  }

  static async updateBanStatus(
    playerId: string,
    data: {
      banStatus: 'clean' | 'flagged' | 'banned';
      reason: string;
      banType: 'warning' | 'match_ban' | 'tournament_ban' | 'permanent_ban';
      expiresAt?: string | null;
      tournamentId?: string | null;
    },
    issuedBy: string
  ) {
    const updated = await PlayerRepository.updateBanStatus(
      playerId,
      data.banStatus,
      data.banType,
      data.reason,
      issuedBy,
      data.expiresAt ? new Date(data.expiresAt) : null,
      data.tournamentId
    );

    if (updated) {
      await WebSocketService.broadcast({
        type: 'player:ban_status_changed',
        payload: {
          playerId,
          username: updated.username,
          banStatus: updated.banStatus,
          banType: data.banType,
          reason: data.reason,
        },
      });
    }

    return updated;
  }

  static async updateHardwareFingerprint(playerId: string, fingerprintHash: string) {
    const hashed = EncryptionService.hashSha256(fingerprintHash);
    return PlayerRepository.updateHardwareFingerprint(playerId, hashed);
  }

  static async updateHwid(playerId: string, hwid: string) {
    return PlayerRepository.updateHwid(playerId, hwid);
  }

  static async resetHwid(playerId: string) {
    return PlayerRepository.updateHwid(playerId, null);
  }
}
