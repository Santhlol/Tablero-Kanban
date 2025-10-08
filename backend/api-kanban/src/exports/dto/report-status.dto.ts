import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
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

const REPORTED_STATUS_VALUES = ['success', 'completed', 'ok', 'error', 'failed', 'failure'] as const;

export type ReportedExportStatus = (typeof REPORTED_STATUS_VALUES)[number];

export const normalizeReportedStatus = (status: ReportedExportStatus): ExportFinalStatus =>
  status === 'success' || status === 'completed' || status === 'ok'
    ? ExportFinalStatus.Success
    : ExportFinalStatus.Error;

export class ReportStatusDto {
  @IsString()
  @IsNotEmpty()
  requestId!: string;

  @IsString()
  @IsNotEmpty()
  boardId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsIn(REPORTED_STATUS_VALUES)
  status!: ReportedExportStatus;

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
