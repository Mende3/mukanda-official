// seed-plans.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { PrismaClient, PlanType, QuotaPeriod } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

const dbUrl = process.env.MUKANDA_BUSINESS_DATABASE_URL;
const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });


async function seedPlans() {
  
   const plans = [
    {
      type: PlanType.FREE,
      name: 'Free',
      description: 'Para experimentar o Mukanda (apenas o agente de Conversa)',
      stripePriceId: null,
      amountCents: 0,
      currency: 'aoa',
      aiMessageLimit: 9,
      quotaPeriod: QuotaPeriod.DAILY,
      rateBurstTokens: 3,
      rateRefillPerSec: 3 / 3600, // 3 msgs/hora de rajada — bem restrito
      agentsDefault: 1,
      agentSlots: 1,
      agentsCustom: 0,
    },
    {
      type: PlanType.BASIC,
      name: 'Basic',
      description: 'Para negócios em crescimento (agente de conversa e de geranciamento de encomendas)',
      stripePriceId: 'price_1TxwtTBN6jfCePZi1jdrybGP',
      amountCents: 399999,
      currency: 'aoa',
      aiMessageLimit: 55,
      quotaPeriod: QuotaPeriod.DAILY,
      rateBurstTokens: 8,
      rateRefillPerSec: 8 / 600, // 8 msgs por 10min de rajada
      agentsDefault: 2,
      agentsCustom: 2,
      agentSlots: 4,
    },
    {
      type: PlanType.PRO,
      name: 'Pro',
      description: 'Para negócios estabelecidos (agentes de conversa, geranciamento de encomendas, sugestões e de marketing)',
      stripePriceId: 'price_1TxGG0BN6jfCePZiNJcrSVPu',
      amountCents: 999999,
      currency: 'aoa',
      aiMessageLimit: 210,
      quotaPeriod: QuotaPeriod.DAILY,
      rateBurstTokens: 20,
      rateRefillPerSec: 20 / 300, // 20 msgs por 5min
      agentsDefault: 4,
      agentsCustom: 4,
      agentSlots: 8,
    },
    {
      type: PlanType.BUSINESS,
      name: 'Business',
      description: 'Para operações de grande volume (agentes de conversa, geranciamento de encomendas, sugestões, marketing e reengamment)',
      stripePriceId: 'price_1TxwrDBN6jfCePZipGDHEoWV',
      amountCents: 2899999,
      currency: 'aoa',
      aiMessageLimit: 820,
      quotaPeriod: QuotaPeriod.DAILY,
      rateBurstTokens: 80,
      rateRefillPerSec: 80 / 300, // 80 msgs por 5min
      agentsDefault: 5,
      agentsCustom: 5,
      agentSlots: 10,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { type: plan.type },
      create: plan,
      update: plan, // idempotente: roda de novo pra ajustar limite/preço sem duplicar
    });
  }

  console.log('Planos seeded com sucesso');
}

seedPlans()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());