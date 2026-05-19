import { PlayerRepository } from '../repositories/player.repository';
import { ReportRepository } from '../repositories/report.repository';
import { TournamentRepository } from '../repositories/tournament.repository';
import { EncryptionService } from './encryption.service';
import { WebSocketService } from './websocket.service';

export class ReportService {
  static async ingestReport(data: {
    playerId: string;
    matchId: string;
    detectionType: string;
    confidence: number;
    reasonCode: string;
    evidence?: string | null;
  }) {
    const player = await PlayerRepository.findById(data.playerId);
    if (!player) {
      throw { statusCode: 404, message: 'Target player not found.', messageFA: 'بازیکن مورد نظر یافت نشد.' };
    }

    const match = await TournamentRepository.findMatchById(data.matchId);
    if (!match) {
      throw { statusCode: 404, message: 'Target match not found.', messageFA: 'مسابقه مورد نظر یافت نشد.' };
    }

    // Encrypt evidence
    const evidenceEncrypted = data.evidence ? EncryptionService.encryptEvidence(data.evidence) : null;

    // Determine autoAction
    let autoAction: 'none' | 'flag' | 'kick' = 'none';
    const highRisk = ['AIMBOT', 'DMA_CARD', 'SPOOFER', 'WALLHACK', 'KMBOX'].includes(data.detectionType);

    if (highRisk && data.confidence > 0.9) {
      autoAction = 'kick';
    } else if (data.confidence > 0.75) {
      autoAction = 'flag';
    }

    const report = await ReportRepository.create({
      playerId: data.playerId,
      matchId: data.matchId,
      detectionType: data.detectionType as any,
      confidence: data.confidence.toString() as any,
      reasonCode: data.reasonCode,
      evidenceEncrypted,
      requiresHumanReview: true,
      autoAction,
      reviewStatus: 'pending',
    });

    if (autoAction === 'flag') {
      await PlayerRepository.updateBanStatus(
        data.playerId,
        'flagged',
        'warning',
        `Flagged by automated detection: ${data.detectionType}`,
        data.playerId
      );
    } else if (autoAction === 'kick') {
      await WebSocketService.broadcast(
        {
          type: 'match:kick_player',
          payload: {
            matchId: data.matchId,
            playerId: data.playerId,
            reason: `Kicked by automated detection: ${data.detectionType} (${Math.round(data.confidence * 100)}% confidence)`,
          },
        },
        data.matchId,
        match.tournamentId
      );
    }

    await WebSocketService.broadcast({
      type: 'report:new',
      payload: {
        reportId: report.id,
        playerId: data.playerId,
        matchId: data.matchId,
        detectionType: data.detectionType,
        confidence: data.confidence,
        autoAction,
      },
    });

    return report;
  }

  static async getReports(params: {
    page: number;
    limit: number;
    playerId?: string;
    matchId?: string;
    detectionType?: string;
    reviewStatus?: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
    minConfidence?: number;
    maxConfidence?: number;
  }) {
    return ReportRepository.findAll(params);
  }

  static async getReportById(id: string) {
    const report = await ReportRepository.findById(id);
    if (!report) {
      throw { statusCode: 404, message: 'Detection report not found.', messageFA: 'گزارش تخلف یافت نشد.' };
    }

    // Decrypt evidence server-side
    const evidenceDecrypted = report.evidenceEncrypted ? EncryptionService.decryptEvidence(report.evidenceEncrypted) : null;

    return {
      ...report,
      evidenceDecrypted,
    };
  }

  static async reviewReport(
    reportId: string,
    reviewedBy: string,
    data: {
      reviewStatus: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
      action?: 'none' | 'flag' | 'ban';
      banType?: 'warning' | 'match_ban' | 'tournament_ban' | 'permanent_ban';
      reason?: string;
    }
  ) {
    const updated = await ReportRepository.reviewReport(
      reportId,
      reviewedBy,
      data.reviewStatus,
      data.action,
      data.banType,
      data.reason
    );

    if (updated) {
      await WebSocketService.broadcast({
        type: 'report:reviewed',
        payload: {
          reportId,
          reviewStatus: data.reviewStatus,
          action: data.action,
          reviewedBy,
        },
      });
    }

    return updated;
  }
}
