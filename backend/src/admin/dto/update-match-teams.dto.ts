import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateMatchTeamsDto {
  @IsOptional() @IsString() homeTeam?: string;
  @IsOptional() @IsString() awayTeam?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
}
