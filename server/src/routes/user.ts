import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/user/dashboard — User's dashboard summary
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const [user, trades] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.trade.findMany({ where: { userId } }),
    ]);

    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const totalProfit = closedTrades.filter(t => t.profitLoss > 0).reduce((s, t) => s + t.profitLoss, 0);
    const totalLoss = closedTrades.filter(t => t.profitLoss < 0).reduce((s, t) => s + t.profitLoss, 0);
    const winRate = closedTrades.length > 0
      ? (closedTrades.filter(t => t.profitLoss > 0).length / closedTrades.length) * 100
      : 0;

    res.json({
      success: true,
      data: {
        balance: { assigned: user.assignedBalance, available: user.availableBalance },
        stats: {
          totalProfit,
          totalLoss,
          netPnL: totalProfit + totalLoss,
          winRate: Math.round(winRate),
          totalTrades: trades.length,
          openTrades: trades.filter(t => t.status === 'OPEN').length,
          closedTrades: closedTrades.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load dashboard data' });
  }
});

// GET /api/user/trades — User's trades
router.get('/trades', async (req: Request, res: Response) => {
  try {
    const trades = await prisma.trade.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: trades });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load trades' });
  }
});

// GET /api/user/balance-history — User's balance history
router.get('/balance-history', async (req: Request, res: Response) => {
  try {
    const history = await prisma.balanceHistory.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load balance history' });
  }
});

// POST /api/user/withdrawal — Submit withdrawal request
router.post('/withdrawal', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, method, destination, userNotes } = req.body;

    if (!amount || !method || !destination) {
      res.status(400).json({ success: false, error: 'Amount, method, and destination account are required' });
      return;
    }

    // Minimum withdrawal threshold
    const minSetting = await prisma.systemSettings.findUnique({ where: { key: 'withdrawal_min_amount' } });
    const minAmount = minSetting ? parseFloat(minSetting.value) : 100;
    if (amount < minAmount) {
      res.status(400).json({ success: false, error: `Minimum withdrawal amount is $${minAmount.toFixed(2)}` });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    if (amount > user.availableBalance) {
      res.status(400).json({ success: false, error: 'Insufficient available balance' });
      return;
    }

    const balanceBefore = user.availableBalance;
    const balanceAfter = balanceBefore - amount;

    const result = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.create({
        data: { userId, amount, method, destination, userNotes: userNotes || null },
      });

      // Immediately deduct balance from user upon request creation
      await tx.user.update({
        where: { id: userId },
        data: { availableBalance: balanceAfter },
      });

      // Record transaction in user's balance ledger
      await tx.balanceHistory.create({
        data: {
          userId,
          performedById: userId,
          action: 'WITHDRAWAL',
          amount,
          balanceBefore,
          balanceAfter,
          reason: `Withdrawal request: ${method} (${destination})`,
        },
      });

      return withdrawal;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create withdrawal request' });
  }
});

// GET /api/user/withdrawals — User's withdrawal requests
router.get('/withdrawals', async (req: Request, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId: req.user!.id },
      orderBy: { requestedAt: 'desc' },
    });
    res.json({ success: true, data: withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load withdrawal requests' });
  }
});

export default router;
