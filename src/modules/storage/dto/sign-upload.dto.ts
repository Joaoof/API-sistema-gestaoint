import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const ALLOWED = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];

export class SignUploadDto {
  @IsString()
  filename!: string;

  @IsIn(ALLOWED, {
    message: `contentType deve ser um de: ${ALLOWED.join(', ')}`,
  })
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024)
  size!: number;

  @IsOptional()
  @IsString()
  folder?: string;
}
