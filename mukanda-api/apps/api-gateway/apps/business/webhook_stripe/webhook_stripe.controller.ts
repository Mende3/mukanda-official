import { Controller, Inject, Post, Req, Res, Headers, HttpStatus, RawBody } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';

@ApiExcludeController()
@Controller('webhook/stripe')
export class WebhookStripeController {

    constructor(
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
    ) {}
    
    @Post()
    async handleEvent(
        @Req() req: Request,
        @Res() res: Response,
        @Headers('stripe-signature') signature: string, 
    ) {
        try {
            const result = await firstValueFrom (
                this.businessClient.send('billing-webhook-process', {
                    rawBody: req.body.toString('base64'),
                    signature,
                }).pipe(handlerRcpError),
            );
            return res.status(HttpStatus.OK).json(result);
        } catch (err) {
            return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err}`);
        }
    }
}
