import { Body, Controller, Inject, Req, Post, Param, UseGuards, Get, Patch } from '@nestjs/common';
import { CreateBusinessDto } from '../../utils/dto/business/createBusiness.dto';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import { AuthGuard } from '../../auth/auth/guards/auth/auth.guard';
import { EmailVerifiedGuard } from '../../auth/auth/guards/auth/email.guard';
import { RolesGuard } from '../../auth/auth/guards/roles/role.guard';
import { Roles } from '../../auth/auth/guards/roles/func.decorator';
import { Role } from '../../auth/auth/guards/roles/role.enum';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { UpdateBusinessInfoDto } from '../../utils/dto/business/update-business.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { UpdateCustomAgentDto} from '../../utils/dto/business/update-agent.dto';
import { CreateCustomAgentDto } from '../../utils/dto/business/create-custom-agent.dto';
import { InstanceConnectDto } from '../../utils/dto/business/instance-connect.dto';

@Controller('business')
export class BusinessController {
    constructor(
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
    ) {}

    @ApiOperation({ summary: 'criar o business'})
    @ApiBody({ type: CreateBusinessDto})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Post('create')
    async createBusiness(
        @Req() req,
        @Body() body: CreateBusinessDto,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('business-create', {user: req.user, name: body.name, description: body.description, phone: body.phone})
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'conectar se a instancia do evoGo'})
    @ApiBody({ type: InstanceConnectDto})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Post('instance-connect')
    async instanceConnect(
        @Req() req,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('business-instance-connect', {user: req.user})
                .pipe(handlerRcpError),
        );
    }

    @SkipThrottle()
    @ApiOperation({ summary: 'pegar o meu business'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Get('get')
    async getBusiness(
        @Req() req
    ) {
        return firstValueFrom(
            this.businessClient
                .send('business-get', {user: req.user})
                .pipe(handlerRcpError),
        );
    }


    @SkipThrottle()
    @ApiOperation({ summary: 'pegar o qr code e o code pair' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Get('getqrandcodepair')
    async getQrAndCodePair(
        @Req() req,
    ) {
        return firstValueFrom(
            this.businessClient.send('business-get-qr-codepair', { user: req.user })
            .pipe(handlerRcpError)
        );
    }

    @ApiOperation({ summary: 'atualizar as informaçoes do meu business'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Patch('update')
    async updateBusinessInfo(
        @Req() req,
        @Body() body: UpdateBusinessInfoDto
    ) {
        return firstValueFrom(
            this.businessClient
                .send('business-update', {
                    user: req.user,
                    name: body.name,
                    description: body.description,
                })
                .pipe(handlerRcpError),
        );
    }

    // @ApiOperation({ summary: 'atualizar o plano do meu business'})
    // @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    // @Roles(Role.User)
    // @Patch('update-plan')
    // async updateBusinessPlan(
    //     @Req() req,
    //     @Body() body: UpdaeBusinessPlanDto
    // ) {
    //     return firstValueFrom(
    //         this.businessClient
    //             .send('business-update-plan', {
    //                 user: req.user,
    //                 plan: body.plan
    //             })
    //             .pipe(handlerRcpError),
    //     );
    // }

    @SkipThrottle()
    @ApiOperation({ summary: 'pegar os agents'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Get('find-agents')
    async findAgents( @Req() req ) {
        return firstValueFrom(
            this.businessClient.send('business-find-agents', { user: req.user })
            .pipe(handlerRcpError)
        )
    }
    
    @SkipThrottle()
    @ApiOperation({ summary: 'pegar o agent por id' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Get('agent/:id')
    async findAgent(@Req() req, @Param('id') agentId: string) {
        return firstValueFrom(
            this.businessClient.send('business-find-agent', { user: req.user, agentId })
            .pipe(handlerRcpError)
        )
    }

    @SkipThrottle()
    @ApiOperation({ summary: 'atualizar agente' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Patch('agent/:id')
    async updateAgent(
    @Req() req,
    @Param('id') agentId: string,
    @Body() dto: UpdateCustomAgentDto, // aceita o superset — service filtra
    ) {
        return firstValueFrom(
            this.businessClient.send('business-update-agent', { user: req.user, agentId, dto })
            .pipe(handlerRcpError)
        );
    }

    @SkipThrottle()
    @ApiOperation({ summary: 'criar agente customizado' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Post('agent/custom')
    async createAgent(
    @Req() req,
    @Body() dto: CreateCustomAgentDto, // aceita o superset — service filtra
    ) {
        return firstValueFrom(
            this.businessClient.send('business-create-custom-agent', { user: req.user, dto })
            .pipe(handlerRcpError)
        );
    }

}
