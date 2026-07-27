// seed-plans.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { PrismaClient, PlanType } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

const dbUrl = process.env.BUSINESS_DATABASE_URL;
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
      aiMessageLimit: 29,
      agentSlots: 1,
    },
    {
      type: PlanType.BASIC,
      name: 'Básico',
      description: 'Para negócios em crescimento',
      stripePriceId: 'price_1TxGD8BN6jfCePZiXefT1c47', // preencher após criar no Stripe
      amountCents: 999999, // $20,00
      currency: 'aoa',
      aiMessageLimit: 899,
      agentSlots: 3,
    },
    {
      type: PlanType.PRO,
      name: 'Pro',
      description: 'Para negócios estabelecidos',
      stripePriceId: 'price_1TxGG0BN6jfCePZiNJcrSVPu',
      amountCents: 1499999, // $50,00
      currency: 'aoa',
      aiMessageLimit: 1499,
      agentSlots: 6,
    },
    {
      type: PlanType.BUSINESS,
      name: 'Business',
      description: 'Para operações de grande volume',
      stripePriceId: 'price_1TxGTBBN6jfCePZixLq2vqTt',
      amountCents: 6499999, // $120,00
      currency: 'aoa',
      aiMessageLimit: null, // ilimitado
      agentSlots: 11, // todos os AgentType
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