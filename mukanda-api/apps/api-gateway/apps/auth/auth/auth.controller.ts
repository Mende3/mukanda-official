import { 
    Body,
    Controller,
    Inject,
    Post,
    Get,
    Res,
    Req,
    Query,
    UseGuards,
    Delete,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import { RegisterUserDemoDto } from '../../utils/dto/auth/registerUserDemo.dto';
import { LoginUserDemoDto } from '../../utils/dto/auth/login.user.demodto';
import type { Response } from 'express';
import { AuthGuard } from './guards/auth/auth.guard';
import { RolesGuard } from './guards/roles/role.guard';
import { Roles } from './guards/roles/func.decorator';
import { Role } from './guards/roles/role.enum';
import { VerificationCodeDto } from '../../utils/dto/singular.dto';
import { ForgetPasswordDto } from '../../utils/dto/singular.dto';
import { ResetPasswordDto } from '../../utils/dto/singular.dto';
import { ApiBody, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
//@ApiExcludeController()
export class AuthController {

    constructor (
        @Inject("AUTH-SERVICE") private readonly authClient: ClientProxy,
    ) {}

    @ApiOperation({ summary: 'Login do utilizador' })
    @ApiBody({ type: LoginUserDemoDto })
    @Throttle({
        auth: { ttl: 60000, limit: 5 },
        authHour: { ttl: 3600000, limit: 20 },
    })
    @Post("login")
    async login (@Body() body: LoginUserDemoDto, @Res() res: Response) {
        const { accessToken, refreshToken } = await firstValueFrom(
            this.authClient.send("auth-login", body).pipe(handlerRcpError)
        ) as {accessToken: string; refreshToken: string };

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000,
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        
        return res.json({ message: 'Login feito com sucesso' });
    }

    @ApiOperation({ summary: 'Refresh token do utilizador' })
    @Throttle({
        auth: { ttl: 60000, limit: 5 },
        authHour: { ttl: 3600000, limit: 20 },
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Post("refresh")
    async refresh (@Req() req, @Res() res: Response) {

        const refresh_token = req.cookies?.refresh_token
        console.log (refresh_token);

        if (!refresh_token) {
            return res.status(401).json({ message: 'Sem refresh token' })
        }// verifica explicitamente se o cookie existe antes de tentar verificar

        try {
            const { accessToken } = await firstValueFrom(
                this.authClient.send('auth-refresh-token', {refresh_token: refresh_token})
            );

            res.cookie('access_token', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000,
            });

            return res.status(200).json({ message: 'Token renovado' })
        } catch (e) {
            console.log(e);
            return  res.status(401).json({ message: 'Refresh inválido' });
        }       
    }


    @ApiOperation({ summary: 'Regista um novo utilizador' })
    @ApiBody({ type: RegisterUserDemoDto })
    @Throttle({
        auth: { ttl: 60000, limit: 5 },
        authHour: { ttl: 3600000, limit: 20 },
    })
    @Post("register")
    async register (@Body() body: RegisterUserDemoDto) {
        return firstValueFrom(
            this.authClient.send("auth-register", body)
            .pipe (handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'Verificar código de login' })
    @ApiBody({ type: VerificationCodeDto })
    @Throttle({
        auth: { ttl: 60000, limit: 5 },
        authHour: { ttl: 3600000, limit: 15 },
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.Admin, Role.User)
    @Post("verify-code")
    async emailVerification (
        @Body() body: VerificationCodeDto,
        @Req() req: Request & { user: { userId: string } }
    ) {
        console.log(body.code)
        return firstValueFrom(
            this.authClient.send("auth-verify-code", {userId: req.user.userId, code: body.code})
            .pipe(handlerRcpError),
        );
    }
   
    @ApiOperation({ summary: 'Solicitar reset de password' })
    @Throttle({
        auth: { ttl: 60000, limit: 3 },
        authHour: { ttl: 3600000, limit: 10 },
    })
    @Post("forgot-password")
    async forgotPassword(@Body() body: ForgetPasswordDto){
        return firstValueFrom (
            this.authClient.send("auth-forgot-password", {email: body.email})
            .pipe (handlerRcpError)
        );
    }

    @ApiOperation({ summary: 'Redefinir password' })
    @ApiQuery({ name: 'token', required: true })
    @Throttle({
        auth: { ttl: 60000, limit: 5 },
        authHour: { ttl: 3600000, limit: 10 },
    })
    @Post("reset-password")
    async resetPassword(
        @Query('token') token: string,
        @Body() body: ResetPasswordDto
    ){
        return firstValueFrom (
            this.authClient.send("auth-reset-password", {token: token, password: body.password})
            .pipe (handlerRcpError)
        );
    }

    @ApiOperation({ summary: 'Reenviar código de verificação' })
    @Throttle({
        auth: { ttl: 60000, limit: 3 },
        authHour: { ttl: 3600000, limit: 5 },
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.Admin, Role.User)
    @Get("resend-verification-code")
    async resendVerificationCode(@Req() req: Request & { user: { userId: string } }) {
        return firstValueFrom(
            this.authClient.send("auth-resend-verification-code", { userId: req.user.userId })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'Fazer logOut' })
    @Throttle({
        auth: { ttl: 60000, limit: 3 },
        authHour: { ttl: 3600000, limit: 5 },
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.Admin, Role.User)
    @Delete("logout")
    async logout(@Req() req: Request & { user: { userId: string } }, @Res() res: Response) {
        await firstValueFrom(
            this.authClient.send("auth-logout", { userId: req.user.userId })
                .pipe(handlerRcpError)
        );

        // limpa os cookies
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');

        return res.json({ message: "Sessão terminada" });
    }

    
}