import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested, IsInt, Min } from 'class-validator';

class PredictionItem {
  @IsString()
  matchId: string;

  @IsInt()
  @Min(0)
  homeScore: number;

  @IsInt()
  @Min(0)
  awayScore: number;
}

export class BulkPredictionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PredictionItem)
  predictions: PredictionItem[];
}
