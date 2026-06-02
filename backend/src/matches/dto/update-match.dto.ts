import { IsString, IsOptional, IsDateString, IsInt } from 'class-validator';

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
}
