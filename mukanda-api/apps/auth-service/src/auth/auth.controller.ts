import { Body, Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { Payload } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginUserDto } from '../dto/login.user.dto';
import { RegisterUserDto } from '../dto/registerUser.dto';
import { HttpStatus } from '@nestjs/common';

@Controller()
export class AuthController {

    constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    ) {}

    @MessagePattern("auth-login")
    async login(@Payload()  body: LoginUserDto) {
        const user = await this.authService.login(body);
        const { accessToken, refreshToken } = this.authService.generateTokens(user);

        await this.authService.saveRefreshToken(user.id, refreshToken);
        
        return {accessToken, refreshToken};
    }

    @MessagePattern("auth-refresh-token")
    async refreshToken (@Payload() body: {refresh_token: string}) {
        const { refresh_token } = body;

        let payload: any;

        try {
            payload =  this.jwtService.verify (refresh_token, {
                secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
            });
        } catch (e) {
            throw new RpcException({
                statusCode: HttpStatus.UNAUTHORIZED,
                message: 'Refresh token inválido ou expirado',
            });
        }

        const { accessToken } = this.authService.generateTokens({
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            role: payload.role
        });

        return { accessToken }
    }

    @MessagePattern("validate-token")
    async validateToken(token: string) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.getOrThrow<string>('JWT_SECRET'),
            });
            return { valid: true, userId: payload.sub, email: payload.email ,role: payload.role };
        } catch (e) {
            console.log('erro:', e);
            return { valid: false };
        }
    }

    @MessagePattern("auth-register")
    async register(@Payload() body: RegisterUserDto) {
        return this.authService.register(body);
    }

    @MessagePattern("auth-resend-verification-code")
    async resendVerificationCode(@Payload() payload: { userId: string }) {
        return this.authService.resendVerificationCode(payload.userId);
    }

    @MessagePattern("auth-verify-code")
    async verificatinCode(@Payload() body:  {userId: string, code: string}) {
        return this.authService.verifyCode (body);
    }

    @MessagePattern("auth-forgot-password")
    async forgotPassword(@Payload() body: {email: string}) {
        return this.authService.forgotPassword(body.email);
    }

    @MessagePattern("auth-reset-password")
    async resetPassword(
        @Payload() data: { token: string, password: string },
    ) {
        return this.authService.resetPassword(data.token, data.password);
    }

    @MessagePattern("auth-check-verified")
    async checkVerified(@Payload() data: { userId: string }) {
        const user = await this.authService.findUserById(data.userId);
        return { isVerified: user.isVerified };
    }

    @MessagePattern("auth-logout")
    async logOut(@Payload() data: { userId: string }) {
        return this.authService.logOut(data.userId);
    }
}
