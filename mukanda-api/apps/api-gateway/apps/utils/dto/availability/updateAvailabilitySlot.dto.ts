import { IsBoolean, IsInt, IsString, IsOptional, ValidateNested, IsArray } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { UpdateSlotDto } from './updateSlot.dto'

export class UpdateAvailabilityDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  acceptOrders?: boolean

  @ApiProperty({ type: [UpdateSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSlotDto)
  @IsOptional()
  slots?: UpdateSlotDto[]
}