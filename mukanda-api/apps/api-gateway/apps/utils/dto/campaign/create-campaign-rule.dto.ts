import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString, IsOptional, IsIn, IsArray,
  IsInt, Min, Max, Matches
} from 'class-validator'

// ✅ Regex para validar formato HH:mm
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export class CreateCampaignRuleDto {
  @ApiProperty({ example: 'text', enum: ['text', 'flyer'] })
  @IsString()
  @IsIn(['text', 'flyer'])
  contentType: string

  // ✅ Adicionado 'daily' que o frontend usa
  @ApiProperty({ example: 'daily', enum: ['daily', 'every2days', 'every3days', 'weekly', 'custom'] })
  @IsString()
  @IsIn(['daily', 'every2days', 'every3days', 'weekly', 'custom'])
  frequency: string

  @ApiPropertyOptional({
    example: ['Mon', 'Wed'],
    description: 'Apenas usado se frequency = custom (máx 3 dias)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customDays?: string[]

  @ApiProperty({ example: 1, minimum: 1, maximum: 2 })
  @IsInt()
  @Min(1)
  @Max(2)
  timesPerDay: number

  // ✅ Valida formato HH:mm
  @ApiProperty({ example: '16:00', description: 'Hora do primeiro envio (HH:mm)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'firstSendTime deve estar no formato HH:mm' })
  firstSendTime: string

  // ✅ Valida formato HH:mm quando presente
  @ApiPropertyOptional({ example: '20:00', description: 'Hora do segundo envio (HH:mm), apenas se timesPerDay = 2' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'secondSendTime deve estar no formato HH:mm' })
  secondSendTime?: string

  @ApiProperty({ example: 'all', enum: ['all', 'recent', 'inactive'] })
  @IsString()
  @IsIn(['all', 'recent', 'inactive'])
  audience: string

  // @ApiPropertyOptional({
  //   example: 'uploads/flyers/natal.png',
  //   description: 'Caminho do flyer, apenas se contentType = flyer',
  // })
  // @IsOptional()
  // @IsString()
  // flyerUrl?: string
  @ApiPropertyOptional({
    example: 'user@email.com/campanhas/clxabc123_flyer.jpg',
    description: 'Key R2 do flyer, preenchida automaticamente após upload',
  })
  @IsOptional()
  @IsString()
  flyerKey?: string
  
  @ApiPropertyOptional({
    example: 'Foca nos descontos de Natal',
    description: 'Dica extra para a IA gerar o texto',
  })
  @IsOptional()
  @IsString()
  aiPromptHint?: string
}