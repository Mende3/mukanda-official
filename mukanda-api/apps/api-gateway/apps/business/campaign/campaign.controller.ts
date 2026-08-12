import { Controller,Param } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { UseGuards } from '@nestjs/common';
import { ApiOperation, ApiBody } from '@nestjs/swagger'
import { Roles } from '../../auth/auth/guards/roles/func.decorator';
import { Role } from '../../auth/auth/guards/roles/role.enum';
import { AuthGuard } from '../../auth/auth/guards/auth/auth.guard';
import { EmailVerifiedGuard } from '../../auth/auth/guards/auth/email.guard';
import { RolesGuard } from '../../auth/auth/guards/roles/role.guard';
import { Post, Get, Delete, Patch, Req, Body, Query } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import { CreateCampaignDto } from '../../utils/dto/campaign/create-campaign.dto';
import { UpdateCampaignDto } from '../../utils/dto/campaign/update-campaign.dto';
import { SkipThrottle } from '@nestjs/throttler';


@SkipThrottle({ auth: true, authHour: true })
@Controller('campaign')
export class CampaignController {
    constructor (
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
    ) {}

    @ApiOperation({ summary: 'criar um campanha'})
    @ApiBody({ type: CreateCampaignDto})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Post('create')
    async create(
        @Req() req,
        @Body() body: CreateCampaignDto,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('campaign-create', {
                    user: req.user,
                    message: body.message,
                    agentId: body.agentId,
                    name: body.name,
                    rules: body.rules
                })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'pegar todas campanhas'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Get('findall')
    async findall(
        @Req() req,
        @Query('agentId') agentId: string
    ) {
        return firstValueFrom(
            this.businessClient
                .send('campaign-findall', {
                    user: req.user,
                    agentId
                })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'pegar uma campanha'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Get('findone/:id')
    async findone(
        @Req() req,
        @Param('id') campaignId: string,
        @Query('agentId') agentId: string,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('campanha-findone', {
                    user: req.user,
                    campaignId,
                    agentId,
                })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'atualizar uma campanha'})
    @ApiBody({ type: UpdateCampaignDto})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Patch('update/:id')
    async update(
        @Req() req,
        @Param('id') campaignId: string,
        @Query('agentId') agentId: string,
        @Query() body: UpdateCampaignDto,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('campaign-update', {
                    user: req.user,
                    campaignId: campaignId,
                    agentId,
                    message: body.message,
                    name: body.name,
                    rules: body.rules,
                })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'deletar uma campanha'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Delete('delete/:id')
    async delete(
        @Req() req,
        @Param('id') campaignId: string,
        @Query('agentId') agentId: string,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('campaign-delete', {
                    user: req.user,
                    campaignId,
                    agentId
                })
                .pipe(handlerRcpError),
        );
    }
}
