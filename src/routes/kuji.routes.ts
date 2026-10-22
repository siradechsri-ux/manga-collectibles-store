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

// Active state for Kuji box in server
let activeConfig: KujiConfig = { ...DEFAULT_KUJI_CONFIG };
let activePrizes: KujiPrize[] = DEFAULT_KUJI_PRIZES.map((p) => ({ ...p }));
let drawHistory: KujiDrawResult[] = [];

function getRemainingTickets(): number {
  return activePrizes.reduce((sum, p) => sum + (p.stockCount || 0), 0);
}

export function createKujiRouter(_pool: Pool, _authService: AuthService): Router {
  const router = Router();

  /**
   * GET /api/kuji/status
   */
  router.get("/status", (_request: Request, response: Response): void => {
    response.json({
      success: true,
      data: {
        config: activeConfig,
        prizes: activePrizes,
        remainingTickets: getRemainingTickets(),
        totalTickets: activeConfig.totalTicketsBox,
      },
    });
  });

  /**
   * GET /api/kuji/history
   */
  router.get("/history", (_request: Request, response: Response): void => {
    response.json({
      success: true,
      data: {
        history: drawHistory.slice(0, 50),
      },
    });
  });

  /**
   * POST /api/kuji/draw
   * Draws 1 or more tickets from the Kuji box.
   */
  router.post("/draw", (request: Request, response: Response): void => {
    const count = Math.min(Math.max(Number(request.body.count || 1), 1), 10);
    const availablePrizes = activePrizes.filter((p) => p.stockCount > 0);

    if (availablePrizes.length === 0) {
      response.status(400).json({
        success: false,
        error: { message: "ตั๋วในตู้ใบนี้หมดแล้ว กรุณารีเฟรชหรือเริ่มตู้ใหม่" },
      });
      return;
    }

    const results: KujiDrawResult[] = [];
    for (let i = 0; i < count; i++) {
      const remainingPool = activePrizes.filter((p) => p.stockCount > 0);
      if (remainingPool.length === 0) break;

      const totalWeight = remainingPool.reduce((acc, p) => acc + p.weight, 0);
      let rand = Math.random() * totalWeight;
      let selectedPrize = remainingPool[0];

      for (const prize of remainingPool) {
        if (rand < prize.weight) {
          selectedPrize = prize;
          break;
        }
        rand -= prize.weight;
      }

      selectedPrize.stockCount -= 1;
      const currentTicketNumber = activeConfig.totalTicketsBox - getRemainingTickets();

      const result: KujiDrawResult = {
        id: `draw-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        prize: { ...selectedPrize },
        ticketNumber: currentTicketNumber,
        drawnAt: new Date().toISOString(),
        pointsSpent: activeConfig.pointsPerDraw,
      };

      results.push(result);
      drawHistory.unshift(result);
    }

    response.json({
      success: true,
      data: {
        results,
        remainingTickets: getRemainingTickets(),
        prizes: activePrizes,
      },
    });
  });

  /**
   * POST /api/kuji/reset (Admin)
   */
  router.post("/reset", (_request: Request, response: Response): void => {
    activeConfig = { ...DEFAULT_KUJI_CONFIG };
    activePrizes = DEFAULT_KUJI_PRIZES.map((p) => ({ ...p }));
    response.json({
      success: true,
      data: {
        config: activeConfig,
        prizes: activePrizes,
        remainingTickets: getRemainingTickets(),
      },
    });
  });

  return router;
}
