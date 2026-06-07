import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested, IsInt, Min } from 'class-validator';

class PredictionItem {
  @IsString()
  matchId: string;

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

export class BulkPredictionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PredictionItem)
  predictions: PredictionItem[];
}
