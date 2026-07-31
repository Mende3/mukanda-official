import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt'
import { 
    EvoGoConnectInstance,
    EvoGoInstance,
    EvoGoQrCode,
    EvoGoResponse,
    EvoGoPairCode
} from './utils/interfaces';
import { handleError } from './utils/handleError';
import { subscribe } from 'diagnostics_channel';
import { rejects } from 'assert';


const EVOGO_DEFAULT_EVENTS = [
  'messages.upsert',
  'messages.update',
  'connection.update',
  'qrcode.updated',
  'contacts.upsert',
  'chats.upsert',
] as const;



@Injectable()
export class EvogoService implements OnModuleInit {
    
    private apiKey: string;
    private apiUrl: string;
    private n8nTrigger: string;

    async onModuleInit() {
        this.apiKey = this.configService.getOrThrow<string>("EVOGO_GLOBAL_API_KEY");
        if (!this.apiKey) throw new Error('EVOGO_API_KEY não definida');
        
        this.apiUrl = this.configService.getOrThrow<string>("EVOGO_URL");
        if (!this.apiUrl) throw new Error('EVOGO_URL não definida');
        
        this.n8nTrigger = this.configService.getOrThrow<string>("N8N_WEBHOOK_TRIGGER");
        if (!this.n8nTrigger) throw new Error('EVOGO_URL não definida');
    }

    constructor (
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {}

    async createInstance (
       instancePhone: string
    ) {
        const tokenInstance = await bcrypt.hash (instancePhone, 10);

        const { data } = await firstValueFrom(
            this.httpService.post<EvoGoResponse<EvoGoInstance>> (
            `${this.apiUrl}/instance/create`,
            {
                name: instancePhone,
                token: tokenInstance
                
            },
            {
                headers: {
                    'apikey': this.apiKey,
                    'Content-Type': 'application/json'
                },
            },
            ).pipe(catchError(handleError))
        );

        return data;
    }

    async connectToInstance (instancePhone: string, instanceToken: string) {

        const { data } = await firstValueFrom(
            this.httpService.post<EvoGoResponse<EvoGoConnectInstance>>(
                `${this.apiUrl}/instance/connect`,
                {
                    immediate: true,
                    phone: instancePhone,
                    subscribe: [
                        'MESSAGE',
                        'SEND_MESSAGE',
                        'CONNECTION',
                        'QRCODE',
                    ],                
                    webhookUrl: this.n8nTrigger    
                },
                {
                    headers: {
                        'apikey': instanceToken,
                        'Content-Type': 'application/json'
                    }
                }
            ).pipe (catchError(handleError))
        );

        return data;
    }

    async getQrCode (instanceToken: string) {
        const { data } = await firstValueFrom(
                this.httpService.get<EvoGoResponse<EvoGoQrCode>>(
                `${this.apiUrl}/instance/qr`,
                {
                    headers: {
                        'apikey': instanceToken,
                        'Content-Type': 'application/json'
                    }
                }
            ).pipe (catchError(handleError))
        )
        
        return data;
    }

    async getPairCode(instancePhone: string, instanceToken: string) {
        const { data } = await firstValueFrom(
            this.httpService.post<EvoGoResponse<EvoGoPairCode>>(
            `${this.apiUrl}/instance/pair`,
            {
                phone: instancePhone,
                subscribe: EVOGO_DEFAULT_EVENTS,
            },
            {
                headers: {
                'apikey': instanceToken,
                'Content-Type': 'application/json',
                },
            },
            ).pipe(catchError(handleError))
        );

        return data;
    }
}
