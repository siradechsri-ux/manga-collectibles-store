import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { AuthService } from "../auth/auth.service";
import { WishlistItem } from "../services/wishlist.service";

async function getUserWishlistFromDb(pool: Pool, userId: number): Promise<WishlistItem[]> {
  const res = await pool.query<{ item_json: WishlistItem }>(
    `SELECT item_json FROM user_wishlists WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return res.rows.map((r) => r.item_json);
}

export function createWishlistRouter(pool: Pool, _authService: AuthService): Router {
  const router = Router();

  /**
   * GET /api/wishlist
   */
  router.get("/", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = request.user?.id ?? 9001;
      const items = await getUserWishlistFromDb(pool, userId);
      response.json({ success: true, data: items });
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถโหลดรายการที่ชอบได้" } });
    }
  });

  /**
   * POST /api/wishlist
   */
  router.post("/", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = request.user?.id ?? 9001;
      const item: WishlistItem = request.body;

      if (!item?.id) {
        response.status(400).json({ success: false, error: { message: "ข้อมูลสินค้าไม่ถูกต้อง" } });
        return;
      }

      const itemKey = `${item.itemType ?? "ITEM"}:${item.id}`;
      await pool.query(
        `INSERT INTO user_wishlists (user_id, item_id, item_json)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (user_id, item_id) DO UPDATE SET item_json = EXCLUDED.item_json`,
        [userId, itemKey, JSON.stringify(item)],
      );

      const items = await getUserWishlistFromDb(pool, userId);
      response.json({ success: true, data: items });
    } catch (err) {
      console.error("Failed to add to wishlist:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถบันทึกรายการที่ชอบได้" } });
    }
  });

  /**
   * DELETE /api/wishlist/:id
   */
  router.delete("/:id", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = request.user?.id ?? 9001;
      const id = String(request.params.id);

      if (id === "all") {
        await pool.query(`DELETE FROM user_wishlists WHERE user_id = $1`, [userId]);
      } else {
        await pool.query(
          `DELETE FROM user_wishlists
           WHERE user_id = $1
             AND (item_id = $2 OR item_id LIKE $3 OR (item_json->>'id') = $2)`,
          [userId, id, `%:${id}`],
        );
      }

      const items = await getUserWishlistFromDb(pool, userId);
      response.json({ success: true, data: items });
    } catch (err) {
      console.error("Failed to delete from wishlist:", err);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถลบรายการที่ชอบได้" } });
    }
  });

  return router;
}
