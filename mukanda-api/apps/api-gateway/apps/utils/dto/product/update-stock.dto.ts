import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsIn, Min } from 'class-validator'

export class UpdateStockDto {
    @ApiProperty({ example: 10 })
    @IsInt()
    @Min(1)
    quantity: number

    @ApiProperty({ example: 'add', enum: ['add', 'subtract', 'set'] })
    @IsIn(['add', 'subtract', 'set'])
    operation: 'add' | 'subtract' | 'set'
}