import { IsMongoId, IsInt, Min } from 'class-validator';
export class MoveTaskDto {
  @IsMongoId() columnId: string;
  @IsInt() @Min(0) position: number;
}
