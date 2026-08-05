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
      name: 'Grátis',
      description: 'Para experimentar o Mukanda',
      stripePriceId: null,
      amountCents: 0,
      currency: 'aoa',
      aiMessageLimit: 9,
      quotaPeriod: QuotaPeriod.DAILY,
      rateBurstTokens: 3,
      rateRefillPerSec: 3 / 3600, // 3 msgs/hora de rajada — bem restrito
      agentSlots: 2,
    },
    {
      type: PlanType.BASIC,
      name: 'Básico',
      description: 'Para negócios em crescimento',
      stripePriceId: 'price_1TxwtTBN6jfCePZi1jdrybGP',
      amountCents: 449999,
      currency: 'aoa',
      aiMessageLimit: 55,
      quotaPeriod: QuotaPeriod.DAILY,
      rateBurstTokens: 8,
      rateRefillPerSec: 8 / 600, // 8 msgs por 10min de rajada
      agentSlots: 4,
    },
    {
      type: PlanType.PRO,
      name: 'Pro',
      description: 'Para negócios estabelecidos',
      stripePriceId: 'price_1TxGG0BN6jfCePZiNJcrSVPu',
      amountCents: 999999,
      currency: 'aoa',
      aiMessageLimit: 210,
      quotaPeriod: QuotaPeriod.DAILY,
      rateBurstTokens: 20,
      rateRefillPerSec: 20 / 300, // 20 msgs por 5min
      agentSlots: 7,
    },
    {
      type: PlanType.BUSINESS,
      name: 'Business',
      description: 'Para operações de grande volume',
      stripePriceId: 'price_1TxwrDBN6jfCePZipGDHEoWV',
      amountCents: 2899999,
      currency: 'aoa',
      aiMessageLimit: 820,
      quotaPeriod: QuotaPeriod.DAILY,
      rateBurstTokens: 80,
      rateRefillPerSec: 80 / 300, // 80 msgs por 5min
      agentSlots: 11,
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