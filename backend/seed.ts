import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o Seed do Banco de Dados...');

  // Limpar banco
  await prisma.splitPayment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.bankConnection.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  // 1. Criar Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Família do Junio',
    },
  });

  // 2. Criar Usuários
  const hashedPass = await bcrypt.hash('123456', 10);
  
  const junio = await prisma.user.create({
    data: {
      email: 'junio@example.com',
      name: 'Junio',
      password: hashedPass,
      income: 10000,
      workspaceId: workspace.id,
    },
  });

  const esposa = await prisma.user.create({
    data: {
      email: 'esposa@example.com',
      name: 'Esposa',
      password: hashedPass,
      income: 5000,
      workspaceId: workspace.id,
    },
  });

  // 3. Criar Conexão Bancária e Contas
  const connection = await prisma.bankConnection.create({
    data: {
      workspaceId: workspace.id,
      providerName: 'Pluggy',
      itemId: 'mock-item',
      bankName: 'Mock Bank',
      status: 'UPDATED',
    }
  });

  const nu = await prisma.bankAccount.create({
    data: {
      bankConnectionId: connection.id,
      accountId: 'acc-1',
      name: 'Nubank Corrente',
      type: 'CHECKING',
      balance: 15400.00,
    },
  });

  const xp = await prisma.bankAccount.create({
    data: {
      bankConnectionId: connection.id,
      accountId: 'acc-2',
      name: 'XP Visa Infinite',
      type: 'CREDIT_CARD',
      balance: -6320.00,
    },
  });

  const it = await prisma.bankAccount.create({
    data: {
      bankConnectionId: connection.id,
      accountId: 'acc-3',
      name: 'Itaú Personnalité',
      type: 'CHECKING',
      balance: 42150.00,
    },
  });

  // 4. Criar Despesas/Transações
  await prisma.transaction.create({
    data: {
      description: 'Carro (Parcela)',
      amount: -1200.00,
      type: 'OUTFLOW',
      date: new Date(),
      bankAccountId: nu.id,
      isShared: false,
      userId: junio.id,
    },
  });

  await prisma.transaction.create({
    data: {
      description: 'Luz + Condomínio',
      amount: -1500.00,
      type: 'OUTFLOW',
      date: new Date(),
      bankAccountId: nu.id,
      isShared: true,
    },
  });
  
  await prisma.transaction.create({
    data: {
      description: 'Supermercado do Mês',
      amount: -2500.00,
      type: 'OUTFLOW',
      date: new Date(),
      bankAccountId: xp.id,
      isShared: true,
    },
  });

  console.log('Seed completo com sucesso!');
}

main();
