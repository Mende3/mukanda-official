import { Body, Controller, Post, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './guards/apikey.guard';
import { firstValueFrom } from 'rxjs';
import { Inject } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { RateLimitService } from './quota/rate.limit.service';
import { QuotaService } from './quota/quota.service';
import { CreateOrderDto } from '../../utils/dto/order/create-order.dto';
import { handleError } from '@app/evogo/utils/handleError';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';

@Controller('internal')
@SkipThrottle()
@UseGuards(ApiKeyGuard)
export class InternalController {
    
    constructor (
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
        private readonly rateLimitService: RateLimitService,
        private readonly quotaService: QuotaService,
    ) {}

    // api-gateway
    @Post('quota-and-rate/check') // nome mais honesto do que "generate-response"
    async checkLimits(@Body() dto: { businessId: string }) {
        const rate = await this.rateLimitService.checkLimit(dto.businessId);
        if (!rate.allowed) {
            return { allowed: false, reason: 'rate_limit', retryAfter: rate.retryAfter };
        }

        const quota = await this.quotaService.consumeAndEmit(dto.businessId);
        if (!quota.allowed) {
            return { allowed: false, reason: 'quota_exceeded', used: quota.used, limit: quota.limit };
        }

        return { allowed: true };
    }

    
    @Get('business-owner-id')
    @ApiOperation({ summary: 'pegar o business atravez do businessId'})
    async getBusinessOwerById(
        @Req() req,
        @Query('businessId') businessId: string,
    ) {
        return firstValueFrom (
            this.businessClient.send('get-business-owner-id', {
                businessId
            })
        )
    }

    @Get('business-owner')
    @ApiOperation({ summary: 'pegar o business atravez do numero'})
    async getBusinessOwner(
        @Req() req,
        @Query('phoneNumber') phoneNumber: string,
    ) {
        return firstValueFrom (
            this.businessClient.send('get-business-owner', {
                phoneNumber
            })
        )
    }
    
    @Get('agents-on')
    @ApiOperation({ summary: 'pegar os status dos agentes'})
    async getAgentsOn(
        @Req() req,
        @Query('phoneNumber') phoneNumber: string,
    ) {
        return firstValueFrom (
            this.businessClient.send('get-agents-on', {
                phoneNumber
            })
        )
    }

    // get-business-products
    @Get('business-products')
    @ApiOperation({ summary: 'pegar os produtos'})
    async getBusinessProducts(
        @Req() req,
        @Query('phoneNumber') phoneNumber: string,
    ) {
        return firstValueFrom (
            this.businessClient.send('get-business-products', {
                phoneNumber
            })
        )
    }

    @Get('business-date')
    @ApiOperation({ summary: 'pegar os horários disponíveis'})
    async getBusinessDate(
        @Req() req,
        @Query('phoneNumber') phoneNumber: string,
    ) {
        return firstValueFrom (
            this.businessClient.send('get-business-date', {
                phoneNumber
            })
        )
    }

    @Get('conversation-agent')
    @ApiOperation({ summary: 'pegar o agent de conversa'})
    async getConversationAgent(
        @Req() req,
        @Query('phoneNumber') phoneNumber: string,
        @Query('agentType') agentType: string
    ) {
        return firstValueFrom (
            this.businessClient.send('get-conversation-agent', {
                phoneNumber, agentType
            }).pipe(handlerRcpError)
        )
    }

    @Post('create-order-fwf')
    @ApiOperation({ summary: 'criar a encomenda'})
    async createOrderFromWorkFlow(
        @Req() req,
        @Query('phoneNumber') phoneNumber: string,
        @Body() body: CreateOrderDto,
    ) {
        return {body, phoneNumber};
    }

    @Post('register-client-ttl')
    @ApiOperation({ summary: 'registrar client no redis com ttl de 20d'})
    async registerClientTTL(
        @Req() req,
        @Query('phoneNumber') phoneNumber: string,
        @Query('clientNumber') clientNumber: string
    ) {
        return firstValueFrom (
            this.businessClient.send('ai-register-client-ttl', {
                phoneNumber,
                clientNumber
            }).pipe(handlerRcpError)
        )
    }

    @Get('all-cliens-ttl')
    @ApiOperation({ summary: 'pegar os clients no redis'})
    async allClientsTTL (
        @Query('phoneNumber') phoneNumber: string,
    ) {
        return firstValueFrom (
            this.businessClient.send('ai-all-clients-ttl', {
                phoneNumber,
            })
        )
    }


    // find all schedule of campaign
    @Get('all-campaign')
    @ApiOperation({ summary: 'pegar todas campanhas de clientes'})
    async allCampaign () {
        return firstValueFrom (
            this.businessClient.send('ai-all-campaign', {})
            .pipe(handlerRcpError)
        )
    }
}
