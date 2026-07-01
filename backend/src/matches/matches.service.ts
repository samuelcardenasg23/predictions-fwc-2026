import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MatchPhase, MatchStage } from '@prisma/client';
import { UpdateMatchDto } from './dto/update-match.dto.js';
import {
  KNOCKOUT_LEAD_TIME_KEY,
  isKnockoutEditable,
  knockoutCloseAt,
  parseLeadMinutes,
} from '../predictions/knockout-window.util.js';

const KNOCKOUT_STAGES: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  /** Knockout prediction lead time (minutes before kickoff), from SystemConfig. */
  private async getKnockoutLeadMinutes(): Promise<number> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: KNOCKOUT_LEAD_TIME_KEY },
    });
    return parseLeadMinutes(config?.value);
  }

  async getStagesStatus(): Promise<Record<MatchStage, 'inactive' | 'open' | 'locked'>> {
    const now = new Date();
    const leadMinutes = await this.getKnockoutLeadMinutes();
    const result = {} as Record<MatchStage, 'inactive' | 'open' | 'locked'>;

    for (const stage of KNOCKOUT_STAGES) {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: `knockout_${stage.toLowerCase()}_open` },
      });

      if (config?.value !== 'true') {
        result[stage] = 'inactive';
        continue;
      }

      const matches = await this.prisma.match.findMany({
        where: { stage },
        select: { scheduledAt: true },
      });

      // A round is "locked" only when every match's per-match window has closed —
      // there's nothing left to edit. While at least one is open, it stays "open".
      const anyOpen =
        matches.length === 0 ||
        matches.some((m) => isKnockoutEditable(m.scheduledAt, leadMinutes, now));
      result[stage] = anyOpen ? 'open' : 'locked';
    }

    return result;
  }

  async findAll(phase?: string, stage?: string) {
    const [matches, leadMinutes] = await Promise.all([
      this.prisma.match.findMany({
        where: {
          ...(phase ? { phase: phase as MatchPhase } : {}),
          ...(stage ? { stage: stage as MatchStage } : {}),
        },
        orderBy: [{ scheduledAt: 'asc' }, { matchOrder: 'asc' }],
      }),
      this.getKnockoutLeadMinutes(),
    ]);

    const now = new Date();
    return matches.map((m) => {
      // Per-match window applies to knockout only; group stage uses its own flow.
      if (m.phase !== MatchPhase.KNOCKOUT) {
        return { ...m, predictionCloseAt: null, editable: null };
      }
      return {
        ...m,
        predictionCloseAt: knockoutCloseAt(m.scheduledAt, leadMinutes).toISOString(),
        editable: isKnockoutEditable(m.scheduledAt, leadMinutes, now),
      };
    });
  }

  findOne(id: string) {
    return this.prisma.match.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, dto: UpdateMatchDto) {
    return this.prisma.match.update({
      where: { id },
      data: {
        ...(dto.homeTeam !== undefined ? { homeTeam: dto.homeTeam } : {}),
        ...(dto.awayTeam !== undefined ? { awayTeam: dto.awayTeam } : {}),
        ...(dto.scheduledAt !== undefined ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.externalId !== undefined ? { externalId: dto.externalId } : {}),
        ...(dto.homeScore !== undefined ? { homeScore: dto.homeScore } : {}),
        ...(dto.awayScore !== undefined ? { awayScore: dto.awayScore } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }
}
