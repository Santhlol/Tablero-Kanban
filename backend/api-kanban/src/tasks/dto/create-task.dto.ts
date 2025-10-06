import { IsMongoId, IsInt, IsOptional, IsString, Min } from 'class-validator';
export class CreateTaskDto {
  @IsMongoId() boardId: string;
  @IsMongoId() columnId: string;
  @IsString()  title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() assignee?: string;
  @IsInt() @Min(0) position: number;
}
