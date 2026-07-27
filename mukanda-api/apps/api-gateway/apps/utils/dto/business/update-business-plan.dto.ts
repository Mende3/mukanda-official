import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator'
import { PlanType } from 'libs/src/shared/src';

export class UpdaeBusinessPlanDto {
    @ApiProperty({ example: PlanType })
    @IsEnum(PlanType)
    plan: PlanType;
}