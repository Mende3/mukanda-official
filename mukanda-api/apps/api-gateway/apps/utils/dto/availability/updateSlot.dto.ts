import { IsBoolean, IsInt, IsString, IsOptional, ValidateNested, IsArray } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateSlotDto {
  @ApiProperty({ example: 'uuid do slot' })
  @IsString()
  id: string

  @ApiProperty({ example: 1 })
  @IsInt()
  dayOfWeek: number

  @ApiProperty({ example: '08:00' })
  @IsString()
  startTime: string

  @ApiProperty({ example: '18:00' })
  @IsString()
  endTime: string

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean
}