import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
    IsString,
    IsNumber,
    IsOptional,
    IsBoolean,
    IsInt,
    Min,
    IsPositive,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateProductDto {
    @ApiProperty({ example: 'Arroz 5kg' })
    @IsString()
    name: string

    @ApiPropertyOptional({ example: 'Alimentação' })
    @IsOptional()
    @IsString()
    category?: string

    @ApiProperty({ example: 1500 })
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    price: number

    @ApiPropertyOptional({ example: 'kg', default: 'unidade' })
    @IsOptional()
    @IsString()
    unit?: string

    @ApiPropertyOptional({ example: 'Arroz branco de qualidade premium' })
    @IsOptional()
    @IsString()
    description?: string

    @ApiPropertyOptional({ example: 10, default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    initialStock?: number

    @ApiPropertyOptional({ example: 5, default: 5 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    minQuantity?: number

    @ApiPropertyOptional({ example: false, default: false })
    @IsOptional()
    @IsBoolean()
    aiSuggested?: boolean
}