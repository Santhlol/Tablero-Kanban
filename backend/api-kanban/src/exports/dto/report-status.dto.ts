import { ArrayNotEmpty, ArrayUnique, IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExportField } from './request-export.dto';

export enum ExportFinalStatus {
  Success = 'success',
  Error = 'error',
}

export class ReportStatusDto {
  @IsString()
  @IsNotEmpty()
  requestId!: string;

  @IsString()
  @IsNotEmpty()
  boardId!: string;

  @IsEnum(ExportFinalStatus)
  status!: ExportFinalStatus;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  fields?: ExportField[];

  @IsOptional()
  @IsString()
  error?: string;
}
