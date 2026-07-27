import { ApiProperty } from '@nestjs/swagger'
import { PlanType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export class UpdateBusinessInfoAdminDto {
  @ApiProperty({ example: 'Mercearia do Mendes', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Empresa de produtos electronicos', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}