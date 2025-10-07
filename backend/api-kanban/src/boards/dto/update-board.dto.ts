import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  owner?: string;
}
