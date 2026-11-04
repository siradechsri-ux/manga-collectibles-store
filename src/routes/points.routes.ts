import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { AuthService } from "../auth/auth.service";
import { MEMBER_TIERS, MemberTier, PointsLedgerEntry } from "../services/points.service";

async function ensureUserPointsInDb(
  pool: Pool,
  userId: number,
): Promise<{ points: number; ledger: PointsLedgerEntry[] }> {
  const existing = await pool.query<{ points: number }>(
    `SELECT points FROM user_points WHERE user_id = $1`,
    [userId],
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO user_points (user_id, points) VALUES ($1, 450) ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    await pool.query(
      `INSERT INTO points_ledger (id, user_id, tx_type, amount, balance_after, description)
       VALUES ($1, $2, 'WELCOME_BONUS', 450, 450, 'แต้มต้อนรับสมาชิกใหม่')
       ON CONFLICT (id) DO NOTHING`,
      [`tx-init-${userId}`, userId],
    );
  }

  const ptsRes = await pool.query<{ points: number }>(
    `SELECT points FROM user_points WHERE user_id = $1`,
    [userId],
  );
  const points = ptsRes.rows[0]?.points ?? 450;

  const ledgerRes = await pool.query<{
    id: string;
    tx_type: string;
    amount: number;
    balance_after: number;
    description: string;
    reference_id: string | null;
    created_at: Date;
  }>(
    `SELECT id, tx_type, amount, balance_after, description, reference_id, created_at
     FROM points_ledger
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );

  const ledger: PointsLedgerEntry[] = ledgerRes.rows.map((r) => ({
    id: r.id,
    type: r.tx_type as PointsLedgerEntry["type"],
    amount: Number(r.amount),
    balanceAfter: Number(r.balance_after),
    description: r.description,
    ...(r.reference_id ? { referenceId: r.reference_id } : {}),
    createdAt:
      r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));

  return { points: Number(points), ledger };
}

export function createPointsRouter(pool: Pool, _authService: AuthService): Router {
  const router = Router();

  /**
   * GET /api/points/balance
   */
  router.get("/balance", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = request.user?.id ?? 9001;
      const data = await ensureUserPointsInDb(pool, userId);

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
    } catch (err) {
      console.error("Failed to fetch points balance:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถโหลดแต้มสะสมได้" } });
    }
  });

  /**
   * POST /api/points/redeem
   */
  router.post("/redeem", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = request.user?.id ?? 9001;
      const { rewardId, pointsRequired, title, type, referenceId } = request.body;

      if (!pointsRequired || pointsRequired <= 0) {
        response.status(400).json({ success: false, error: { message: "จำนวนแต้มไม่ถูกต้อง" } });
        return;
      }

      const data = await ensureUserPointsInDb(pool, userId);
      if (data.points < pointsRequired) {
        response.status(400).json({ success: false, error: { message: "แต้มสะสมไม่เพียงพอ" } });
        return;
      }

      const nextPoints = data.points - Number(pointsRequired);
      const couponCode = `REW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const txId = `tx-red-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const txType = type || "REDEEM_REWARD";
      const desc =
        txType === "REDEEM_DISCOUNT"
          ? title || `ใช้แต้มเป็นส่วนลดคำสั่งซื้อ`
          : `แลกรับ: ${title || rewardId || "ของรางวัล"} (โค้ด: ${couponCode})`;

      await pool.query(
        `UPDATE user_points SET points = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
        [userId, nextPoints],
      );
      await pool.query(
        `INSERT INTO points_ledger (id, user_id, tx_type, amount, balance_after, description, reference_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [txId, userId, txType, -Number(pointsRequired), nextPoints, desc, referenceId ?? null],
      );

      const entry: PointsLedgerEntry = {
        id: txId,
        type: txType,
        amount: -Number(pointsRequired),
        balanceAfter: nextPoints,
        description: desc,
        ...(referenceId ? { referenceId } : {}),
        createdAt: new Date().toISOString(),
      };

      response.json({
        success: true,
        data: {
          points: nextPoints,
          couponCode,
          entry,
        },
      });
    } catch (err) {
      console.error("Failed to redeem points:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถแลกแต้มสะสมได้" } });
    }
  });

  /**
   * POST /api/points/adjust
   * Adds or deducts points in PostgreSQL (e.g. order earned points, review bonus, dev bonus).
   */
  router.post("/adjust", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = request.user?.id ?? 9001;
      const { amount, type, description, referenceId } = request.body;
      const delta = Number(amount);
      if (!Number.isFinite(delta) || delta === 0) {
        response.status(400).json({ success: false, error: { message: "จำนวนแต้มไม่ถูกต้อง" } });
        return;
      }

      const data = await ensureUserPointsInDb(pool, userId);
      const nextPoints = Math.max(0, data.points + delta);
      const txId = `tx-adj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const txType = type || "EARN_ORDER";
      const desc = description || "รายการปรับปรุงแต้มสะสม";

      await pool.query(
        `UPDATE user_points SET points = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
        [userId, nextPoints],
      );
      await pool.query(
        `INSERT INTO points_ledger (id, user_id, tx_type, amount, balance_after, description, reference_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [txId, userId, txType, delta, nextPoints, desc, referenceId ?? null],
      );

      response.json({
        success: true,
        data: {
          points: nextPoints,
        },
      });
    } catch (err) {
      console.error("Failed to adjust points:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถปรับปรุงแต้มสะสมได้" } });
    }
  });

  /**
   * GET /api/points/tiers
   */
  router.get("/tiers", (_request: Request, response: Response): void => {
    response.json({
      success: true,
      data: MEMBER_TIERS,
    });
  });

  return router;
}
