// dto/create-checkout-session.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUrl } from 'class-validator';
import { PlanType } from 'libs/src/shared/src';

const UPGRADABLE_PLANS = [PlanType.BASIC, PlanType.PRO, PlanType.BUSINESS];

export class CreateCheckoutSessionDto {
    @ApiProperty({ enum: UPGRADABLE_PLANS, example: PlanType.PRO })
    @IsIn(UPGRADABLE_PLANS, { message: 'Plano inválido para upgrade' })
    plan: PlanType;

    @ApiPropertyOptional({ example: 'https://app.mukanda.ao/billing/sucesso' })
    @IsOptional()
    @IsUrl()
    successUrl?: string;

    @ApiPropertyOptional({ example: 'https://app.mukanda.ao/billing/cancelado' })
    @IsOptional()
    @IsUrl()
    cancelUrl?: string;
}