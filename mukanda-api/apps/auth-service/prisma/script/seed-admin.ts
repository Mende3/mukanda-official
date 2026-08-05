import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const dbUrl = process.env.MUKANDA_AUTH_DATABASE_URL;
const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

function promptPassword(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? (await promptPassword('Email do admin: '));
  const rawPassword =
    process.env.ADMIN_PASSWORD ?? (await promptPassword('Password do admin: '));
  const name = process.env.ADMIN_NAME ?? 'MendesAdmin';

  if (!email || !rawPassword) {
    throw new Error('Email e password são obrigatórios.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Já existe um user com este email (id: ${existing.id}). Nada foi criado.`);
    return;
  }

  const hashed = await bcrypt.hash(rawPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: 'ADMIN',
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log('Admin criado com sucesso:');
  console.log({ id: admin.id, email: admin.email, role: admin.role });
}

main()
  .catch((e) => {
    console.error('Erro ao criar admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });