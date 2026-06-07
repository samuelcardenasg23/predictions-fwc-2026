import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertPredictionDto {
  @IsInt()
  @Min(0)
  homeScore: number;

  @IsInt()
  @Min(0)
  awayScore: number;

  @IsOptional()
  @IsString()
  homeTeamPick?: string;

  @IsOptional()
  @IsString()
  awayTeamPick?: string;
}
