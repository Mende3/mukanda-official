import { ApiProperty } from '@nestjs/swagger'
import { PlanType } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator'

export class UpdateBusinessInfoDto {
    @ApiProperty({ example: 'Mercearia do Mendes' })
    @IsString()
    name: string

    @ApiProperty({ example: 'Empresa de produtos electronicos' })
    @IsString()
    description: string

}