import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, Matches, IsEnum, IsEmail } from 'class-validator'


export class CreateBusinessDto {
    @ApiProperty({ example: 'Mercearia do Mendes' })
    @IsString()
    name: string;

    @ApiProperty({ example: '+244923000000' })
    @Matches(/^\+244[9][0-9]{8}$/, {
        message: 'Número de WhatsApp inválido. Formato: +244 seguido de 9 dígitos começando por 9',
    })
    @IsString()
    phone: string;

    @ApiPropertyOptional({ example: 'Empresa de produtos electronicos' })
    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    city?: string

    @IsString()
    state?: string

    @IsString()
    postal_code?: string
}