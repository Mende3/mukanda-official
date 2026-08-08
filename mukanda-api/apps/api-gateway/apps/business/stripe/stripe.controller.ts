import { Controller, Inject, Post, Get, UseGuards, Req, Body } from '@nestjs/common';
import { SkipPlanThrottle } from '../plans/guards/rate-p-plan';
import { AuthGuard } from '../../auth/auth/guards/auth/auth.guard';
import { EmailVerifiedGuard } from '../../auth/auth/guards/auth/email.guard';
import { RolesGuard } from '../../auth/auth/guards/roles/role.guard';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiBody} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import { CreateCheckoutSessionDto } from '../../utils/dto/stripe/CreateCheckoutSession.dto';

@UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
@Controller('stripe')
export class StripeController {
    constructor (
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy
    ) {}

    @ApiOperation({ summary: 'iniciar upgrade de plano' })
    @ApiBody({ type: CreateCheckoutSessionDto })
    @Post('checkout')
    async createCheckout(@Req() req, @Body() body: CreateCheckoutSessionDto) {
        return firstValueFrom(
            this.businessClient
                .send('billing-checkout-create', {
                    user: req.user,
                    plan: body.plan,
                    successUrl: body.successUrl,
                    cancelUrl: body.cancelUrl,
                })
                .pipe(handlerRcpError),
        );
    }
    
}
