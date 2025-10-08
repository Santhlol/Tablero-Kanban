import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
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

  @ValidateIf(dto => !dto.to)
  @IsEmail()
  email?: string;

  @ValidateIf(dto => !dto.email)
  @IsEmail()
  to?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  fields?: ExportField[];

  @IsOptional()
  @IsString()
  error?: string;
}
