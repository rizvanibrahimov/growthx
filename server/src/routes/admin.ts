import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/users — List all users
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, fullName: true, phone: true,
        status: true, assignedBalance: true, availableBalance: true,
        createdAt: true, lastLogin: true,
        _count: { select: { trades: true, withdrawals: true } }
      },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch investors' });
  }
});

// POST /api/admin/users — Create new investor account
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName) {
      res.status(400).json({ success: false, error: 'Email, password, and full name are required' });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ success: false, error: 'An account with this email already exists' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, phone: phone || null },
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create investor account' });
  }
});

// GET /api/admin/users/:id — Single investor detail
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        trades: { orderBy: { createdAt: 'desc' } },
        balanceHistory: { orderBy: { createdAt: 'desc' } },
        withdrawals: { orderBy: { requestedAt: 'desc' } },
      },
    });
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// PUT /api/admin/users/:id — Update user status / details
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, fullName, phone } = req.body;
    const data: any = {};
    if (status) data.status = status;
    if (fullName) data.fullName = fullName;
    if (phone !== undefined) data.phone = phone;
    const user = await prisma.user.update({ where: { id }, data });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// POST /api/admin/users/:id/balance — Adjust balance (Deposit / Withdrawal / Adjustment)
router.post('/users/:id/balance', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { action, amount, reason } = req.body;

    if (!action || !amount) {
      res.status(400).json({ success: false, error: 'Action type and amount are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

    const balanceBefore = user.availableBalance;
    let balanceAfter: number;

    if (action === 'DEPOSIT') {
      balanceAfter = balanceBefore + Math.abs(amount);
    } else if (action === 'WITHDRAWAL') {
      balanceAfter = balanceBefore - Math.abs(amount);
    } else {
      balanceAfter = balanceBefore + amount;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          availableBalance: balanceAfter,
          assignedBalance: action === 'DEPOSIT' ? user.assignedBalance + Math.abs(amount) : user.assignedBalance,
        },
      });
      await tx.balanceHistory.create({
        data: {
          userId: id,
          performedById: req.user!.id,
          action,
          amount: Math.abs(amount),
          balanceBefore,
          balanceAfter,
          reason: reason || null,
        },
      });
      return updatedUser;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to update balance' });
  }
});

// POST /api/admin/trades — Record trade
router.post('/trades', async (req: Request, res: Response) => {
  try {
    const { userId, asset, direction, leverage, entryPrice, quantity, notes } = req.body;

    if (!userId || !asset || !direction || !entryPrice || !quantity) {
      res.status(400).json({ success: false, error: 'Required trade parameters are missing' });
      return;
    }

    const trade = await prisma.trade.create({
      data: {
        userId,
        createdById: req.user!.id,
        asset,
        direction,
        leverage: leverage || null,
        entryPrice,
        quantity,
        notes: notes || null,
        status: 'OPEN',
        openedAt: new Date(),
      },
    });

    res.json({ success: true, data: trade });
  } catch (error) {
    console.error('Trade error:', error);
    res.status(500).json({ success: false, error: 'Failed to record trade' });
  }
});

// PUT /api/admin/trades/:id — Settle trade (apply profit / loss)
router.put('/trades/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { exitPrice, status, notes } = req.body;

    const trade = await prisma.trade.findUnique({ where: { id } });
    if (!trade) { res.status(404).json({ success: false, error: 'Trade not found' }); return; }

    if (status === 'CLOSED' && exitPrice !== undefined) {
      const profitLoss = (exitPrice - trade.entryPrice) * trade.quantity * (trade.direction === 'BUY' ? 1 : -1);
      const profitLossPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.direction === 'BUY' ? 1 : -1);

      const user = await prisma.user.findUnique({ where: { id: trade.userId } });
      if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

      const balanceBefore = user.availableBalance;
      const balanceAfter = balanceBefore + profitLoss;
      const balanceAction = profitLoss >= 0 ? 'TRADE_PROFIT' : 'TRADE_LOSS';

      const result = await prisma.$transaction(async (tx) => {
        const updatedTrade = await tx.trade.update({
          where: { id },
          data: { exitPrice, status: 'CLOSED', closedAt: new Date(), profitLoss, profitLossPercent, notes: notes || trade.notes },
        });
        await tx.user.update({
          where: { id: trade.userId },
          data: { availableBalance: balanceAfter },
        });
        await tx.balanceHistory.create({
          data: {
            userId: trade.userId,
            performedById: req.user!.id,
            action: balanceAction,
            amount: Math.abs(profitLoss),
            balanceBefore,
            balanceAfter,
            reason: `${trade.asset} ${trade.direction} | Entry: $${trade.entryPrice} → Exit: $${exitPrice}`,
          },
        });
        return updatedTrade;
      });

      res.json({ success: true, data: result });
      return;
    }

    const data: any = {};
    if (status) data.status = status;
    if (notes) data.notes = notes;
    if (status === 'CANCELLED') data.closedAt = new Date();

    const updated = await prisma.trade.update({ where: { id }, data });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Trade update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update trade' });
  }
});

// GET /api/admin/trades — All trades
router.get('/trades', async (_req: Request, res: Response) => {
  try {
    const trades = await prisma.trade.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    res.json({ success: true, data: trades });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch trades' });
  }
});

// GET /api/admin/withdrawals — All withdrawals
router.get('/withdrawals', async (_req: Request, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawalRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      include: { user: { select: { id: true, fullName: true, email: true, availableBalance: true } } },
    });
    res.json({ success: true, data: withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// PUT /api/admin/withdrawals/:id — Approve / Reject withdrawal
router.put('/withdrawals/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, adminNotes } = req.body;

    const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!withdrawal) { res.status(404).json({ success: false, error: 'Withdrawal request not found' }); return; }
    if (withdrawal.status !== 'PENDING') { res.status(400).json({ success: false, error: 'Only pending requests can be reviewed' }); return; }

    if (status === 'APPROVED') {
      await prisma.withdrawalRequest.update({
        where: { id },
        data: { status: 'APPROVED', adminNotes, reviewedById: req.user!.id, reviewedAt: new Date() },
      });
    } else if (status === 'REJECTED') {
      const user = await prisma.user.findUnique({ where: { id: withdrawal.userId } });
      if (user) {
        const balanceBefore = user.availableBalance;
        const balanceAfter = balanceBefore + withdrawal.amount;

        await prisma.$transaction(async (tx) => {
          await tx.withdrawalRequest.update({
            where: { id },
            data: { status: 'REJECTED', adminNotes, reviewedById: req.user!.id, reviewedAt: new Date() },
          });
          await tx.user.update({
            where: { id: withdrawal.userId },
            data: { availableBalance: balanceAfter },
          });
          await tx.balanceHistory.create({
            data: {
              userId: withdrawal.userId,
              performedById: req.user!.id,
              action: 'REFUND',
              amount: withdrawal.amount,
              balanceBefore,
              balanceAfter,
              reason: `Withdrawal rejected & refunded: ${withdrawal.method} (${adminNotes || 'Declined by admin'})`,
            },
          });
        });
      } else {
        await prisma.withdrawalRequest.update({
          where: { id },
          data: { status: 'REJECTED', adminNotes, reviewedById: req.user!.id, reviewedAt: new Date() },
        });
      }
    } else {
      await prisma.withdrawalRequest.update({
        where: { id },
        data: { status, adminNotes, reviewedById: req.user!.id, reviewedAt: new Date() },
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to process withdrawal request' });
  }
});

// GET /api/admin/settings
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSettings.findMany();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
});

// GET /api/admin/dashboard
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [userCount, totalBalance, openTrades, pendingWithdrawals, recentTrades] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.aggregate({ _sum: { availableBalance: true } }),
      prisma.trade.count({ where: { status: 'OPEN' } }),
      prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
      prisma.trade.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { fullName: true } } } }),
    ]);
    res.json({
      success: true,
      data: {
        userCount,
        totalBalance: totalBalance._sum.availableBalance || 0,
        openTrades,
        pendingWithdrawals,
        recentTrades,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load dashboard statistics' });
  }
});

export default router;
