import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { MatchPhase, MatchStage } from '@prisma/client';

export class CreateMatchDto {
  @IsString()
  homeTeam: string;

  @IsString()
  awayTeam: string;

  @IsDateString()
  scheduledAt: string;

  @IsEnum(MatchStage)
  stage: MatchStage;

  @IsEnum(MatchPhase)
  phase: MatchPhase;

  @IsOptional()
  @IsInt()
  matchOrder?: number;
}
