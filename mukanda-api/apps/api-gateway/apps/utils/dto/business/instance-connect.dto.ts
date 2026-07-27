import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, Matches } from 'class-validator'

export class InstanceConnectDto {
   
    @ApiProperty({ example: '+244923000000' })
    @Matches(/^\+244[9][0-9]{8}$/, {
        message: 'Número de WhatsApp inválido. Formato: +244 seguido de 9 dígitos começando por 9',
    })
    @IsString()
    phone: string;

    @ApiPropertyOptional({ example: 'token da instancia do evo go' })
    @IsString()
    token: string;

}