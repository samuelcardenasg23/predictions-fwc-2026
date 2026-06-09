import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MatchPhase, MatchStage } from '@prisma/client';
import { UpdateMatchDto } from './dto/update-match.dto.js';

const KNOCKOUT_STAGES: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  async getStagesStatus(): Promise<Record<MatchStage, 'inactive' | 'open' | 'locked'>> {
    const now = new Date();
    const result = {} as Record<MatchStage, 'inactive' | 'open' | 'locked'>;

    for (const stage of KNOCKOUT_STAGES) {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: `knockout_${stage.toLowerCase()}_open` },
      });

      if (config?.value !== 'true') {
        result[stage] = 'inactive';
        continue;
      }

      const firstMatch = await this.prisma.match.findFirst({
        where: { stage },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      });

      result[stage] = firstMatch && firstMatch.scheduledAt <= now ? 'locked' : 'open';
    }

    return result;
  }

  findAll(phase?: string, stage?: string) {
    return this.prisma.match.findMany({
      where: {
        ...(phase ? { phase: phase as MatchPhase } : {}),
        ...(stage ? { stage: stage as MatchStage } : {}),
      },
      orderBy: [{ scheduledAt: 'asc' }, { matchOrder: 'asc' }],
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
