import { PrismaService } from '../prisma/prisma.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt'
import { ResendService } from '@app/resend';
import { MyRedisService } from '@app/redis';

@Injectable()
export class UserService {
  constructor (
    private readonly prismaService: PrismaService,
    private readonly resendService: ResendService,
    private readonly myRedisService: MyRedisService,
  ) {}

  //*********************

  private genUserKey = (userId: string) => `user:${userId}`;


  //*** Utils *
  async findUserById (userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: {id: userId},
    });

    const cached = await this.myRedisService.sessionGet (this.genUserKey(userId));
    if (cached) return JSON.parse(cached);

    if (!user) throw new RpcException ({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Usuário não encontrado"
    });

    return user;
  }

  async findUserByEmail (email: string) {
    const user = await this.prismaService.user.findUnique({
      where: {email: email},
    });

    if (!user) throw new RpcException ({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Usuário não encontrado"
    });

    return user;
  }

  //*********************


  async getMe(data: {user: any}) {

    const { userId } = data.user;

    const cached = await this.myRedisService.sessionGet (this.genUserKey(userId));
    if (cached) return JSON.parse(cached);

    return this.prismaService.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isVerified: true,
            emailVerifiedAt: true,
            createdAt: true,
        }
    });
  }

  async updateUserName (data: {user: any; name: string}) {
    const { userId } = data.user;
    const { name } = data;

    const user =  await this.findUserById (userId);

    try {
      await this.prismaService.user.update ({
        where: {id: user.id},
        data: { name}
      });

      await this.myRedisService.sessionDel (this.genUserKey(userId));
    } catch (e) {
      console.log (e);
      throw new RpcException ({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Nome de usuário não alterado",
      });
    }

    return {message: "nome alterado com sucesso"};
  }

  async updateUserPassword (data: {user: any,oldPassword: string,  newPassword: string}) {
    const { userId } = data.user;
    const { oldPassword, newPassword } = data;

    const user = await this.findUserById (userId);

    if (oldPassword === newPassword) throw new RpcException ({
      statusCode: HttpStatus.CONFLICT,
      message: "As senhas são identicas"
    });

    const isMatch = await bcrypt.compare (oldPassword, user?.password);
    if (!isMatch) throw new RpcException ({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: "Senha antiga incorreta"
    });

    try {
      const hashedNewPassword = await bcrypt.hash (newPassword, 10);

      await this.prismaService.user.update ({
        where: {id: user.id},
        data: {password: hashedNewPassword},
      });

      await this.myRedisService.sessionDel (this.genUserKey(userId));
    } catch (e) {
      console.log (e);
      throw new RpcException ({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Senha de usuário não alterado",
      });
    }

    return {message: "Senha alterada com sucesso"} ;
  }

  async deleteUserAccount (data: {user: any}) {
    const { userId } = data.user;
    const user = await this.findUserById (userId);

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await this.myRedisService.cacheSet(`DeleteAccountCode:${user.email}`, verificationCode, 900);

    await this.resendService.sendEmail (
      user.email,
      "Apgaar a conta da Mukanda",
      `<p>${user.name} seria triste para gente perder um parceiro como tu</br>
        De certeza que quer prosseguir?<br>
        codigo de confirmação <strong>${verificationCode}</strong>. O código expira em 15 minutos
      </p>`
    ); 
    return {message: "codido envido"};
  }

  async confirmDeleteUserAccount (data: {user: any, code: string}) {
    const { userId } = data.user;
    const {code} = data;
    const user = await this.findUserById (userId);

    const key = await this.myRedisService.cacheGet (`DeleteAccountCode:${user.email}`);
    if (code !== key) throw new RpcException({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: "O codigo de confirmação não está correto",
    });

    try {
      await this.prismaService.user.delete({where: {id: user.id}});
      await this.myRedisService.sessionDel (this.genUserKey(userId));
    } catch (e) {
      console.log (e)
        throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Não foi possivel deletar a conta",
      });
    }
    return {message: "conta deletada"};
  }
}
