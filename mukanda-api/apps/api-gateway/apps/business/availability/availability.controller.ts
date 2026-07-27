import { Body, Controller, Get, Inject, Patch, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import { firstValueFrom } from 'rxjs';
import { AuthGuard } from '../../auth/auth/guards/auth/auth.guard';
import { EmailVerifiedGuard } from '../../auth/auth/guards/auth/email.guard';
import { RolesGuard } from '../../auth/auth/guards/roles/role.guard';
import { Roles } from '../../auth/auth/guards/roles/func.decorator';
import { Role } from '../../auth/auth/guards/roles/role.enum';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { UpdateAvailabilityDto } from '../../utils/dto/availability/updateAvailabilitySlot.dto';
import { UpdateSlotDto } from '../../utils/dto/availability/updateSlot.dto';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('availability')
export class AvailabilityController {
    constructor (
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
    ) {}

    @ApiOperation({ summary: 'retorna o intervalo de tempo em dia que o usuario tem para atender por semana'})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Get('get')
    async getAvailability(@Req() req) {
        return firstValueFrom (
            this.businessClient.send('availability-get', {user: req.user})
            .pipe(handlerRcpError)
        );
    }

    @ApiOperation({ summary: 'editar os intervalos'})
    @ApiBody({type: UpdateSlotDto})
    @UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
    @Roles(Role.User)
    @Patch('update')
    async updateAvailability(@Req() req, @Body() body: UpdateAvailabilityDto) {
        return firstValueFrom (
            this.businessClient.send('availability-update', {user: req.user, acceptOrders: body.acceptOrders, slots: body.slots})
            .pipe(handlerRcpError)
        );
    }
}
