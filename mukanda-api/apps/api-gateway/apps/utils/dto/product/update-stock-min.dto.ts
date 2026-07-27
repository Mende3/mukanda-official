import { IsInt, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateMinStockDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  minQuantity: number
}