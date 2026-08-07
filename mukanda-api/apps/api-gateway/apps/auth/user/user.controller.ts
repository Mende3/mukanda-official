import { Body, Controller, Delete, Get, Inject, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import { firstValueFrom } from 'rxjs';
import { AuthGuard } from '../auth/guards/auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles/role.guard';
import { Roles } from '../auth/guards/roles/func.decorator';
import { Role } from '../auth/guards/roles/role.enum';
import { SkipThrottle } from '@nestjs/throttler';
import { UpadateUserNameDto } from '../../utils/dto/singular.dto';
import { UpdateUserPasswordDto } from '../../utils/dto/user/updateUserPassword.dto';
import { EmailVerifiedGuard } from '../auth/guards/auth/email.guard';
import type { Response } from 'express';
import { VerificationCodeDto } from '../../utils/dto/singular.dto';
import { ApiOperation, ApiBody } from '@nestjs/swagger';
import { UploadService } from '../../business/upload/upload.service';

@Controller('user')
export class UserController {
    constructor (
        @Inject('AUTH-SERVICE') private readonly authClient: ClientProxy,
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
        private readonly uploadService: UploadService,
    ) {}

    @ApiOperation({ summary: 'pegar o utlizador (userId e role)' })
    @UseGuards (AuthGuard, RolesGuard)
    @SkipThrottle()
    @Roles(Role.User, Role.Admin)
    @Get("me")
    async getMe (@Req() req)
    {
        return firstValueFrom(
            this.authClient.send('user-me', {user: req.user})
            .pipe(handlerRcpError)
        );
    }

    @ApiOperation({ summary: 'atualizar nome de usuário'})
    @ApiBody({ type: UpadateUserNameDto })
    @UseGuards (AuthGuard, RolesGuard, EmailVerifiedGuard)
    @Roles(Role.User, Role.Admin)
    @Patch("update-name")
    async upadateUserName (@Req() req, @Body() body: UpadateUserNameDto)
    {
        return firstValueFrom(
            this.authClient.send('user-update-name', {user: req.user, name: body.name})
            .pipe(handlerRcpError)
        );
    }

    @ApiOperation({ summary: 'Atualizar password' })
    @ApiBody({ type: UpdateUserPasswordDto })
    @UseGuards (AuthGuard, RolesGuard, EmailVerifiedGuard)
    @Roles(Role.User, Role.Admin)
    @Patch("update-password")
    async upadateUserPassword (@Req() req, @Body() body: UpdateUserPasswordDto)
    {
        return firstValueFrom(
            this.authClient.send('user-update-password', {user: req.user,oldPassword: body.oldPass,  newPassword: body.newPass})
            .pipe(handlerRcpError)
        );
    }

    @ApiOperation({ summary: 'deletar conta (primeiro passo)'})
    @UseGuards (AuthGuard, RolesGuard, EmailVerifiedGuard)
    @Roles(Role.User, Role.Admin)
    @Post("delete-account")
    async deleteUserAcount (@Req() req)
    {
        return firstValueFrom(
            this.authClient.send('user-delete-account', {user: req.user})
            .pipe(handlerRcpError)
        );
    }

    @ApiOperation({ summary: 'confirmar deleção da conta'})
    @ApiBody({ type: VerificationCodeDto })
    @UseGuards (AuthGuard, RolesGuard, EmailVerifiedGuard)
    @Roles(Role.User, Role.Admin)
    @Delete("confirm-delete-account")
    async confirmDeleteUserAcount (@Req() req, @Res() res: Response, @Body() body: VerificationCodeDto)
    {
        // deletar a pasta do bucket do mukanda
        await this.uploadService.deleteUserFolder (req.email);        

        //deletar o business depois
        await firstValueFrom(
            this.businessClient.emit('delete-business', {user: req.user})
            .pipe(handlerRcpError)
        );

        // deletar a conta por ultimo
        await firstValueFrom(
            this.authClient.send('user-confirm-delete-account', {user: req.user, code: body.code})
            .pipe(handlerRcpError)
        );

        //logout
        await firstValueFrom(
            this.authClient.send('auth-logout', { userId: req.user.userId })
            .pipe(handlerRcpError)
        );

        res.clearCookie('access_token');
        res.clearCookie('refresh_token');

        return res.json({ message: "Conta deletada com sucesso" }); 
    }

}