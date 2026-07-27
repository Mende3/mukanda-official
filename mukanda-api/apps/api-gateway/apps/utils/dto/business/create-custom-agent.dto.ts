// create-agent.dto.ts
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomAgentDto {
  @ApiProperty({ example: 'Agente de Suporte Técnico' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Agente personalizado para suporte técnico' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'https://n8n.mukanda.ao/webhook/custom-suporte' })
  @IsUrl()
  webhook: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ example: 'És um agente de suporte técnico...' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ example: 'professional' })
  @IsOptional()
  @IsString()
  personality?: string;

  @ApiPropertyOptional({ example: 'after_order' })
  @IsOptional()
  @IsString()
  pollTrigger?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pollMinInterval?: number;
}