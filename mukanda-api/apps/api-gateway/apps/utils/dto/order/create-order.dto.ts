import { IsString, IsOptional, IsArray, IsInt, IsNumber, IsDateString, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateOrderItemDto {
  @ApiProperty({ example: 'uuid do produto' })
  @IsString()
  productId: string

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiProperty({ example: 4250.00 })
  @IsNumber()
  unitPrice: number
}

export class CreateOrderDto {
  @ApiProperty({ example: '2026-04-10T14:00:00Z' })
  @IsDateString()
  scheduledAt: string

  @ApiPropertyOptional({ example: 'Entregar em casa' })
  @IsString()
  @IsOptional()
  notes?: string

  @ApiPropertyOptional({ example: 'Nome do cliente' })
  @IsString()
  @IsOptional()
  clientName?: string

  @ApiPropertyOptional({ example: 'numero do cliente' })
  @IsString()
  @IsOptional()
  clientNumber?: string

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[]
}