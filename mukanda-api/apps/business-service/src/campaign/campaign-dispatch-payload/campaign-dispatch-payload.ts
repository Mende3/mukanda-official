import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '../../prisma/prisma.service';
import { MyRedisService } from '@app/redis';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';
import { ConfigService } from '@nestjs/config';

interface CampaignDispatchPayload {
  campaignId: string;
  ruleId: string;
}

@Injectable()
export class CampaignDispatchConsumer {
  private readonly logger = new Logger(CampaignDispatchConsumer.name);
  private readonly TWENTY_DAYS_MS = 20 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly myRedisService: MyRedisService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private engagedKey = (businessId: string) => `engaded:${businessId}`;

  @RabbitSubscribe({
    exchange: 'campaigns',
    routingKey: 'campaign.dispatch.*',
    queue: 'campaign-dispatch-queue',
    queueOptions: {
      durable: true,
      channel: 'campaign-dispatch-channel'
    },
  })
  async handleDispatch(payload: CampaignDispatchPayload) {
    this.logger.log(`A processar campanha ${payload.campaignId} / regra ${payload.ruleId}`);

    // 1. Busca campanha + regra específica
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: payload.campaignId },
      include: { rules: { where: { id: payload.ruleId } } },
    });

    if (!campaign || campaign.rules.length === 0) {
      this.logger.warn(`Campanha ${payload.campaignId} ou regra ${payload.ruleId} não encontrada`);
      return;
    }

    

    const rule = campaign.rules[0];

    // 2. Busca clientes elegíveis no sorted set, já filtrando janela de 20 dias na própria query
    const cutoff = Date.now() - this.TWENTY_DAYS_MS;
    const engagedClients = await this.myRedisService.cachezRangeByScore(
      this.engagedKey(campaign.businessId),
      cutoff,
      Date.now(),
    );

    if (engagedClients.length === 0) {
      this.logger.log(`Nenhum cliente engajado para negócio ${campaign.businessId}, campanha ignorada`);
      return;
    }

    // 3. Monta payload para o n8n
    const n8nPayload = {
      campaignId: campaign.id,
      ruleId: rule.id,
      businessId: campaign.businessId,
      message: campaign.message,
      flyerKey: rule.flyerKey,
      aiPromptHint: rule.aiPromptHint,
      clients: engagedClients,
    };

    // 4. Dispara para o n8n
    try {
      await firstValueFrom(
        this.httpService
          .post(this.configService.get<string>('N8N_CAMPAIGN_WEBHOOK_URL')!, n8nPayload, {
            headers: {
              'x-internal-key-campaign': this.configService.get<string>('N8N_INTERNAL_KEY_CAMPAIGN'),
              'Content-Type': 'application/json',
            },
          })
          .pipe(
            catchError((err) => {
              this.logger.error(`Falha ao chamar webhook do n8n para campanha ${campaign.id}`, err);
              throw err;
            }),
          ),
      );

      this.logger.log(`Campanha ${campaign.id} enviada ao n8n com ${engagedClients.length} clientes`);
    } catch (err) {
      // aqui decides: retry, dead-letter, ou só loga e segue
    }
  }
}