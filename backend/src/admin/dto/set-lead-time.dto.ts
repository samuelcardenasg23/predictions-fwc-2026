import { IsInt, Max, Min } from 'class-validator';

export class SetLeadTimeDto {
  /** Minutes before each knockout match's kickoff that its prediction window closes. */
  @IsInt()
  @Min(0)
  @Max(10080) // up to 7 days
  minutes: number;
}
