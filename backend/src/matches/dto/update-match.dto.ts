import { IsString, IsOptional, IsDateString, IsInt, IsEnum, Min } from 'class-validator';
import { MatchStatus } from '@prisma/client';

export class UpdateMatchDto {
  @IsOptional()
  @IsString()
  homeTeam?: string;

  @IsOptional()
  @IsString()
  awayTeam?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  externalId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  homeScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  awayScore?: number;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
