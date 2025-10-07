import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
