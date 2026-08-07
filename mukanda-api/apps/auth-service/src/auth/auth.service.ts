import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'
import { RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ResendService } from '@app/resend';
import { JwtService } from '@nestjs/jwt'
import { MyRedisService } from '@app/redis';
import { LoginUserDto } from '../dto/login.user.dto';
import { RegisterUserDto } from '../dto/registerUser.dto';

@Injectable()
export class AuthService {

  constructor (
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly resendService: ResendService,
    private readonly myRedisService: MyRedisService,
    private readonly jwtService: JwtService,
  ) {}

  // ************************************

  private genUserKey = (userId: string) => `user:${userId}`; 
  private genVerifyCodeKey = (email: string) => `user.email:${email}-verifycode`
  //

  // *************** Utils *********************
  async findUserById (userId: string) {

    const cached = await this.myRedisService.sessionGet (this.genUserKey(userId));
    if (cached) return JSON.parse(cached); 

    const user = await this.prismaService.user.findUnique ({
      where: {id: userId},
    });

    if (!user) throw new RpcException ({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Usúario não encontrado"
    });

    return user;
  }

  async findUserByEmail (userEmail: string) {

    const user = await this.prismaService.user.findUnique ({
      where: {email: userEmail}
    });

    if (!user) throw new RpcException ({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Usúario não encontrado"
    });

    return user;
  }

  // ************************************

  async saveRefreshToken(userId: string, refreshToken: string) {
    // guarda o hash, não o token em plaintext
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.prismaService.user.update({
        where: { id: userId },
        data: { refreshToken: hashed },
    });
  }

  generateTokens(user: { id: string; email: string; name: string, role: string}) {
    const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    }

    const accessToken = this.jwtService.sign(payload, {
        expiresIn: '15m',
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
    });

    const refreshToken = this.jwtService.sign(payload, {
        expiresIn: '7d',
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });

    return { accessToken, refreshToken }
  }

  async login(body: LoginUserDto) {

    const user = await this.prismaService.user.findUnique ({
      where: {email: body.email},  
    });

    if (!user) throw new RpcException ({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: "Usuário não existe",
    });

    const isMatch = await bcrypt.compare (body.password, user?.password);
    if (!isMatch) throw new RpcException ({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: "Senha incorreta"
    });

    const userKey = this.genUserKey(user.id);
    const cached = await this.myRedisService.sessionGet(userKey);
    if (cached) return JSON.parse(cached);

    await this.myRedisService.sessionSet(
      userKey,
      JSON.stringify(user),
      7 * 24 * 60 * 60
    );

    return user;
  }

  async register(body: RegisterUserDto) {
    
    const existingUser = await this.prismaService.user.findUnique ({
      where: {email: body.email}
    });

    if (existingUser) {
      throw new RpcException({
        statusCode: HttpStatus.CONFLICT,
        message: "já existe uma conta com este email"
      });
    }

    const hashed = await bcrypt.hash(body.password, 10);

    const newUser = await this.prismaService.user.create ({
      data: {
        email: body.email,
        name: body.name,
        password: hashed,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await this.myRedisService.cacheSet(this.genVerifyCodeKey(body.email), verificationCode, 900);
   
    await this.resendService.sendEmail(
      body.email,
      'Bem-vindo ao Mukanda! Confirme o seu email',
      `<!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      </head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td style="background-color:#0f172a;padding:32px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">MUKANDA</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:40px 48px;">
                    <p style="margin:0 0 16px;font-size:16px;color:#374151;">Olá, <strong>${body.name}</strong> 👋</p>
                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                      Obrigado por se registar no <strong>Mukanda</strong>. Para concluir o seu registo, utilize o código de verificação abaixo:
                    </p>

                    <!-- Code block -->
                    <div style="background-color:#f8fafc;border:2px dashed #e2e8f0;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                      <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Código de verificação</p>
                      <span style="font-size:36px;font-weight:bold;color:#0f172a;letter-spacing:8px;">${verificationCode}</span>
                    </div>

                    <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-align:center;">
                      ⏱ Este código expira em <strong>15 minutos</strong>.
                    </p>
                    <p style="margin:24px 0 0;font-size:13px;color:#d1d5db;text-align:center;">
                      Se não criou uma conta no Mukanda, pode ignorar este email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Mukanda · Luanda, Angola</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`
    ); // enviar o email

    return { success: true, newUser};
  }

  async resendVerificationCode (userId: string) {
    const user = await this.findUserById (userId);

    if (user.isVerified) {
      throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Email já verificado, não é necessário reenviar o código',
      });
    }
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await this.myRedisService.cacheSet(
      this.genVerifyCodeKey(user.email),
      verificationCode,
      900
    );

    await this.resendService.sendEmail(
      user.email,
      'Bem-vindo ao Mukanda! Confirme o seu email',
      `<!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      </head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td style="background-color:#0f172a;padding:32px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">MUKANDA</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:40px 48px;">
                    <p style="margin:0 0 16px;font-size:16px;color:#374151;">Olá, <strong>${user.name}</strong> 👋</p>
                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                      Obrigado por se registar no <strong>Mukanda</strong>. Para concluir o seu registo, utilize o código de verificação abaixo:
                    </p>

                    <!-- Code block -->
                    <div style="background-color:#f8fafc;border:2px dashed #e2e8f0;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                      <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Código de verificação</p>
                      <span style="font-size:36px;font-weight:bold;color:#0f172a;letter-spacing:8px;">${verificationCode}</span>
                    </div>

                    <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-align:center;">
                      ⏱ Este código expira em <strong>15 minutos</strong>.
                    </p>
                    <p style="margin:24px 0 0;font-size:13px;color:#d1d5db;text-align:center;">
                      Se não criou uma conta no Mukanda, pode ignorar este email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Mukanda · Luanda, Angola</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`
    ); // enviar o email

    return { success: true};
  }

  async verifyCode (body:  {userId: string, code: string}) {
    const user = await this.findUserById (body.userId);

    console.log ('dentro do obs', body.code);

    if (user.isVerified) {
      throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Email já verificado',
      });
    }

    const userKey = this.genUserKey(user.id);
    const key = this.genVerifyCodeKey(user.email);

    const codeCached = await this.myRedisService.cacheGet(key);
    console.log ('qui ', codeCached, key);

    if (!codeCached) throw new RpcException ({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Codigo expirado"
    });
    const code = body.code;
    if (code !== codeCached) throw new RpcException ({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Insira o código válido"
    });
    
    try {
      const now = new Date();

      const user_v = await this.prismaService.user.update ({
        where: {id: body.userId},
        data: {
          isVerified: true,
          emailVerifiedAt: now,
        },
      });

      await this.myRedisService.sessionSet(
        userKey,
        JSON.stringify(user_v),
        7 * 24 * 60 * 60
      );

      return {success: true};
    } catch (e) {
      console.log (e);
      throw new RpcException ({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
         message: 'Erro ao verificar email',
      });
    }
  }

  async resendLinkAndToken (id: string, email: string, name: string, role: string) {
    const payload = {
          sub: id,
          email: email,
          name: name,
          role: role,
      }

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_VERIFICATION_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_VERIFICATION_TOKEN_EXPIRATION_TIME')}s`
    });

    const url = `${this.configService.get('EMAIL_RESET_PASSWORD_URL')}?token=${token}`
   
    await this.resendService.sendEmail(
      email,
      "Redefinir senha",
      `<p>Clica neste link para resetar a tua password: <a href="${url}">${url}</a></p>`,
    );

    return { message: 'Email de recuperação enviado' };
  }

  async forgotPassword (email: string) {
  
    const user = await this.findUserByEmail (email);
    
    return await this.resendLinkAndToken (
        user.id,
        user.email,
        user.name,
        user.role,
    );
  }

  async resetPassword (token: string, newPassword: string) {
    const payload = this.jwtService.verify(token, {
      secret: this.configService.getOrThrow<string>('JWT_VERIFICATION_TOKEN_SECRET')
    })

    const user = await this.findUserByEmail(payload.email);
    
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prismaService.user.update({
      where: {id: user.id},
      data: {password: hashed},
    });

    return { message: 'Password redefinida com sucesso' };
  }

  async logOut(userId: string) {

    await this.prismaService.user.update({
        where: { id: userId },
        data: { refreshToken: null }, // invalida no DB
    });
    await this.myRedisService.sessionDel(this.genUserKey(userId));
    return { message: "Sessão terminada" };
  }
}