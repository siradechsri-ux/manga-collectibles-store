import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { AuthService } from "../auth/auth.service";
import {
  DEFAULT_KUJI_CONFIG,
  DEFAULT_KUJI_PRIZES,
  KujiConfig,
  KujiPrize,
  KujiDrawResult,
} from "../services/kuji.service";

interface KujiBoxRow {
  config_json: KujiConfig;
  prizes_json: KujiPrize[];
  history_json: KujiDrawResult[];
}

async function loadKujiBoxFromDb(pool: Pool): Promise<{
  config: KujiConfig;
  prizes: KujiPrize[];
  history: KujiDrawResult[];
}> {
  const res = await pool.query<KujiBoxRow>(
    `SELECT config_json, prizes_json, history_json FROM kuji_box_state WHERE id = 1`,
  );
  if (res.rows.length === 0) {
    const config = { ...DEFAULT_KUJI_CONFIG };
    const prizes = DEFAULT_KUJI_PRIZES.map((p) => ({ ...p }));
    const history: KujiDrawResult[] = [];
    await pool.query(
      `INSERT INTO kuji_box_state (id, config_json, prizes_json, history_json)
       VALUES (1, $1::jsonb, $2::jsonb, $3::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify(config), JSON.stringify(prizes), JSON.stringify(history)],
    );
    return { config, prizes, history };
  }
  return {
    config: res.rows[0].config_json,
    prizes: res.rows[0].prizes_json,
    history: res.rows[0].history_json,
  };
}

async function saveKujiBoxToDb(
  pool: Pool,
  config: KujiConfig,
  prizes: KujiPrize[],
  history: KujiDrawResult[],
): Promise<void> {
  await pool.query(
    `UPDATE kuji_box_state
     SET config_json = $1::jsonb,
         prizes_json = $2::jsonb,
         history_json = $3::jsonb,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [JSON.stringify(config), JSON.stringify(prizes), JSON.stringify(history.slice(0, 100))],
  );
}

function getRemainingTickets(prizes: KujiPrize[]): number {
  return prizes.reduce((sum, p) => sum + (p.stockCount || 0), 0);
}

export function createKujiRouter(pool: Pool, _authService: AuthService): Router {
  const router = Router();

  /**
   * GET /api/kuji/status
   */
  router.get("/status", async (_request: Request, response: Response): Promise<void> => {
    try {
      const { config, prizes, history } = await loadKujiBoxFromDb(pool);
      response.json({
        success: true,
        data: {
          config,
          prizes,
          history: history.slice(0, 50),
          remainingTickets: getRemainingTickets(prizes),
          totalTickets: config.totalTicketsBox,
        },
      });
    } catch (err) {
      console.error("Failed to load Kuji status:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถโหลดข้อมูลตู้สุ่มได้" } });
    }
  });

  /**
   * GET /api/kuji/history
   */
  router.get("/history", async (_request: Request, response: Response): Promise<void> => {
    try {
      const { history } = await loadKujiBoxFromDb(pool);
      response.json({
        success: true,
        data: {
          history: history.slice(0, 50),
        },
      });
    } catch (err) {
      console.error("Failed to load Kuji history:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถโหลดประวัติการสุ่มได้" } });
    }
  });

  /**
   * POST /api/kuji/draw
   * Draws 1 or more tickets from the Kuji box and persists to PostgreSQL.
   */
  router.post("/draw", async (request: Request, response: Response): Promise<void> => {
    try {
      const { config, prizes, history } = await loadKujiBoxFromDb(pool);
      const count = Math.min(Math.max(Number(request.body.count || 1), 1), 10);
      const availablePrizes = prizes.filter((p) => p.stockCount > 0);

      if (availablePrizes.length === 0) {
        response.status(400).json({
          success: false,
          error: { message: "ตั๋วในตู้สุ่มนี้หมดแล้ว กรุณารอการเติมรอบถัดไป" },
        });
        return;
      }

      const results: KujiDrawResult[] = [];
      let currentRemaining = getRemainingTickets(prizes);
      const actualDrawCount = Math.min(count, currentRemaining);

      for (let i = 0; i < actualDrawCount; i++) {
        const poolPrizes = prizes.filter((p) => p.stockCount > 0);
        if (poolPrizes.length === 0) break;

        const totalWeight = poolPrizes.reduce((acc, p) => acc + p.weight * p.stockCount, 0);
        let random = Math.random() * totalWeight;
        let selectedPrize = poolPrizes[0];

        for (const prize of poolPrizes) {
          const prizePoolWeight = prize.weight * prize.stockCount;
          if (random < prizePoolWeight) {
            selectedPrize = prize;
            break;
          }
          random -= prizePoolWeight;
        }

        selectedPrize.stockCount -= 1;
        currentRemaining -= 1;

        const drawResult: KujiDrawResult = {
          id: `kuji-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
          prize: { ...selectedPrize },
          ticketNumber: config.totalTicketsBox - currentRemaining,
          drawnAt: new Date().toISOString(),
          pointsSpent: config.pointsPerDraw,
        };

        results.push(drawResult);
        history.unshift(drawResult);
      }

      await saveKujiBoxToDb(pool, config, prizes, history);

      response.json({
        success: true,
        data: {
          results,
          remainingTickets: getRemainingTickets(prizes),
          prizes,
        },
      });
    } catch (err) {
      console.error("Failed to draw Kuji ticket:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถสุ่มตั๋วได้" } });
    }
  });

  /**
   * PATCH /api/kuji/config
   * Updates Kuji box configuration or prizes in PostgreSQL (Admin).
   */
  router.patch("/config", async (request: Request, response: Response): Promise<void> => {
    try {
      const { config, prizes, history } = await loadKujiBoxFromDb(pool);
      const nextConfig = request.body.config ? { ...config, ...request.body.config } : config;
      const nextPrizes = Array.isArray(request.body.prizes) ? request.body.prizes : prizes;
      await saveKujiBoxToDb(pool, nextConfig, nextPrizes, history);
      response.json({
        success: true,
        data: {
          config: nextConfig,
          prizes: nextPrizes,
          remainingTickets: getRemainingTickets(nextPrizes),
        },
      });
    } catch (err) {
      console.error("Failed to update Kuji config:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถอัปเดตตั้งค่าตู้สุ่มได้" } });
    }
  });

  /**
   * POST /api/kuji/reset
   */
  router.post("/reset", async (_request: Request, response: Response): Promise<void> => {
    try {
      const nextConfig = { ...DEFAULT_KUJI_CONFIG };
      const nextPrizes = DEFAULT_KUJI_PRIZES.map((p) => ({ ...p }));
      await saveKujiBoxToDb(pool, nextConfig, nextPrizes, []);
      response.json({
        success: true,
        data: {
          config: nextConfig,
          prizes: nextPrizes,
          remainingTickets: getRemainingTickets(nextPrizes),
        },
      });
    } catch (err) {
      console.error("Failed to reset Kuji box:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถรีเซ็ตตู้สุ่มได้" } });
    }
  });

  return router;
}
