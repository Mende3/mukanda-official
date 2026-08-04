import { HttpCode, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentType } from 'apps/business-service/generated/prisma';
import { Campaign } from './entities/campaign.entity';
import { ConfigService } from '@nestjs/config';
import { MyRedisService } from '@app/redis';
import { RmqService } from '@app/rmq';
import { CampaignSchedulerService } from './campaign-scheduler/campaign-scheduler.service';

@Injectable()
export class CampaignService {

  constructor (
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly myRedisService: MyRedisService,
    private readonly rmq: RmqService,
    private readonly campaignScheduler: CampaignSchedulerService,
  ) {}


  // ─── Cache Keys ───────────────────────────────────────
  private campaignListKey  = (userId: string) => `user:${userId}:campagins`;
  private campaignKey      = (userId: string, campaignId: string) => `user:${userId}:campagin:${campaignId}`;

  
  // ─── Helpers ─────────────────────────────────────────
  
  async findBusinessByOwnerId(ownerId: string) {
    const business = await this.prismaService.business.findUnique({
      where: { ownerId },
    });

    if (!business) throw new RpcException({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'O seu negócio não foi encontrado',
    });

    return business;
  }

  //-----------------------------

  getPublicUrl (key: string): string {
    return `${this.configService.get('R2_PUBLIC_URL')}/${key}`;
  }

  private withFlyerUrls<T extends { rules?: any[] }>(campaign: T): T {
      if (!campaign.rules?.length) return campaign

    return {
      ...campaign,
      rules: campaign.rules.map((rule) => ({
        ...rule,
        flyerUrl: rule.flyerKey
            ? this.getPublicUrl(rule.flyerKey)
            : null,
      })),
    }
  }

  private withFlyerUrlsMany<T extends { rules?: any[] }>(campaigns: T[]): T[] {
      return campaigns.map((c) => this.withFlyerUrls(c))
  }

  //--------------------------------------
  

  async create(body: {
    user: any,
    message: string,
    name: string,
    agentId: string,
    rules: any,
  }) {
    const { userId } = body.user;
    const { message, name, rules, agentId } = body;

    const business = await this.findBusinessByOwnerId(userId);

    const agent = await this.prismaService.agent.findFirst({
      where: { id: agentId, businessId: business.id },
    });

    if (!agent) {
      throw new RpcException({ statusCode: 404, message: 'Agente não encontrado' });
    }

    const campaignAgentTypes: AgentType[] = [AgentType.MARKETING, AgentType.CUSTOM];
    if (!campaignAgentTypes.includes(agent.type)) {
      throw new RpcException({
        statusCode: 400,
        message: `Agente do tipo ${agent.type} não suporta campanhas`,
      });
    }

    const campaign = await this.prismaService.campaign.create({
      data: {
        businessId: business.id,
        agentId: agent.id,
        message,
        name,
        rules: { create: rules ?? [] },
      },
      include:{ rules: true}
    });

    await this.myRedisService.cacheDel(this.campaignListKey(userId));

    campaign.rules.forEach((rule) => {
      this.campaignScheduler.registerRuleJobs({ ...rule, campaign });
    })

    return this.withFlyerUrls(campaign);
  }

  async findAll(body: { user: any, agentId: string }) {
    const { userId } = body.user;

    const cacheKey = this.campaignListKey(userId);
    const cached = await this.myRedisService.cacheGet(cacheKey);

    if (cached) return JSON.parse(cached);

    const business = await this.findBusinessByOwnerId(userId);


    const agent = await this.prismaService.agent.findFirst({
      where: { id: body.agentId, businessId: business.id },
    });

    if (!agent) {
      throw new RpcException({ statusCode: 404, message: 'Agente não encontrado' });
    }

    try {
      const campaigns = await this.prismaService.campaign.findMany({
        where: { agentId: agent.id, businessId: business.id },
        include: { rules: true}
      });

      const result = this.withFlyerUrlsMany(campaigns);
      await this.myRedisService.cacheSet(cacheKey, JSON.stringify(result), 1800);
      return result;
    } catch(e) {
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível trazer todas campanhas',
      });
    }
  }

  async findOne(body: { user: any, agentId: string, campaignId: string }) {
    const { userId } = body.user;

    const cacheKey = this.campaignKey(userId, body.campaignId);
    const cached = await this.myRedisService.cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);


    const business = await this.findBusinessByOwnerId(userId);

    const agent = await this.prismaService.agent.findFirst({
      where: { id: body.agentId, businessId: business.id },
    });

    if (!agent) {
      throw new RpcException({ statusCode: 404, message: 'Agente não encontrado' });
    }

    try {
      const campaign = await this.prismaService.campaign.findFirst({
        where: {
          id: body.campaignId,
          agentId: agent.id,
          businessId: business.id, // dupla validação, mais seguro
        },
        include: { rules: true}
      });

      if (!campaign) {
        throw new RpcException({ statusCode: HttpStatus.NOT_FOUND, message: "Campanha não encontrada" });
      }

      const result = this.withFlyerUrls(campaign);
      await this.myRedisService.cacheSet(cacheKey, JSON.stringify(result), 1800);
      return result;
    } catch (e) {
      if (e instanceof RpcException) throw e;
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível trazer essa campanha',
      });
    }
  }
  
  async update(body: {
    user: any,
    agentId: string,
    campaignId: string,
    message?: string,
    name?: string,
    rules?: any,
  }) {
    const { userId } = body.user;
    const { agentId, campaignId, message, name, rules } = body;

    const business = await this.findBusinessByOwnerId(userId);

    const agent = await this.prismaService.agent.findFirst({
      where: { id: agentId, businessId: business.id },
    });

    if (!agent) {
      throw new RpcException({ statusCode: 404, message: 'Agente não encontrado' });
    }

    try {
      const campaign = await this.prismaService.campaign.findFirst({
        where: {
          id: campaignId,
          agentId: agent.id,
          businessId: business.id,
        },
        include: { rules: true},
      });
      
      if (!campaign) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Campanha não encontrada',
        });
      }

      campaign.rules.forEach((oldRule) => {
        this.campaignScheduler.unregisterRuleJobs(oldRule.id);
      });
            
      // se vierem rules novas, substitui as antigas (delete + create)
      const updated = await this.prismaService.campaign.update({
        where: { id: campaignId },
        data: {
          ...(message !== undefined && { message }),
          ...(name !== undefined && { name }),
          ...(rules !== undefined && {
            rules: {
              deleteMany: {}, // remove as rules antigas desta campanha
              create: rules,  // cria as novas
            },
          }),
        },
        include: {rules: true},
      });

      updated.rules.forEach((newRule) => {
        this.campaignScheduler.registerRuleJobs({ ...newRule, campaign: updated });
      });

      const result = this.withFlyerUrls (updated)
      await this.myRedisService.cacheDel(this.campaignListKey(userId));
      await this.myRedisService.cacheDel(this.campaignKey(userId, body.campaignId));

      return result;

    } catch (e) {
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível atualizar essa campanha',
      });
    }
  }

  async remove(body: {
    user: any,
    agentId: string,
    campaignId: string,
  }) {
    const { userId } = body.user;
    const { agentId, campaignId } = body;

    const business = await this.findBusinessByOwnerId(userId);

    const agent = await this.prismaService.agent.findFirst({
      where: { id: agentId, businessId: business.id },
    });

    if (!agent) {
      throw new RpcException({ statusCode: 404, message: 'Agente não encontrado' });
    }

    const campaign = await this.prismaService.campaign.findFirst({
      where: {
        id: campaignId,
        agentId: agent.id,
        businessId: business.id,
      },
    });

    if (!campaign) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Campanha não encontrada',
      });
    }

    const campaignWithRules = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
      include: { rules: true },
    });

    campaignWithRules?.rules.forEach((rule) => {
      this.campaignScheduler.unregisterRuleJobs(rule.id);
    });

    await this.prismaService.campaign.delete({
      where: { id: campaignId },
    });


    await this.myRedisService.cacheDel(this.campaignListKey(userId));
    await this.myRedisService.cacheDel(this.campaignKey(userId, body.campaignId));

    return { message: 'Campanha removida com sucesso' };
  }

  async uploadCampaignImage(campaignId: string, key: string | null, userId: string) {
    const campaignRule = await this.prismaService.campaignRule.findFirst({
        where: { campaignId: campaignId }
    })

    if (!campaignRule) throw new RpcException({ statusCode: 404, message: 'Regra de campanhã não encontrada' })
    
    const updated = await this.prismaService.campaignRule.update({
      where: {id: campaignRule.id},
      data: {flyerKey: key},
    });

    await this.myRedisService.cacheDel(this.campaignListKey(userId));
    await this.myRedisService.cacheDel(this.campaignKey(userId, campaignId));

    return updated;
  }

}
