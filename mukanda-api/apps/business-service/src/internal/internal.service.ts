import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { MyRedisService } from '@app/redis';
import { AgentType } from 'libs/src/shared/src/enums/agent-type.dto';
import { json } from 'stream/consumers';



@Injectable()
export class InternalService {
  
  constructor (
    private readonly prismaService: PrismaService,
    private readonly myRedisService: MyRedisService,
  ) {}

  // gen key
  private genBusinessKey = (phoneNumber: string) => `business:phone:${phoneNumber}-n8n.context`;
  private agentKey = (businessId: string, agentType: string) => `business:${businessId}:agentType:${agentType}-n8n.context`;
  private agentsKey = (phoneNumber: string) => `business:phone:${phoneNumber}:agents-n8n.context`;
  private productsKey = (phoneNumber: string) => `business:phone:${phoneNumber}:products-n8n.context`;
  private availablityKey   = (phoneNumber: string) => `business:phone:${phoneNumber}:availablity-n8n.context`;
  private sessionClientKey = (businessId: string, phoneNumber: string) => `session:${businessId}:${phoneNumber}`;
  private engadedClient = (businessId: string) => `engaded:${businessId}`

  // helpers

  async findBusinessByPhoneNumber (phone: string) {

    const businessKey = this.genBusinessKey (phone);
    const cache = await this.myRedisService.cacheGet(businessKey);
    if (cache) return JSON.parse(cache);
    
    const business = await this.prismaService.business.findUnique({
      where: {phone},
      select: {
        id: true,
        name: true,
        phone: true,
        description: true,
        isActive: true,
        // plan: true,
        whatsappInstanceId: true,
        whatsappInstanceToken: true,
      }
    });

    if (!business) throw new RpcException ({
      statusCode: HttpStatus.NOT_FOUND,
      message: "business não existe"
    });

    await this.myRedisService.cacheSet (
      businessKey,
      JSON.stringify(business),
      1800,
    );

    return business;
  }

  async getAgentsOn (
    phoneNumber: string,
    businessId: string
  ) {
    const agentsKey = this.agentsKey (phoneNumber);
    const cache = await this.myRedisService.cacheGet(agentsKey);
    if (cache) return JSON.parse(cache);

    const agents = await this.prismaService.agent.findMany({
      where: {businessId: businessId},
      select: {
        name: true,
        status: true,
        isEnabled: true,
        description: true,
        systemPrompt: true,
        personality: true,
        pollMinInterval: true,
        pollTrigger: true,
      }
    });
    
    await this.myRedisService.cacheSet (
      agentsKey,
      JSON.stringify(agents),
      1800
    );

    return agents;
  }


  async getBusinessOwner (phoneNumber: string) {
    const business = await this.findBusinessByPhoneNumber (phoneNumber);
    const { id } = business;
    const agents = await this.getAgentsOn (phoneNumber, id);

    return {
      business: business,
      agentsOn: agents
    }
  }

  async getBusinessProducts (phoneNumber: string) {

    const cacheKey = this.productsKey(phoneNumber);
    const cache = await this.myRedisService.cacheGet(cacheKey);
    if (cache) return JSON.parse (cache);
    
    const business = await this.findBusinessByPhoneNumber (phoneNumber);
    const { id } = business;

    const products = await this.prismaService.product.findMany ({
      where: {businessId: id},
      select: {
        name: true,
        category: true,
        imageKey: true,
        description: true,
        aiSuggested: true
      }
    });

    await this.myRedisService.cacheSet (
      cacheKey,
      JSON.stringify(cache),
      1800
    );

    return products
  }

  async getBusinessDate (phoneNumber: string) {

    const cacheKey = this.availablityKey(phoneNumber);
    const cache = await this.myRedisService.cacheGet(cacheKey);
    if (cache) return JSON.parse (cache);
    

    const business = await this.findBusinessByPhoneNumber (phoneNumber);
    const { id } = business;

    const availability = await this.prismaService.availability.findUnique({
      where: {businessId: id},
      include: {slots: {orderBy: {dayOfWeek: 'asc'}}},
    });
    
     await this.myRedisService.cacheSet (
      cacheKey,
      JSON.stringify(cache),
      1800
    );

    return availability;
  }

  async findAgent (
    businessId: string,
    agentType: any
  ) {

    const agentKey = this.agentKey (businessId, agentType);
    const cache = await this.myRedisService.cacheGet(agentKey);
    if (cache) return JSON.parse(cache);

    const agent = await this.prismaService.agent.findFirst({
      where: {
        businessId: businessId,
        type: agentType
      },
      select: {
        name: true,
        description: true,
        systemPrompt: true,
        personality: true,
        pollMinInterval: true,
        pollTrigger: true,
      }
    });

    if (!agent) throw new RpcException ({
      statusCode: HttpStatus.NOT_FOUND,
      message: "agente não existe"
    });

    await this.myRedisService.cacheSet (
      agentKey,
      JSON.stringify(agent),
      1800,
    );

    return agent;
  };


  async getConversationAgent(phoneNumber: string, agentType: string) {
    const business = await this.findBusinessByPhoneNumber (phoneNumber);
    const { id } = business;

    if (agentType !== AgentType.CONVERSATION)
      throw new RpcException ({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "O tipo deve ser CONVERSATION"
    });
    
    const agent = await this.findAgent (id, AgentType.CONVERSATION);

    return  agent;
  }


  // AI

  async registerClientTTL (phoneNumber: string, clientNumber: string) {
    const business = await this.findBusinessByPhoneNumber(phoneNumber)

    const sessionKey = this.sessionClientKey(business.id, clientNumber);
    const hasActiveSession = await this.myRedisService.cacheGet (sessionKey);

    if (!hasActiveSession) {
      await this.myRedisService.cachezAdd (
        this.engadedClient(business.id),
        clientNumber
      );
    }

    await this.myRedisService.cacheSet(
      sessionKey,
      '1',
      30*60
    );

    return {'message': 'numbero do client guardado'};
  }

  async allClientsTTL (phoneNumber: string) {
    const business = await this.findBusinessByPhoneNumber(phoneNumber)

    const clientsNumber = await this.myRedisService.cachezRangeActive (this.engadedClient(business.id));

    const context = clientsNumber.map((clientNumber) => ({
      number: clientNumber.split(':')[0],
      remoteJID: clientNumber.split(':')[1]
    }))

    console.log (context);
    return context;
  }

}
