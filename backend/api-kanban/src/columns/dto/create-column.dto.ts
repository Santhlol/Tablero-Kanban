import { IsMongoId, IsInt, IsString, Min } from 'class-validator';
export class CreateColumnDto {
  @IsMongoId() boardId: string;
  @IsString() title: string;
  @IsInt() @Min(0) position: number;
}
