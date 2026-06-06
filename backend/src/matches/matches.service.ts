import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MatchPhase, MatchStage } from '@prisma/client';
import { UpdateMatchDto } from './dto/update-match.dto.js';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

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
