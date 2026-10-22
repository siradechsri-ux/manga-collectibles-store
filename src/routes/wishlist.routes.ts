import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { AuthService } from "../auth/auth.service";
import { WishlistItem } from "../services/wishlist.service";

const wishlistStore = new Map<number, WishlistItem[]>();

function getUserWishlist(userId: number): WishlistItem[] {
  if (!wishlistStore.has(userId)) {
    wishlistStore.set(userId, []);
  }
  return wishlistStore.get(userId)!;
}

export function createWishlistRouter(_pool: Pool, _authService: AuthService): Router {
  const router = Router();

  /**
   * GET /api/wishlist
   */
  router.get("/", (request: Request, response: Response): void => {
    const userId = request.user?.id ?? 9001;
    const items = getUserWishlist(userId);
    response.json({ success: true, data: items });
  });

  /**
   * POST /api/wishlist
   */
  router.post("/", (request: Request, response: Response): void => {
    const userId = request.user?.id ?? 9001;
    const item: WishlistItem = request.body;

    if (!item?.id) {
      response.status(400).json({ success: false, error: { message: "ข้อมูลสินค้าไม่ถูกต้อง" } });
      return;
    }

    const items = getUserWishlist(userId);
    const existingIndex = items.findIndex((i) => String(i.id) === String(item.id));
    if (existingIndex < 0) {
      items.push(item);
    }

    response.json({ success: true, data: items });
  });

  /**
   * DELETE /api/wishlist/:id
   */
  router.delete("/:id", (request: Request, response: Response): void => {
    const userId = request.user?.id ?? 9001;
    const id = request.params.id;

    const items = getUserWishlist(userId);
    const filtered = items.filter((i) => String(i.id) !== String(id));
    wishlistStore.set(userId, filtered);

    response.json({ success: true, data: filtered });
  });

  return router;
}
