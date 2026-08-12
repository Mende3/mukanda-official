import { Controller, Inject, Post, Req, Res, Headers, HttpStatus, RawBody } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import type { Request, Response } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@ApiExcludeController()
@SkipThrottle({ auth: true, authHour: true })
@Controller('webhook/stripe')
export class WebhookStripeController {

    constructor(
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
    ) {}
    
    @Post()
    async handleEvent(
        @Req() req: RawBodyRequest<Request>,
        @Res() res: Response,
        @Headers('stripe-signature') signature: string, 
    ) {
        if (!req.rawBody) {
            return res.status(HttpStatus.BAD_REQUEST).send('Webhook Error: missing raw body');
        }

        try {
            const result = await firstValueFrom (
                this.businessClient.send('billing-webhook-process', {
                    rawBody: req.rawBody.toString('base64'),
                    signature,
                }),
            );
            return res.status(HttpStatus.OK).json(result);
        } catch (err) {
            return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err}`);
        }
    }
}
