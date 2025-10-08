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

export const EXPORTABLE_FIELDS = ['id', 'title', 'description', 'column', 'createdAt'] as const;
export type ExportField = (typeof EXPORTABLE_FIELDS)[number];

export class RequestExportDto {
  @IsString()
  @IsNotEmpty()
  boardId!: string;

  @ValidateIf(dto => !dto.email)
  @IsEmail()
  to?: string;

  @ValidateIf(dto => !dto.to)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(EXPORTABLE_FIELDS, { each: true })
  fields?: ExportField[];
}
