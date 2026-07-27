import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString, IsOptional, IsNotEmpty,
  IsDateString, ValidateNested, ArrayMaxSize
} from 'class-validator'
import { CreateCampaignRuleDto } from './create-campaign-rule.dto'
import { Type } from 'class-transformer'

export class CreateCampaignDto {
  @ApiProperty({ example: 'Promoção de Natal', description: 'Nome identificador da campanha' })
  @IsString()
  @IsNotEmpty()
  name: string

//   @ApiPropertyOptional({ example: 'Natal', description: 'Tema da campanha' })
//   @IsOptional()
//   @IsString()
//   theme?: string

  @ApiProperty({
    example: 'Olá! Temos promoções especiais para si.',
    description: 'Mensagem principal da campanha',
  })
  @IsString()
  @IsNotEmpty()
  message: string

  @IsString()
  agentId: string;

//   @ApiPropertyOptional({
//     example: '2026-04-10T12:00:00.000Z',
//     description: 'Data de agendamento da campanha',
//   })
//   @IsOptional()
//   @IsDateString()
//   scheduledAt?: string

  // ✅ Máximo 3 rules por campanha (consistente com o limite do frontend)
  @ApiPropertyOptional({
    type: [CreateCampaignRuleDto],
    description: 'Regras de envio da campanha (máx 3)',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @ArrayMaxSize(3, { message: 'Máximo de 3 regras por campanha' })
  @Type(() => CreateCampaignRuleDto)
  rules?: CreateCampaignRuleDto[]
}