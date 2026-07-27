import { Body, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './guards/apikey.guard';
import { firstValueFrom } from 'rxjs';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('internal')
@SkipThrottle()
@UseGuards(ApiKeyGuard)
export class InternalController {
    
    constructor (
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
    ) {}

    @Get('business-owner')
    @ApiOperation({ summary: 'pegar o agent de conversa'})
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
            })
        )
    }

    // @Get('order-agent')
    // @ApiOperation({ summary: 'pegar o agente de encomenda'})
    // async getOrderAgent(
    //     @Req() req
    // ) {
    //     return req.user;
    // }
}
