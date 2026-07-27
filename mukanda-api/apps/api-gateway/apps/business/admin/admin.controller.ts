import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { Req } from '@nestjs/common';
import { Roles } from '../../auth/auth/guards/roles/func.decorator';
import { Role } from '../../auth/auth/guards/roles/role.enum';
import { AuthGuard } from '../../auth/auth/guards/auth/auth.guard';
import { EmailVerifiedGuard } from '../../auth/auth/guards/auth/email.guard';
import { RolesGuard } from '../../auth/auth/guards/roles/role.guard';
import { UpdateBusinessInfoAdminDto } from '../../utils/dto/admin/update-business.admin.dto';
import { UpdateCustomAgentAdminDto } from '../../utils/dto/admin/update-busines.admin.dto';

@Controller('admin')
export class AdminController {
    constructor ( @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy) {}

    @ApiOperation({ summary: 'retorna o todos os business dos usuários'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.Admin)
    @Get('/get-businesses')
    async findAll(
        @Req() req,
    ) {
        return firstValueFrom (
            this.businessClient.send ('admin-get-businesses', {
                user: req.user
            })
            .pipe(handlerRcpError)
        )
    }

    @ApiOperation({ summary: 'retorna o business de um usuário'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.Admin)
    @Get('/get-business/:id')
    async findOne(
        @Req() req,
        @Param('id') businessId: string 
    ) {
        return firstValueFrom (
            this.businessClient.send ('admin-get-business', {
                user: req.user,
                businessId
            })
            .pipe(handlerRcpError)
        )
    }

    @ApiOperation({ summary: 'atualizar o business de um usuário'})
    @ApiBody({ type: UpdateBusinessInfoAdminDto})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.Admin)
    @Patch('/update-business/:id')
    async updateBusiness(
        @Req() req,
        @Param('id') businessId: string,
        @Body() body: UpdateBusinessInfoAdminDto
    ) {
        return firstValueFrom (
            this.businessClient.send ('admin-update-business', {
                user: req.user,
                businessId,
                name: body.name,
                description: body.description,
                isActive: body.isActive,
            })
            .pipe(handlerRcpError)
        )
    }

    @ApiOperation({ summary: 'deletar o business de um usuário'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.Admin)
    @Delete('/delete-business/:id')
    async delete(
        @Req() req,
        @Param('id') businessId: string 
    ) {
        return firstValueFrom (
            this.businessClient.send ('admin-delete-business', {
                user: req.user,
                businessId
            })
            .pipe(handlerRcpError)
        )
    }

    // sub & plan

    @ApiOperation({ summary: 'visão geral de todas as subscrições ativas'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.Admin)
    @Get('/get-subscriptions')
    async subscriptions(
        @Req() req 
    ) {
        return firstValueFrom (
            this.businessClient.send ('admin-get-subscriptions', {
                user: req.user
            })
            .pipe(handlerRcpError)
        )
    }

    @ApiOperation({ summary: 'mais informações de plano e subscrição'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.Admin)
    @Get('/get-subscriptions/:id')
    async busSubscription (
        @Req() req,
        @Param('id') businessId: string 
    ) {
        return firstValueFrom (
            this.businessClient.send ('admin-get-bus-subscriptions', {
                user: req.user,
                businessId
            })
            .pipe(handlerRcpError)
        )
    }

    // agent

    @ApiOperation({ summary: 'ajustar modelo/prompt/parametros sem passar pelo dono do business'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.Admin)
    @Patch('/agent/:id/config')
    async agents (
        @Req() req,
        @Body() body: UpdateCustomAgentAdminDto,
        @Param('id') agentId: string 
    ) {
        return firstValueFrom (
            this.businessClient.send ('admin-update-agent', {
                user: req.user,
                agentId,
                body
            })
            .pipe(handlerRcpError)
        )
    }
}
