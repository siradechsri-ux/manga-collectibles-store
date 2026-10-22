import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { AuthService } from "../auth/auth.service";
import { MEMBER_TIERS, MemberTier, PointsLedgerEntry } from "../services/points.service";

// In-memory persistent fallback store for user points
const pointsStore = new Map<number, { points: number; ledger: PointsLedgerEntry[] }>();

function getUserPointsData(userId: number) {
  if (!pointsStore.has(userId)) {
    pointsStore.set(userId, {
      points: 450,
      ledger: [
        {
          id: `tx-init-${userId}`,
          type: "WELCOME_BONUS",
          amount: 450,
          balanceAfter: 450,
          description: "แต้มต้อนรับสมาชิกใหม่",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }
  return pointsStore.get(userId)!;
}

export function createPointsRouter(_pool: Pool, _authService: AuthService): Router {
  const router = Router();

  /**
   * GET /api/points/balance
   */
  router.get("/balance", (request: Request, response: Response): void => {
    const userId = request.user?.id ?? 9001;
    const data = getUserPointsData(userId);

    // Calculate Member tier
    let tier: MemberTier = "MEMBER";
    if (data.points >= 2500) tier = "PLATINUM";
    else if (data.points >= 1200) tier = "GOLD";
    else if (data.points >= 500) tier = "SILVER";

    const tierInfo = MEMBER_TIERS[tier];

    response.json({
      success: true,
      data: {
        points: data.points,
        tier,
        tierInfo,
        ledger: data.ledger,
      },
    });
  });

  /**
   * POST /api/points/redeem
   */
  router.post("/redeem", (request: Request, response: Response): void => {
    const userId = request.user?.id ?? 9001;
    const { rewardId, pointsRequired, title } = request.body;

    if (!pointsRequired || pointsRequired <= 0) {
      response.status(400).json({ success: false, error: { message: "จำนวนแต้มไม่ถูกต้อง" } });
      return;
    }

    const data = getUserPointsData(userId);
    if (data.points < pointsRequired) {
      response.status(400).json({ success: false, error: { message: "แต้มสะสมไม่เพียงพอ" } });
      return;
    }

    data.points -= pointsRequired;
    const couponCode = `REW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const entry: PointsLedgerEntry = {
      id: `tx-red-${Date.now()}`,
      type: "REDEEM_REWARD",
      amount: -pointsRequired,
      balanceAfter: data.points,
      description: `แลกรับ: ${title || rewardId || "ของรางวัล"} (โค้ด: ${couponCode})`,
      createdAt: new Date().toISOString(),
    };
    data.ledger.unshift(entry);

    response.json({
      success: true,
      data: {
        points: data.points,
        couponCode,
        entry,
      },
    });
  });

  /**
   * GET /api/points/tiers
   */
  router.get("/tiers", (_request: Request, response: Response): void => {
    response.json({ success: true, data: MEMBER_TIERS });
  });

  return router;
}
