import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { PluggyClient } from 'pluggy-sdk';

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'aj-solutions-secret-key-2026';
const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || '';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || '';

let pluggyClient: PluggyClient | null = null;
if (PLUGGY_CLIENT_ID && PLUGGY_CLIENT_SECRET) {
  pluggyClient = new PluggyClient({
    clientId: PLUGGY_CLIENT_ID,
    clientSecret: PLUGGY_CLIENT_SECRET,
  });
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FinApp Backend is running with SaaS Split Engine & Auth!' });
});

// =====================================
// 1. AUTHENTICATION (Login & Register)
// =====================================

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, income } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email já cadastrado.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Cria o usuário e, no mesmo momento, cria um Workspace (Família) padrão para ele
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        income: income || 0,
        workspace: {
          create: {
            name: `Família de ${name}`
          }
        }
      }
    });

    // Cria a Carteira Física Padrão
    await prisma.bankAccount.create({
      data: {
        workspaceId: user.workspaceId,
        accountId: `wallet_${user.id}`,
        name: 'Carteira Física (Dinheiro)',
        type: 'WALLET',
        balance: 0,
        isShared: true,
        ownerId: user.id
      }
    });

    res.status(201).json({ message: 'Usuário, Workspace e Carteira criados com sucesso!' });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign(
      { userId: user.id, workspaceId: user.workspaceId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, workspaceId: user.workspaceId } });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

// Middleware para proteger rotas com JWT
const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Adiciona os dados do token (userId, workspaceId) no request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// =====================================
// 2. MOTORES FINANCEIROS (Protegidos)
// =====================================

// Engine de Rateio Inteligente (Split Payment)
async function processSplitForTransaction(transactionId: string, workspaceId: string, amount: number) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { users: true }
  });

  if (!workspace || workspace.users.length === 0) return [];

  const mode = workspace.splitRuleMode || 'PROPORTIONAL';
  if (mode === 'POOL') return []; // Não gera dívidas no modo Caixa Único

  // Para Rateio, buscamos também a conta para saber se é compartilhada!
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { bankAccount: true }
  });

  if (!transaction || !transaction.bankAccount?.isShared) {
    return []; // Se a conta for privada (isShared = false), a despesa não é rateada com a casa
  }

  const totalIncome = workspace.users.reduce((acc, user) => acc + (user.income || 0), 0);
  let totalCustomPercent = workspace.users.reduce((acc, user) => acc + (user.customSplitPercent || 0), 0);
  
  if (mode === 'CUSTOM' && totalCustomPercent === 0) {
    totalCustomPercent = 100; // fallback para evitar divisão por zero se o admin não configurou
  }

  return await Promise.all(
    workspace.users.map(async (user) => {
      let userProportion = 0;

      if (mode === 'EQUAL') {
        userProportion = 1 / workspace.users.length;
      } else if (mode === 'CUSTOM') {
        userProportion = (user.customSplitPercent || 0) / totalCustomPercent;
      } else { // PROPORTIONAL
        if (totalIncome > 0) {
          userProportion = (user.income || 0) / totalIncome;
        } else {
          userProportion = 1 / workspace.users.length; // fallback
        }
      }

      return prisma.splitPayment.create({
        data: {
          transactionId,
          userId: user.id,
          amountOwed: Math.abs(amount) * userProportion,
          status: 'PENDING'
        }
      });
    })
  );
}

async function syncTransactionsForItem(itemId: string, workspaceId: string) {
  if (!pluggyClient) return 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];

  const accounts = await pluggyClient.fetchAccounts(itemId);
  console.log(`[Sync] ${accounts.results.length} conta(s) para itemId ${itemId}`);
  let txCount = 0;

  for (const account of accounts.results) {
    const bankAccount = await prisma.bankAccount.findUnique({ where: { accountId: account.id } });
    if (!bankAccount) {
      console.warn(`[Sync] Conta ${account.id} não encontrada no banco, pulando.`);
      continue;
    }

    const transactions = await pluggyClient.fetchAllTransactions(account.id, { dateFrom });
    console.log(`[Sync] Conta ${account.name}: ${transactions.length} transação(ões) da Pluggy`);

    for (const tx of transactions) {
      const amount = tx.type === 'DEBIT' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
      const exists = await prisma.transaction.findFirst({
        where: { bankAccountId: bankAccount.id, description: tx.description, amount, date: new Date(tx.date) },
      });
      if (exists) continue;

      const type = tx.type === 'DEBIT' ? 'OUTFLOW' : 'INFLOW';
      const saved = await prisma.transaction.create({
        data: { bankAccountId: bankAccount.id, amount, description: tx.description, date: new Date(tx.date), category: tx.category || null, type, isShared: true },
      });
      if (type === 'OUTFLOW') {
        await processSplitForTransaction(saved.id, workspaceId, saved.amount);
      }
      txCount++;
    }
  }
  console.log(`[Sync] Total salvo: ${txCount} nova(s) transação(ões)`);
  return txCount;
}

// Esta rota simula o recebimento de uma transação via webhook (Open Finance) e calcula a divisão
app.post('/api/transactions/process-split', authMiddleware, async (req: any, res: any) => {
  const { transactionId } = req.body;
  const workspaceId = req.user.workspaceId; // Pega o workspaceId do Token logado!

  try {
    // 1. Busca o Workspace e os usuários para saber a renda (income) de cada um
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { users: true }
    });

    if (!workspace) return res.status(404).json({ error: 'Workspace não encontrado' });

    // 2. Busca a transação original
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) return res.status(404).json({ error: 'Transação não encontrada' });

    // 3. Verifica o modo de rateio
    const mode = workspace.splitRuleMode || 'PROPORTIONAL';
    
    if (mode === 'POOL') {
      return res.json({
        message: 'Modo Caixa Único ativo. Dívidas individuais não geradas.',
        transaction: transaction.amount,
        splitMode: mode,
        splits: []
      });
    }

    const totalIncome = workspace.users.reduce((acc, user) => acc + (user.income || 0), 0);
    let totalCustomPercent = workspace.users.reduce((acc, user) => acc + (user.customSplitPercent || 0), 0);
    
    if (mode === 'CUSTOM' && totalCustomPercent === 0) totalCustomPercent = 100;

    // 4. Cria os SplitPayments
    const splits = await Promise.all(
      workspace.users.map(async (user) => {
        let userProportion = 0;

        if (mode === 'EQUAL') {
          userProportion = 1 / workspace.users.length;
        } else if (mode === 'CUSTOM') {
          userProportion = (user.customSplitPercent || 0) / totalCustomPercent;
        } else { // PROPORTIONAL
          if (totalIncome > 0) userProportion = (user.income || 0) / totalIncome;
          else userProportion = 1 / workspace.users.length; // fallback
        }

        const amountOwed = transaction.amount * userProportion;

        return prisma.splitPayment.create({
          data: {
            transactionId: transaction.id,
            userId: user.id,
            amountOwed: amountOwed,
            status: 'PENDING'
          }
        });
      })
    );

    res.json({
      message: 'Rateio gerado com sucesso!',
      transaction: transaction.amount,
      splitMode: mode,
      splits
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar o rateio' });
  }
});

// =====================================
// 3. GESTÃO DE FAMÍLIA (WORKSPACE)
// =====================================

app.get('/api/family', authMiddleware, async (req: any, res: any) => {
  const workspaceId = req.user.workspaceId;
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        users: {
          select: { id: true, name: true, email: true, income: true, customSplitPercent: true, createdAt: true }
        }
      }
    });
    if (!workspace) return res.status(404).json({ error: 'Workspace não encontrado' });
    
    const totalIncome = workspace.users.reduce((acc, u) => acc + (u.income || 0), 0);
    const mode = workspace.splitRuleMode || 'PROPORTIONAL';
    let totalCustomPercent = workspace.users.reduce((acc, u) => acc + (u.customSplitPercent || 0), 0);
    if (totalCustomPercent === 0) totalCustomPercent = 100;

    const members = workspace.users.map(u => {
      let proportion = 0;
      if (mode === 'EQUAL') proportion = (1 / workspace.users.length) * 100;
      else if (mode === 'CUSTOM') proportion = ((u.customSplitPercent || 0) / totalCustomPercent) * 100;
      else proportion = totalIncome > 0 ? ((u.income || 0) / totalIncome) * 100 : (1 / workspace.users.length) * 100;

      return {
        ...u,
        proportion
      };
    });

    res.json({ workspaceId: workspace.id, name: workspace.name, totalIncome, splitRuleMode: mode, members });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar família' });
  }
});

app.post('/api/family/add', authMiddleware, async (req: any, res: any) => {
  const workspaceId = req.user.workspaceId;
  const { name, email, password, income } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email já cadastrado.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        income: income || 0,
        workspaceId
      }
    });

    // Cria a Carteira Física Padrão para o novo membro
    await prisma.bankAccount.create({
      data: {
        workspaceId,
        accountId: `wallet_${newUser.id}`,
        name: 'Carteira Física (Dinheiro)',
        type: 'WALLET',
        balance: 0,
        isShared: true,
        ownerId: newUser.id
      }
    });

    res.status(201).json({ message: 'Membro adicionado com sucesso', user: { id: newUser.id, name: newUser.name } });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar membro' });
  }
});

app.put('/api/family/member', authMiddleware, async (req: any, res: any) => {
  const { userId, income, customSplitPercent } = req.body;
  const workspaceId = req.user.workspaceId;

  try {
    const userToUpdate = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToUpdate || userToUpdate.workspaceId !== workspaceId) {
      return res.status(403).json({ error: 'Usuário não pertence a esta família' });
    }

    const dataToUpdate: any = {};
    if (income !== undefined) dataToUpdate.income = income;
    if (customSplitPercent !== undefined) dataToUpdate.customSplitPercent = customSplitPercent;

    await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    res.json({ message: 'Membro atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar membro' });
  }
});

app.put('/api/family/mode', authMiddleware, async (req: any, res: any) => {
  const { mode } = req.body;
  const workspaceId = req.user.workspaceId;

  if (!['PROPORTIONAL', 'EQUAL', 'CUSTOM', 'POOL'].includes(mode)) {
    return res.status(400).json({ error: 'Modo inválido' });
  }

  try {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { splitRuleMode: mode }
    });

    res.json({ message: 'Modo de rateio atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar modo de rateio' });
  }
});

app.post('/api/accounts/manual', authMiddleware, async (req: any, res: any) => {
  const { name, balance, isShared } = req.body;
  const workspaceId = req.user.workspaceId;
  const userId = req.user.userId;

  try {
    const account = await prisma.bankAccount.create({
      data: {
        workspaceId,
        accountId: `manual_${Date.now()}_${userId}`,
        name,
        type: 'WALLET',
        balance: parseFloat(balance) || 0,
        isShared: isShared !== undefined ? isShared : true,
        ownerId: userId
      }
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar conta manual' });
  }
});

app.post('/api/transactions/manual', authMiddleware, async (req: any, res: any) => {
  const { bankAccountId, amount, description, type, category, date } = req.body;
  const workspaceId = req.user.workspaceId;

  try {
    const account = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!account || account.workspaceId !== workspaceId) {
      return res.status(403).json({ error: 'Conta não pertence ao seu workspace' });
    }

    const saved = await prisma.transaction.create({
      data: {
        bankAccountId,
        amount: type === 'OUTFLOW' ? -Math.abs(amount) : Math.abs(amount),
        description,
        date: date ? new Date(date) : new Date(),
        category,
        type,
        isShared: account.isShared
      }
    });

    // Atualiza saldo da conta manual
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { balance: { increment: saved.amount } }
    });

    if (type === 'OUTFLOW' && account.isShared) {
      await processSplitForTransaction(saved.id, workspaceId, saved.amount);
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao lançar transação' });
  }
});

app.put('/api/accounts/:id/share', authMiddleware, async (req: any, res: any) => {
  const { id } = req.params;
  const { isShared } = req.body;
  const workspaceId = req.user.workspaceId;

  try {
    const accountWithConn = await prisma.bankAccount.findUnique({
      where: { id },
      include: { bankConnection: true }
    });
    
    if (!accountWithConn || (accountWithConn.workspaceId !== workspaceId && accountWithConn.bankConnection?.workspaceId !== workspaceId)) {
      return res.status(403).json({ error: 'Conta não pertence ao seu workspace' });
    }

    await prisma.bankAccount.update({
      where: { id },
      data: { isShared }
    });

    res.json({ message: 'Status de compartilhamento atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
});

// =====================================
// 4. PAINEL PRINCIPAL (DASHBOARD)
// =====================================

app.get('/api/dashboard', authMiddleware, async (req: any, res: any) => {
  const workspaceId = req.user.workspaceId;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { 
        users: true,
        bankAccounts: {
          include: {
            transactions: {
              include: { splits: { include: { user: true } } }
            }
          }
        },
        bankConnections: {
          include: {
            accounts: {
              include: {
                transactions: {
                  include: { splits: { include: { user: true } } }
                }
              }
            }
          }
        }
      }
    });

    if (!workspace) return res.status(404).json({ error: 'Workspace não encontrado' });

    let totalBalance = 0;
    let totalExpenses = 0;
    const accounts: any[] = [];
    const sharedTransactions: any[] = [];

    workspace.bankConnections.forEach(connection => {
      connection.accounts.forEach(account => {
        totalBalance += account.balance;
        accounts.push({
          id: account.id,
          name: account.name,
          bank: connection.bankName,
          balance: account.balance,
          isCredit: account.type === 'CREDIT_CARD',
          limit: account.creditLimit,
          isShared: account.isShared,
          ownerId: account.ownerId
        });

        account.transactions.forEach(tx => {
          if (tx.type === 'OUTFLOW') {
            totalExpenses += Math.abs(tx.amount);
            if (tx.isShared) {
              sharedTransactions.push({
                id: tx.id,
                description: tx.description,
                amount: Math.abs(tx.amount),
                shares: tx.splits.map(split => ({
                  name: split.user.name,
                  amount: split.amountOwed
                }))
              });
            }
          }
        });
      });
    });

    // Add manual accounts
    workspace.bankAccounts.forEach(account => {
      totalBalance += account.balance;
      accounts.push({
        id: account.id,
        name: account.name,
        bank: 'Carteira/Manual',
        balance: account.balance,
        isCredit: account.type === 'CREDIT_CARD',
        limit: account.creditLimit,
        isShared: account.isShared,
        ownerId: account.ownerId
      });

      account.transactions.forEach(tx => {
        if (tx.type === 'OUTFLOW') {
          totalExpenses += Math.abs(tx.amount);
          if (tx.isShared) {
            sharedTransactions.push({
              id: tx.id,
              description: tx.description,
              amount: Math.abs(tx.amount),
              shares: tx.splits.map(split => ({
                name: split.user.name,
                amount: split.amountOwed
              }))
            });
          }
        }
      });
    });

    const totalIncome = workspace.users.reduce((sum, user) => sum + (user.income || 0), 0);

    res.json({
      workspaceName: workspace.name,
      users: workspace.users.map(u => ({ 
        name: u.name, 
        income: u.income, 
        percentage: totalIncome > 0 ? (u.income / totalIncome) * 100 : 0 
      })),
      finances: {
        totalBalance: totalBalance,
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        leftover: totalIncome - totalExpenses
      },
      accounts: accounts.length > 0 ? accounts : [],
      splits: sharedTransactions.length > 0 ? sharedTransactions : []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
  }
});

// =====================================
// 4. TRANSAÇÕES (CRUD MANUAL)
// =====================================

app.get('/api/transactions', authMiddleware, async (req: any, res: any) => {
  const workspaceId = req.user.workspaceId;
  const { page = '1', limit = '30', type, search } = req.query as any;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { bankConnection: { workspaceId } },
      select: { id: true },
    });
    const accountIds = accounts.map((a: any) => a.id);
    console.log(`[Transactions] workspaceId: ${workspaceId}, contas: ${accountIds.length}`);

    const where: any = { bankAccountId: { in: accountIds } };
    if (type && type !== 'ALL') where.type = type;
    if (search) where.description = { contains: search, mode: 'insensitive' };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          bankAccount: { include: { bankConnection: { select: { bankName: true } } } },
          splits: { include: { user: { select: { name: true } } } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ transactions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

app.post('/api/transactions', authMiddleware, async (req: any, res: any) => {
  const workspaceId = req.user.workspaceId;
  const { bankAccountId, amount, description, type, category, isShared, userId } = req.body;

  try {
    // Basic validation
    if (!bankAccountId || !amount || !description || !type) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }
    
    const shared = isShared !== undefined ? isShared : true;
    if (!shared && !userId) {
      return res.status(400).json({ error: 'Uma despesa individual requer o ID do usuário (userId).' });
    }

    // Verifica se a conta bancária existe e pertence ao workspace (simplificado)
    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        bankAccountId,
        amount: type === 'OUTFLOW' ? -Math.abs(amount) : Math.abs(amount),
        description,
        type,
        category: category || 'Outros',
        date: new Date(),
        isShared: shared,
        userId: shared ? null : userId
      }
    });

    // Se for uma despesa (OUTFLOW) e compartilhada, engatilha o Rateio Inteligente!
    if (type === 'OUTFLOW' && shared) {
      await processSplitForTransaction(transaction.id, workspaceId, transaction.amount);
    }

    res.status(201).json({ message: 'Transação criada com sucesso!', transaction });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
});

// Engine de Parcelamentos (Installments)
// Esta rota simula a criação de uma compra parcelada, gerando as transações futuras
app.post('/api/transactions/installments', authMiddleware, async (req: any, res: any) => {
  const workspaceId = req.user.workspaceId;
  const { bankAccountId, description, totalAmount, totalInstallments, startDate, isShared, userId } = req.body;

  try {
    const shared = isShared !== undefined ? isShared : true;
    if (!shared && !userId) {
      return res.status(400).json({ error: 'Uma despesa individual requer o ID do usuário (userId).' });
    }

    // 1. Cria o registro mestre de Parcelamento
    const installment = await prisma.installment.create({
      data: {
        totalAmount,
        totalInstallments,
        description,
      }
    });

    const installmentAmount = totalAmount / totalInstallments;
    const start = new Date(startDate || new Date());
    const transactionsToCreate = [];

    // 2. Gera as X parcelas (Transações) para os próximos meses
    for (let i = 0; i < totalInstallments; i++) {
      const date = new Date(start);
      date.setMonth(date.getMonth() + i);

      transactionsToCreate.push({
        bankAccountId,
        installmentId: installment.id,
        amount: -Math.abs(installmentAmount),
        description: `${description} (${i + 1}/${totalInstallments})`,
        date: date,
        type: 'OUTFLOW',
        isShared: shared,
        userId: shared ? null : userId
      });
    }

    // 3. Salva todas as transações futuras no banco
    const createdTransactions = await prisma.$transaction(
      transactionsToCreate.map(data => prisma.transaction.create({ data }))
    );

    // 4. Se for compartilhada, processa o rateio para cada transação futura gerada
    if (shared) {
      for (const tx of createdTransactions) {
        await processSplitForTransaction(tx.id, workspaceId, tx.amount);
      }
    }

    res.json({
      message: 'Parcelamento gerado com sucesso!',
      installment,
      transactionsCreated: createdTransactions.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar parcelamento' });
  }
});

// Basic route to list workspaces
app.get('/api/workspaces', async (req, res) => {
  try {
    const workspaces = await prisma.workspace.findMany();
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// =====================================
// 5. OPEN FINANCE (PLUGGY)
// =====================================

// Gera o token do Widget da Pluggy para o frontend
app.get('/api/open-finance/token', authMiddleware, async (req: any, res: any) => {
  if (!pluggyClient) {
    return res.status(500).json({ error: 'Credenciais da Pluggy não configuradas no Backend.' });
  }
  try {
    const connectToken = await pluggyClient.createConnectToken();
    res.json({ accessToken: connectToken.accessToken });
  } catch (error) {
    console.error('Pluggy Token Error:', error);
    res.status(500).json({ error: 'Falha ao conectar com o provedor Open Finance' });
  }
});

// Chamado pelo frontend após o usuário conectar um banco pelo widget (onSuccess)
app.post('/api/open-finance/connect', authMiddleware, async (req: any, res: any) => {
  const { itemId } = req.body;
  const workspaceId = req.user.workspaceId;
  console.log(`[Connect] Recebido — itemId: ${itemId}, workspaceId: ${workspaceId}`);

  if (!pluggyClient) return res.status(500).json({ error: 'Pluggy não configurado.' });
  if (!itemId) return res.status(400).json({ error: 'itemId é obrigatório.' });

  try {
    // 1. Busca os detalhes do item na Pluggy para pegar o nome do banco e status
    const item = await pluggyClient.fetchItem(itemId);
    const bankName = item.connector.name;

    // 2. Remove conexões antigas com o mesmo banco para evitar duplicatas
    const oldConnections = await prisma.bankConnection.findMany({
      where: { workspaceId, bankName, NOT: { itemId } },
      include: { accounts: { include: { transactions: { include: { splits: true } } } } },
    });
    for (const old of oldConnections) {
      for (const acc of old.accounts) {
        for (const tx of acc.transactions) {
          await prisma.splitPayment.deleteMany({ where: { transactionId: tx.id } });
        }
        await prisma.transaction.deleteMany({ where: { bankAccountId: acc.id } });
      }
      await prisma.bankAccount.deleteMany({ where: { bankConnectionId: old.id } });
      await prisma.bankConnection.delete({ where: { id: old.id } });
    }
    console.log(`[Connect] ${oldConnections.length} conexão(ões) duplicada(s) removida(s) para "${bankName}"`);

    // 3. Cria ou atualiza o BankConnection usando o itemId como chave única
    const bankConnection = await prisma.bankConnection.upsert({
      where: { itemId },
      update: { status: item.status },
      create: {
        workspaceId,
        itemId,
        providerName: 'PLUGGY',
        bankName,
        status: item.status,
      },
    });

    // 3. Busca as contas do item e salva/atualiza cada uma
    const accounts = await pluggyClient.fetchAccounts(itemId);
    let accountsCount = 0;

    for (const account of accounts.results) {
      const accountType = account.subtype === 'CREDIT_CARD' ? 'CREDIT_CARD'
        : account.subtype === 'SAVINGS_ACCOUNT' ? 'SAVINGS'
        : 'CHECKING';

      await prisma.bankAccount.upsert({
        where: { accountId: account.id },
        update: {
          balance: account.balance,
          creditLimit: account.creditData?.creditLimit ?? null,
          availableLimit: account.creditData?.availableCreditLimit ?? null,
        },
        create: {
          bankConnectionId: bankConnection.id,
          accountId: account.id,
          name: account.name || account.marketingName || 'Conta',
          type: accountType,
          balance: account.balance,
          currency: account.currencyCode,
          creditLimit: account.creditData?.creditLimit ?? null,
          availableLimit: account.creditData?.availableCreditLimit ?? null,
          dueDate: account.creditData?.balanceDueDate
            ? new Date(account.creditData.balanceDueDate).getDate() : null,
          closingDate: account.creditData?.balanceCloseDate
            ? new Date(account.creditData.balanceCloseDate).getDate() : null,
        },
      });
      accountsCount++;
    }

    const txCount = await syncTransactionsForItem(itemId, workspaceId);

    res.json({
      message: `Banco "${bankConnection.bankName}" conectado! ${accountsCount} conta(s) e ${txCount} transação(ões) salva(s).`,
      connection: { id: bankConnection.id, bankName: bankConnection.bankName, status: bankConnection.status, accountsCount, txCount },
    });
  } catch (error) {
    console.error('Erro ao salvar conexão bancária:', error);
    res.status(500).json({ error: 'Erro ao salvar conexão bancária' });
  }
});

// Webhook: Pluggy avisa quando uma sincronização termina — persiste transações e aciona o rateio
app.post('/api/open-finance/webhook', async (req, res) => {
  const { event, itemId } = req.body;
  res.status(200).send('OK'); // responde imediatamente para Pluggy não retentar

  if (event !== 'item/updated' || !pluggyClient) return;

  console.log(`[Webhook] item/updated recebido para itemId: ${itemId}`);

  try {
    // 1. Localiza a conexão pelo itemId para saber o workspaceId
    const bankConnection = await prisma.bankConnection.findUnique({
      where: { itemId },
      include: { workspace: { include: { users: true } } },
    });

    if (!bankConnection) {
      console.warn(`[Webhook] itemId ${itemId} não encontrado no banco. Ignorado.`);
      return;
    }

    // 2. Atualiza saldos das contas
    const accounts = await pluggyClient.fetchAccounts(itemId);
    for (const account of accounts.results) {
      await prisma.bankAccount.updateMany({
        where: { accountId: account.id },
        data: { balance: account.balance },
      });
    }

    // 3. Sincroniza transações usando a função compartilhada
    const txCount = await syncTransactionsForItem(itemId, bankConnection.workspaceId);

    // 4. Marca a conexão como atualizada
    await prisma.bankConnection.update({
      where: { id: bankConnection.id },
      data: { status: 'UPDATED' },
    });

    console.log(`[Webhook] Sincronização concluída para "${bankConnection.bankName}" — ${txCount} nova(s) transação(ões)`);
  } catch (error) {
    console.error('[Webhook] Erro ao processar:', error);
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
