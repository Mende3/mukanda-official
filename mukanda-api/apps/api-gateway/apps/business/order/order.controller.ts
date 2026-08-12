import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import { firstValueFrom } from 'rxjs';
import { EmailVerifiedGuard } from '../../auth/auth/guards/auth/email.guard';
import { RolesGuard } from '../../auth/auth/guards/roles/role.guard';
import { Roles } from '../../auth/auth/guards/roles/func.decorator';
import { Role } from '../../auth/auth/guards/roles/role.enum';
import { CreateOrderDto } from '../../utils/dto/order/create-order.dto';
import { AuthGuard } from '../../auth/auth/guards/auth/auth.guard';
import { UpdateOrderDto } from '../../utils/dto/order/update-order.dto';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle({ auth: true, authHour: true })
@ApiTags('Orders')
@ApiBearerAuth()
@Controller('order')
export class OrderController {
    constructor(
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
    ) {}

    @ApiOperation({ summary: 'Criar encomenda' })
    @ApiResponse({ status: 201, description: 'Encomenda criada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Post('create')
    async create(
        @Req() req,
        @Body() body: CreateOrderDto,
    ) {
        return firstValueFrom(
            this.businessClient.send('order-create', {
                user: req.user,
                clientName: body.clientName,
                clientNumber: body.clientNumber,
                notes: body.notes,
                scheduledAt: body.scheduledAt,
                items: body.items,
            })
            .pipe(handlerRcpError)
        );
    }

    @ApiOperation({ summary: 'Listar todas as encomendas do negócio' })
    @ApiResponse({ status: 200, description: 'Lista de encomendas' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Get('findall')
    async findall(@Req() req) {
        return firstValueFrom(
            this.businessClient.send('order-findall', { user: req.user })
            .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'Buscar encomenda por ID' })
    @ApiParam({ name: 'id', description: 'ID da encomenda' })
    @ApiResponse({ status: 200, description: 'Encomenda encontrada' })
    @ApiResponse({ status: 404, description: 'Encomenda não encontrada' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Get('findone/:id')
    async findone(
        @Req() req,
        @Param('id') orderId: string,
    ) {
        return firstValueFrom(
            this.businessClient.send('order-findone', { user: req.user, orderId })
            .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'Atualizer encomenda por ID' })
    @ApiBody({type: UpdateOrderDto})
    @ApiParam({ name: 'id', description: 'ID da encomenda' })
    @ApiResponse({ status: 200, description: 'Encomenda atualizada com sucesso' })
    @ApiResponse({ status: 404, description: 'Encomenda não encontrada' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Patch('update/:id')
    async update(
        @Req() req,
        @Param('id') orderId: string,
        @Body() body: UpdateOrderDto,
    ) {
        return firstValueFrom(
            this.businessClient.send('order-update', {
                user: req.user,
                orderId,
                notes: body.notes,
                scheduledAt: body.scheduledAt,
                status: body.status,
            })
            .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'Remover encomenda por ID' })
    @ApiParam({ name: 'id', description: 'ID da encomenda' })
    @ApiResponse({ status: 200, description: 'Encomenda removida com sucesso' })
    @ApiResponse({ status: 404, description: 'Encomenda não encontrada' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Delete('remove/:id')
    async remove(
        @Req() req,
        @Param('id') orderId: string,
    ) {
        return firstValueFrom(
            this.businessClient.send('order-remove', { user: req.user, orderId })
            .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'Remover todas as encomendas canceladas' })
    @ApiResponse({ status: 200, description: 'Encomendas canceladas removidas' })
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Delete('remove-cancelled')
    async removeCancelled(@Req() req) {
        return firstValueFrom(
            this.businessClient.send('order-remove-cancelled', { user: req.user })
            .pipe(handlerRcpError),
        );
    }
}