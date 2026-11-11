import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { z } from "zod";
import { AuthService } from "../auth/auth.service";

const addressInputSchema = z.object({
  label: z.string().trim().min(1, "กรุณากรอกชื่อเรียกที่อยู่").max(60),
  recipientName: z.string().trim().min(1, "กรุณากรอกชื่อผู้รับ").max(150),
  recipientPhone: z.string().trim().min(1, "กรุณากรอกเบอร์โทรศัพท์").max(30),
  addressLine: z.string().trim().min(1, "กรุณากรอกที่อยู่").max(300),
  addressVillage: z.string().trim().max(100).optional().default(""),
  street: z.string().trim().max(150).optional().default(""),
  subdistrict: z.string().trim().min(1, "กรุณากรอกแขวง/ตำบล").max(120),
  district: z.string().trim().min(1, "กรุณากรอกเขต/อำเภอ").max(120),
  province: z.string().trim().min(1, "กรุณากรอกจังหวัด").max(120),
  postalCode: z.string().trim().regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
  isDefault: z.boolean().optional().default(false),
});

export function createAddressRouter(pool: Pool, _authService?: AuthService): Router {
  const router = Router();

  function getEffectiveUserId(request: Request): number {
    if (request.user?.id) {
      return request.user.id;
    }
    const headerUserId = request.headers["x-user-id"];
    if (headerUserId && !Array.isArray(headerUserId) && /^\d+$/.test(headerUserId)) {
      return Number(headerUserId);
    }
    return 9001; // Default demo customer
  }

  /**
   * GET /api/user/addresses
   * List all saved addresses for current user.
   */
  router.get("/", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getEffectiveUserId(request);
      const res = await pool.query(
        `SELECT id, user_id, label, recipient_name, recipient_phone,
                address_line, address_village, street, subdistrict, district, province,
                postal_code, is_default, created_at, updated_at
         FROM user_addresses
         WHERE user_id = $1
         ORDER BY is_default DESC, created_at ASC`,
        [userId],
      );

      const addresses = res.rows.map((row) => ({
        id: row.id,
        label: row.label,
        recipientName: row.recipient_name,
        recipientPhone: row.recipient_phone,
        addressLine: row.address_line,
        addressVillage: row.address_village || "",
        street: row.street || "",
        subdistrict: row.subdistrict,
        district: row.district,
        province: row.province,
        postalCode: row.postal_code,
        isDefault: Boolean(row.is_default),
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }));

      response.json({ success: true, data: { addresses } });
    } catch (error) {
      console.error("Failed to load user addresses:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถโหลดข้อมูลที่อยู่ได้" } });
    }
  });

  /**
   * POST /api/user/addresses
   * Create a new address for current user.
   */
  router.post("/", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getEffectiveUserId(request);
      const parsed = addressInputSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "ข้อมูลที่อยู่ไม่ถูกต้อง",
          },
        });
        return;
      }

      const input = parsed.data;
      const addressId = `addr-${userId}-${Date.now()}`;

      // Check if user has any existing addresses
      const countRes = await pool.query(
        `SELECT COUNT(*)::int as count FROM user_addresses WHERE user_id = $1`,
        [userId],
      );
      const isFirst = (countRes.rows[0]?.count ?? 0) === 0;
      const shouldBeDefault = isFirst || input.isDefault;

      if (shouldBeDefault) {
        await pool.query(
          `UPDATE user_addresses SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
          [userId],
        );
      }

      const insertRes = await pool.query(
        `INSERT INTO user_addresses (
           id, user_id, label, recipient_name, recipient_phone,
           address_line, address_village, street, subdistrict, district, province,
           postal_code, is_default, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          addressId,
          userId,
          input.label,
          input.recipientName,
          input.recipientPhone,
          input.addressLine,
          input.addressVillage,
          input.street,
          input.subdistrict,
          input.district,
          input.province,
          input.postalCode,
          shouldBeDefault,
        ],
      );

      const row = insertRes.rows[0];
      const created = {
        id: row.id,
        label: row.label,
        recipientName: row.recipient_name,
        recipientPhone: row.recipient_phone,
        addressLine: row.address_line,
        addressVillage: row.address_village || "",
        street: row.street || "",
        subdistrict: row.subdistrict,
        district: row.district,
        province: row.province,
        postalCode: row.postal_code,
        isDefault: Boolean(row.is_default),
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      };

      response.status(201).json({ success: true, data: { address: created } });
    } catch (error) {
      console.error("Failed to create user address:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถบันทึกข้อมูลที่อยู่ได้" } });
    }
  });

  /**
   * PATCH /api/user/addresses/:id
   * Update an existing address.
   */
  router.patch("/:id", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getEffectiveUserId(request);
      const addressId = request.params.id;
      const parsed = addressInputSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "ข้อมูลที่อยู่ไม่ถูกต้อง",
          },
        });
        return;
      }

      const existingRes = await pool.query(
        `SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2`,
        [addressId, userId],
      );
      if (existingRes.rows.length === 0) {
        response.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลที่อยู่" },
        });
        return;
      }

      const input = parsed.data;
      if (input.isDefault) {
        await pool.query(
          `UPDATE user_addresses SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
          [userId],
        );
      }

      const existing = existingRes.rows[0];
      const updatedRes = await pool.query(
        `UPDATE user_addresses
         SET label = COALESCE($1, label),
             recipient_name = COALESCE($2, recipient_name),
             recipient_phone = COALESCE($3, recipient_phone),
             address_line = COALESCE($4, address_line),
             address_village = COALESCE($5, address_village),
             street = COALESCE($6, street),
             subdistrict = COALESCE($7, subdistrict),
             district = COALESCE($8, district),
             province = COALESCE($9, province),
             postal_code = COALESCE($10, postal_code),
             is_default = COALESCE($11, is_default),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $12 AND user_id = $13
         RETURNING *`,
        [
          input.label,
          input.recipientName,
          input.recipientPhone,
          input.addressLine,
          input.addressVillage,
          input.street,
          input.subdistrict,
          input.district,
          input.province,
          input.postalCode,
          input.isDefault,
          addressId,
          userId,
        ],
      );

      const row = updatedRes.rows[0];
      const address = {
        id: row.id,
        label: row.label,
        recipientName: row.recipient_name,
        recipientPhone: row.recipient_phone,
        addressLine: row.address_line,
        addressVillage: row.address_village || "",
        street: row.street || "",
        subdistrict: row.subdistrict,
        district: row.district,
        province: row.province,
        postalCode: row.postal_code,
        isDefault: Boolean(row.is_default),
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      };

      response.json({ success: true, data: { address } });
    } catch (error) {
      console.error("Failed to update user address:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถอัปเดตข้อมูลที่อยู่ได้" } });
    }
  });

  /**
   * DELETE /api/user/addresses/:id
   * Delete an address.
   */
  router.delete("/:id", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getEffectiveUserId(request);
      const addressId = request.params.id;

      const existingRes = await pool.query(
        `SELECT is_default FROM user_addresses WHERE id = $1 AND user_id = $2`,
        [addressId, userId],
      );
      if (existingRes.rows.length === 0) {
        response.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลที่อยู่" },
        });
        return;
      }

      const wasDefault = Boolean(existingRes.rows[0].is_default);
      await pool.query(
        `DELETE FROM user_addresses WHERE id = $1 AND user_id = $2`,
        [addressId, userId],
      );

      if (wasDefault) {
        // Promote another address to default
        await pool.query(
          `UPDATE user_addresses
           SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
           WHERE id = (
             SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1
           )`,
          [userId],
        );
      }

      response.json({ success: true, data: { deletedId: addressId } });
    } catch (error) {
      console.error("Failed to delete user address:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถลบข้อมูลที่อยู่ได้" } });
    }
  });

  /**
   * POST /api/user/addresses/:id/default
   * Set address as default.
   */
  router.post("/:id/default", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getEffectiveUserId(request);
      const addressId = request.params.id;

      await pool.query(
        `UPDATE user_addresses SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
        [userId],
      );

      const res = await pool.query(
        `UPDATE user_addresses
         SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [addressId, userId],
      );

      if (res.rows.length === 0) {
        response.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลที่อยู่" },
        });
        return;
      }

      response.json({ success: true, data: { isDefault: true } });
    } catch (error) {
      console.error("Failed to set default address:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถตั้งเป็นที่อยู่หลักได้" } });
    }
  });

  return router;
}

