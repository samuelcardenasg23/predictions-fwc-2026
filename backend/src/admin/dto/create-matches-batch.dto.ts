import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { MatchPhase, MatchStage } from '@prisma/client';

class CreateMatchItem {
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

export class CreateMatchesBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMatchItem)
  matches: CreateMatchItem[];
}
