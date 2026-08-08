import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation } from '@nestjs/swagger';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import { firstValueFrom } from 'rxjs';
import { AuthGuard } from '../../auth/auth/guards/auth/auth.guard';
import { EmailVerifiedGuard } from '../../auth/auth/guards/auth/email.guard';
import { RolesGuard } from '../../auth/auth/guards/roles/role.guard';
import { Roles } from '../../auth/auth/guards/roles/func.decorator';
import { Role } from '../../auth/auth/guards/roles/role.enum';

@Controller('sub-plan')
export class SubPlanController {
    constructor (
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
    ) {}


    @ApiOperation({ summary: 'listar planos disponíveis' })
    @Get('plans')
    async getPlans() {
        return firstValueFrom (
            this.businessClient.send('billing-plans-list', {})
            .pipe (handlerRcpError)
        );
    }

    @ApiOperation({ summary: 'obter assinatura atual do negócio' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Get('subscription')
    async getSubscription(@Req() req) {
        return firstValueFrom(
            this.businessClient
                .send('billing-subscription-get', { user: req.user })
                .pipe(handlerRcpError),
        );
    }
}
