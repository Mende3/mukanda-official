import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { RpcException } from '@nestjs/microservices';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
    constructor(
        private readonly configService: ConfigService,
    ) {}

    async sendEmail(to: string, subject: string, html: string) {
        const resend = new Resend(this.configService.getOrThrow<string>('RESEND_API_TOKEN'));

        const {data, error} = await resend.emails.send({
            from: 'mukanda <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: `${html}`,
        });

        if (error) {
            console.error('Error sending email:', error);
            throw new RpcException({
                statusCode: 500,
                message: 'Failed to send email',
            });
        }

        return data;
    };

}