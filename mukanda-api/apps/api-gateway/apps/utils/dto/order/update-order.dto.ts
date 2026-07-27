import { IsEnum, IsDateString, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { OrderStatus } from 'apps/business-service/generated/prisma'

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus

  @ApiPropertyOptional({ example: '2026-04-10T14:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string

  @ApiPropertyOptional({ example: 'Novo horário confirmado' })
  @IsString()
  @IsOptional()
  notes?: string
}