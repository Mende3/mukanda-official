import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PlanType } from 'apps/business-service/generated/prisma';
import { AgentType } from 'apps/business-service/generated/prisma';
import { UpdateAgentDto, UpdateCustomAgentDto } from './dto/update-agent.dto';
import { CreateCustomAgentDto } from './dto/create-custom-agent.dto';
import { EvogoService } from '@app/evogo';
import { MyRedisService } from '@app/redis';
import { StripePService } from '@app/stripe_p';
import { DateTime } from 'luxon';

@Injectable()
export class BusinessService {

  private readonly logger = new Logger(BusinessService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly evogoService: EvogoService,
    private readonly myRedisService: MyRedisService,
    private readonly stripePService: StripePService,
  ) {}

  // ─── Plan → Enabled Agents ───────────────────────────

  private readonly PLAN_ENABLED_AGENTS: Record<string, AgentType[]> = {
    FREE: [
      AgentType.CONVERSATION
    ],
    BASIC: [
      AgentType.CONVERSATION,
      AgentType.ORDER_MANAGER,
    ],
    PRO: [
      AgentType.CONVERSATION,
      AgentType.ORDER_MANAGER,
      AgentType.SUGGESTIONS,
      AgentType.MARKETING,
    ],
    BUSINESS: [
      AgentType.CONVERSATION,
      AgentType.ORDER_MANAGER,
      AgentType.SUGGESTIONS,
      AgentType.MARKETING,
      AgentType.REENGAGEMENT,
    ],
  };

  private readonly PLAN_CUSTOM_LIMITS: Record<string, number> = {
    FREE:     0,
    BASIC:    2,
    PRO:      4,
    BUSINESS: 5,
  };

  // ─── Helpers ─────────────────────────────────────────

  async findBusinessByOwnerId(ownerId: string) {
    
    const cacheKey = `business:user:${ownerId}`
    const cached = await this.myRedisService.cacheGet(cacheKey);

    if (cached) return JSON.parse(cached);

    const business = await this.prismaService.business.findUnique({
      where: { ownerId },
    });

    if (!business) throw new RpcException({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'O seu negócio não foi encontrado',
    });

    await this.myRedisService.cacheSet (
      cacheKey,
      JSON.stringify(business),
      1800
    );

    return business;
  }

    private endOfToday(): Date {
        return DateTime.now().setZone('Africa/Luanda').endOf('day').toJSDate();
    }

    private startOfToday(): Date {
        return DateTime.now().setZone('Africa/Luanda').startOf('day').toJSDate();
    }

  // ─── System Prompts ──────────────────────────────────

  private buildSystemPromptCA(businessName: string, agentName: string): string {
    return `És o ${agentName}, assistente virtual da ${businessName}. Responde sempre no idioma da pessoa que te escreve.`.trim();
  }

  private buildSystemPromptSA(businessName: string, agentName: string): string {
    return `És o ${agentName}, assistente virtual da ${businessName}. O teu objetivo é sugerir produtos relevantes ao cliente no momento certo.`.trim();
  }

  private buildSystemPromptOA(businessName: string, agentName: string): string {
    return `És o ${agentName}, agente de gestão de encomendas da ${businessName}. O teu objetivo é registar e acompanhar as encomendas do cliente.`.trim();
  }

  private buildSystemPromptMA(businessName: string, agentName: string): string {
    return `És o ${agentName}, agente de marketing da ${businessName}. O teu objetivo é promover produtos e campanhas relevantes ao cliente de forma natural e persuasiva.`.trim();
  }

  private buildSystemPromptRA(businessName: string, agentName: string): string {
    return `És o ${agentName}, agente de reengajamento da ${businessName}. O teu objetivo é reativar clientes inactivos com mensagens personalizadas e ofertas relevantes.`.trim();
  }

  // ─── Agent Factory ───────────────────────────────────

  private buildAgents(
    prompts: {
      conversation: string;
      suggestions: string;
      order: string;
      marketing: string;
      reengagement: string;
    },
    plan: PlanType,
  ) {
    const enabledTypes = new Set(this.PLAN_ENABLED_AGENTS[plan] ?? []);

    const agents = [
      {
        type: AgentType.CONVERSATION,
        name: 'Kusamba',
        description: 'Agente de conversa',
        status: false,
        webhook: this.configService.getOrThrow('KUSAMBA_WEBHOOK_URL'),
        personality: 'friendly',
        systemPrompt: prompts.conversation,
      },
      {
        type: AgentType.SUGGESTIONS,
        name: 'Kulombola',
        description: 'Agente de sugestões e recomendações',
        status: false,
        webhook: this.configService.getOrThrow('KULOMBOLA_WEBHOOK_URL'),
        personality: 'friendly',
        systemPrompt: prompts.suggestions,
      },
      {
        type: AgentType.ORDER_MANAGER,
        name: 'Gestor de Encomendas',
        description: 'Gere pedidos recebidos por WhatsApp',
        status: false,
        webhook: this.configService.getOrThrow('ORDER_MANAGER_WEBHOOK_URL'),
        personality: 'professional',
        systemPrompt: prompts.order,
      },
      {
        type: AgentType.MARKETING,
        name: 'Agente de Marketing',
        description: 'Campanhas e disparos proativos',
        status: false,
        webhook: this.configService.getOrThrow('MARKETING_WEBHOOK_URL'),
        personality: 'persuasive',
        systemPrompt: prompts.marketing,
        pollTrigger: 'both',
        pollMinInterval: 1,
      },
      {
        type: AgentType.REENGAGEMENT,
        name: 'Agente de Reengagement',
        description: 'Reativação de clientes inativos',
        status: false,
        webhook: this.configService.getOrThrow('REENGAGEMENT_WEBHOOK_URL'),
        personality: 'friendly',
        systemPrompt: prompts.reengagement,
      },
    ];

    // isEnabled controlado pelo plano; status sempre false (user controla depois)
    return agents.map(a => ({
      ...a,
      isEnabled: enabledTypes.has(a.type),
    }));
  }

  // ─── Availability Factory ────────────────────────────

  private buildAvailabilitySlots() {
    return [
      { dayOfWeek: 0, startTime: '08:00', endTime: '18:00', isActive: false },
      { dayOfWeek: 1, startTime: '08:00', endTime: '18:00', isActive: true  },
      { dayOfWeek: 2, startTime: '08:00', endTime: '18:00', isActive: true  },
      { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isActive: true  },
      { dayOfWeek: 4, startTime: '08:00', endTime: '18:00', isActive: true  },
      { dayOfWeek: 5, startTime: '08:00', endTime: '18:00', isActive: true  },
      { dayOfWeek: 6, startTime: '08:00', endTime: '18:00', isActive: false },
    ];
  }

  // ─── Cache Keys ──────────────────────────────────────
  private businessKey  = (userId: string) => `business:user:${userId}`;
  private contextBusinessKey = (phoneNumber: string) => `business:phone:${phoneNumber}-n8n.context`;

  private agentsKey     = (userId: string) => `business:user:${userId}:agents`;
  private contextAgentsKey = (phoneNumber: string) => `business:phone:${phoneNumber}:agents-n8n.context`;

  private agentKey = (userId: string, agentId: string) => `business:user:${userId}:agent:${agentId}`;
  private contextAgentKey = (businessId: string, agentType: string) => `business:${businessId}:agentType:${agentType}-n8n.context`;

  private subscriptionKey = (businessId: string) => `business:user:${businessId}`;

  async getSubscription (businessId: string) {
    
    let subscription;

    const cacheKey = this.subscriptionKey(businessId);
    const cache = await this.myRedisService.cacheGet (cacheKey);

    if (cache) {
      subscription = JSON.parse(cache);
    } else {
      subscription = await this.prismaService.subscription.findUniqueOrThrow({
        where: { businessId },
        include: { plan: true },
     });
    }

    if (!subscription) throw new RpcException({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'subscrição não encontrada',
    });

    await this.myRedisService.cacheSet (
      cacheKey,
      JSON.stringify(subscription),
      1800
    );

    return subscription;
  }
  
  // ─── CRUD ────────────────────────────────────────────

  async create(body: {
    user: any;
    name: string;
    phone: string;
    description: string,
    city: string,
    state: string,
    postal_code: string,
   }) {
    const { userId, email } = body.user;
    const {
      name,
      phone,
      description,
      city,
      state,
      postal_code,
    } = body;

    const existing = await this.prismaService.business.findUnique({
      where: { ownerId: userId },
    });

    if (existing) throw new RpcException({
      statusCode: HttpStatus.CONFLICT,
      message: 'O seu negócio já foi criado',
    });

    const instance = await this.evogoService.createInstance (phone);
    const { id, token } = instance.data;

    const freePlan = await this.prismaService.plan.findUnique({
      where: { type: PlanType.FREE}
    });

    if (!freePlan) throw new RpcException({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Plano FREE não configurado',
    });

    const costumer = await this.stripePService.createCustomer({
      name,
      email,
      business_name: name,
      description,
      phone,
      address: {
        country: 'AO',
        city,
        state,
        postal_code
      },
      metadata: {
        ownerId: userId   
      },
    });

    const prompts = {
      conversation:    this.buildSystemPromptCA(name, 'Kusamba'),
      suggestions:     this.buildSystemPromptSA(name, 'Kulombola'),
      order:           this.buildSystemPromptOA(name, 'Gestor de Encomendas'),
      marketing:       this.buildSystemPromptMA(name, 'Promotor'),
      reengagement:    this.buildSystemPromptRA(name, 'Reativador'),
    };
    const agents = this.buildAgents(prompts, PlanType.FREE);
    
    try {
      const business = await this.prismaService.business.create({
        data: {
          ownerId: userId,
          name,
          phone,
          description,
          whatsappInstanceId: id,
          whatsappInstanceToken: token,
          subscription: {
            create: {
              planId: freePlan?.id,
              stripeCustomerId: costumer.id,
              status: 'ACTIVE'
            }
          },
          agents: { create: agents },
          availability: {
            create: {
              acceptOrders: true,
              slots: { create: this.buildAvailabilitySlots() },
            },
          },
          aiUsageQuota: {
            create: {
              used: 0,
              limit: freePlan.aiMessageLimit,
              periodStart: this.startOfToday(),
              periodEnd: this.endOfToday()
            }
          }
        },
      });

      return { message: 'Negócio criado com sucesso', businessId: business.id };

    } catch (e) {
      console.error('error creating business', e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível criar o negócio',
      });
    }
  }

  async get(body: { user: any }) {
    const { userId } = body.user;
    return this.findBusinessByOwnerId(userId);
  }

  async updateBusinessInfo(body: { user: any; name: string; description: string }) {
    const { userId } = body.user;
    const business = await this.findBusinessByOwnerId(userId);
    const { phone } = business;

    try {
      await this.prismaService.business.update({
        where: { id: business.id },
        data: { name: body.name, description: body.description },
      });

      await this.myRedisService.cacheDel(this.businessKey(userId));
      await this.myRedisService.cacheDel(this.contextBusinessKey(phone));      
    } catch (e) {
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível atualizar o negócio',
      });
    }

    return { message: 'Dados atualizados com sucesso' };
  }

  /*
  async updateBusinessPlan(body: { user: any; plan: PlanType }) {
    const { userId } = body.user;
    const { plan } = body;
    const business = await this.findBusinessByOwnerId(userId);

    if (plan === business.plan) throw new RpcException({
      statusCode: HttpStatus.CONFLICT,
      message: 'O plano já é o mesmo',
    });

    const enabledTypes = new Set(this.PLAN_ENABLED_AGENTS[plan] ?? []);

    const existingAgents = await this.prismaService.agent.findMany({
      where: { businessId: business.id, type: { not: AgentType.CUSTOM } },
      select: { type: true },
    });
    const existingTypes = new Set(existingAgents.map(a => a.type));

    const prompts = {
      conversation:    this.buildSystemPromptCA(business.name, 'Kusamba'),
      suggestions:     this.buildSystemPromptSA(business.name, 'Kulombola'),
      order:           this.buildSystemPromptOA(business.name, 'Gestor de Encomendas'),
      marketing:       this.buildSystemPromptMA(business.name, 'Promotor'),
      loyalty:         this.buildSystemPromptLA(business.name, 'Fidelizador'),
      feedback_survey: this.buildSystemPromptFSA(business.name, 'Avaliador'),
      reengagement:    this.buildSystemPromptRA(business.name, 'Reativador'),
      lead_qualifier:  this.buildSystemPromptLQA(business.name, 'Qualificador'),
    };

    const allAgents = this.buildAgents(prompts, plan);
    const toCreate  = allAgents.filter(a => !existingTypes.has(a.type as AgentType));

    try {
      await this.prismaService.$transaction([
        this.prismaService.business.update({
          where: { id: business.id },
          data: { plan },
        }),
        ...(toCreate.length > 0
          ? [this.prismaService.agent.createMany({
              data: toCreate.map(a => ({ ...a, businessId: business.id })),
            })]
          : []),
        this.prismaService.agent.updateMany({
          where: { businessId: business.id, type: { not: AgentType.CUSTOM } },
          data: { isEnabled: false },
        }),
        this.prismaService.agent.updateMany({
          where: { businessId: business.id, type: { in: [...enabledTypes] } },
          data: { isEnabled: true },
        }),
      ]);

      // plano e agentes mudaram
      await this.myRedisService.cacheDel(this.businessKey(userId));
      await this.myRedisService.cacheDel(this.agentsKey(userId));
    } catch (e) {
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível atualizar o plano',
      });
    }

    return { message: 'Plano atualizado com sucesso' };
  }*/

  // ─── Agents ──────────────────────────────────────────

  async findAgentById(agentId: string, businessId: string, userId: string) {
    const cacheKey = this.agentKey(userId, agentId);
    const cached = await this.myRedisService.cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);

    const agent = await this.prismaService.agent.findFirst({
      where: { id: agentId, businessId },
    });

    if (!agent) throw new RpcException({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Agente não encontrado',
    });

    await this.myRedisService.cacheSet (
      cacheKey,
      JSON.stringify(agent),
      1800
    )

    return agent;
  }

  async getAgent(agentId: string, user: any) {
    const { userId } = user;
    const business = await this.findBusinessByOwnerId(userId);
    return this.findAgentById(agentId, business.id, userId);
  }

  async findAgents(body: { user: any }) {
    const { userId } = body.user;

    const cacheKey = this.agentsKey(userId);
    const cached = await this.myRedisService.cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const business = await this.findBusinessByOwnerId(userId);

    try {
      const agent = await this.prismaService.agent.findMany({
        where: { businessId: business.id },
      });

      await this.myRedisService.cacheSet (
        cacheKey,
        JSON.stringify(agent),
        1800
      );

      return agent;      
    } catch (e) {
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível trazer os agentes',
      });
    }
  }

  async updateAgent(agentId: string, user: any, dto: UpdateAgentDto | UpdateCustomAgentDto) {
    const { userId } = user;
    const business = await this.findBusinessByOwnerId(userId);
    const agent    = await this.findAgentById(agentId, business.id, userId);

    // agente não habilitado pelo plano — bloqueia qualquer alteração
    if (!agent.isEnabled) throw new RpcException({
      statusCode: HttpStatus.FORBIDDEN,
      message: 'Este agente não está disponível no seu plano actual',
    });

    let result;

    if (agent.type === AgentType.CUSTOM) {
      result = await this.prismaService.agent.update({
        where: { id: agent.id },
        data: dto,
      });
    } else {
      const { name, description, status, personality, pollTrigger, pollMinInterval } = dto as UpdateAgentDto;
      result = await this.prismaService.agent.update({
        where: { id: agent.id },
        data: { name, description, status, personality, pollTrigger, pollMinInterval },
      });
    }

    await this.myRedisService.cacheDel (this.agentsKey(userId));
    await this.myRedisService.cacheDel(this.contextAgentsKey(business.phone));

    await this.myRedisService.cacheDel (this.agentKey(userId, agentId));
    await this.myRedisService.cacheDel (this.contextAgentKey(business.id, agent.type));

    return result;
  }

  async createCustomAgent(user: any, dto: CreateCustomAgentDto) {
    const { userId } = user;
    const business = await this.findBusinessByOwnerId(userId);

    const limit = this.PLAN_CUSTOM_LIMITS[business.plan] ?? 0;

    if (limit === 0) throw new RpcException({
      statusCode: HttpStatus.FORBIDDEN,
      message: `O plano ${business.plan} não permite agentes personalizados`,
    });

    const currentCount = await this.prismaService.agent.count({
      where: { businessId: business.id, type: AgentType.CUSTOM },
    });

    if (currentCount >= limit) throw new RpcException({
      statusCode: HttpStatus.FORBIDDEN,
      message: `Limite atingido para o plano ${business.plan}. Máximo: ${limit} agentes personalizados`,
    });

    try {
      const agent = await this.prismaService.agent.create({
        data: {
          ...dto,
          type:       AgentType.CUSTOM,
          status:     dto.status ?? false,
          isEnabled:  true,
          businessId: business.id,
        },
      });

      await this.myRedisService.cacheDel(this.agentsKey(userId));
      await this.myRedisService.cacheDel(this.contextAgentsKey(business.phone));

      return { message: 'Agente criado com sucesso', agentId: agent.id };
    } catch (e) {
      console.error(e);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Não foi possível criar o agente',
      });
    }
  }

  async instanceConnect(body: { user: any }) {
    const { userId } = body.user;
    const business = await this.findBusinessByOwnerId(userId);

    const instance = await this.evogoService.connectToInstance(
      business.phone,
      business.whatsappInstanceToken,
    );

    await this.prismaService.business.update({
      where: { id: business.id },
      data: { instanceActive: true, isActive: true },
    });

    await this.myRedisService.cacheDel(this.businessKey(userId));

    return { message: instance.message };
  }

  async getQrAndCodePair (body: {user: any}) {
    const { userId } = body.user;
    const business = await this.findBusinessByOwnerId (userId);

    if (business.instanceActive !== true) {
      throw new RpcException ({
        statusCode: HttpStatus.CONFLICT,
        message: "precisas conectar se a instância do whatsApp"
      });
    }

    const getInstanceQrCode = await this.evogoService.getQrCode (
      business.whatsappInstanceToken
    );

    const getInstancePairCode = await this.evogoService.getPairCode (
      business.phone,
      business.whatsappInstanceToken
    )

    return {
      QrCode: getInstanceQrCode.data.Qrcode,
      PairCode: getInstancePairCode.data.PairingCode
    };
  }


  async remove (body: {user: any}) {

    const { userId } = body.user;
    const business = await this.findBusinessByOwnerId (userId);

    const { id } = business;

    try {

      await this.prismaService.business.delete ({
        where: {id}
      })

    } catch (e) {
      console.log (e);
      throw new RpcException ({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "não foi possivel deletar a business"
      })
    }

    return {message: "business deletado"};
  }

  async getConfig(businessId: string): Promise<{ limit: number | null }> {
    const quota = await this.prismaService.aiUsageQuota.findUnique({ where: { businessId } });
    if (!quota) throw new Error(`AiUsageQuota não encontrado para business ${businessId}`);

    return { limit: quota.limit };
  }

  async recordUsage(businessId: string, quantity: number, usedSnapshot: number): Promise<void> {
    try {
      await this.prismaService.aiUsageEvent.create({ data: { businessId, quantity } });
    } catch (err) {
      this.logger.error(`Falha ao gravar usage event para ${businessId}`, err);
    }

    try {
      await this.prismaService.aiUsageQuota.update({
        where: { businessId },
        data: { used: usedSnapshot }, // usa o valor que já veio do Redis, não recalcula
      });
    } catch (err) {
      this.logger.error(`Falha ao atualizar quota para ${businessId}`, err);
    }
  }
}