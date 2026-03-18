import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { findMany } from './global.interface';

export class FindMany implements findMany {
  @Min(1)
  @IsInt()
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @ApiPropertyOptional({ type: Number })
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @ApiPropertyOptional({ type: Number })
  limit?: number = 30;

  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }: { value: string | string[] }) =>
    typeof value === 'string' ? [value] : value,
  )
  sort?: string[] = ['updatedAt'];

  @IsOptional()
  @ApiPropertyOptional({ type: [String] })
  @IsString({ each: true })
  @Transform(({ value }: { value: string | string[] }) =>
    typeof value === 'string' ? [value] : value,
  )
  include?: string[];

  @IsOptional()
  @ApiPropertyOptional({ type: String })
  @IsString()
  search?: string;
}
