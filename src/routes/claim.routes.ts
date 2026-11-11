import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { z } from "zod";
import { AuthService } from "../auth/auth.service";
import { recordAuditLog } from "../db/database";

const createClaimSchema = z.object({
  orderId: z.coerce.number().int().positive("กรุณาระบุหมายเลขคำสั่งซื้อ"),
  issueType: z.enum([
    "BROKEN_PARTS",
    "MISSING_PARTS",
    "DAMAGED_BOOK",
    "WRONG_ITEM",
    "OTHER",
  ]),
  description: z.string().trim().min(5, "กรุณาระบุรายละเอียดความเสียหายอย่างน้อย 5 ตัวอักษร"),
  unboxingVideoUrl: z
    .string()
    .trim()
    .min(1, "กรุณาแนบลิงก์คลิปวิดีโอขณะแกะกล่องพัสดุ (Unboxing Video)")
    .url("ลิงก์วิดีโอแกะกล่องต้องเป็น URL ที่ถูกต้อง"),
  photoUrls: z.array(z.string().url()).optional().default([]),
});

const updateClaimSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "RESOLVED"]).optional(),
  resolutionType: z
    .enum(["SPARE_PARTS", "REPLACEMENT", "REFUND", "NONE"])
    .optional(),
  adminNotes: z.string().optional(),
});

export function createClaimRouter(pool: Pool, _authService?: AuthService): Router {
  const router = Router();

  function getEffectiveUserId(request: Request): number {
    if (request.user?.id) {
      return request.user.id;
    }
    const headerUserId = request.headers["x-user-id"];
    if (headerUserId && !Array.isArray(headerUserId) && /^\d+$/.test(headerUserId)) {
      return Number(headerUserId);
    }
    return 9001;
  }

  function generateClaimCode(): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `CLM-${dateStr}-${rand}`;
  }

  /**
   * POST /api/claims
   * Submit a new RMA/Damage claim with mandatory unboxing video (FR-11.2, TC-CLM-07).
   */
  router.post("/", async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getEffectiveUserId(request);

      // TC-CLM-07 check for unboxing video
      const rawVideoUrl = request.body?.unboxingVideoUrl;
      if (!rawVideoUrl || typeof rawVideoUrl !== "string" || rawVideoUrl.trim() === "") {
        response.status(400).json({
          success: false,
          error: {
            code: "VIDEO_REQUIRED",
            message: "จำเป็นต้องแนบลิงก์คลิปวิดีโอขณะแกะกล่องพัสดุ (Unboxing Video) ตามนโยบายการรับประกัน",
          },
        });
        return;
      }

      const parsed = createClaimSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "ข้อมูลการเคลมไม่ถูกต้อง",
          },
        });
        return;
      }

      const input = parsed.data;
      const claimCode = generateClaimCode();

      const insertRes = await pool.query(
        `INSERT INTO claims (
           claim_code, order_id, user_id, issue_type, description,
           photo_urls, unboxing_video_url, status, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          claimCode,
          input.orderId,
          userId,
          input.issueType,
          input.description,
          JSON.stringify(input.photoUrls),
          input.unboxingVideoUrl,
        ],
      );

      const claim = insertRes.rows[0];
      response.status(201).json({
        success: true,
        data: {
          claim: {
            id: claim.id,
            claimCode: claim.claim_code,
            orderId: Number(claim.order_id),
            userId: claim.user_id,
            issueType: claim.issue_type,
            description: claim.description,
            photoUrls: claim.photo_urls,
            unboxingVideoUrl: claim.unboxing_video_url,
            status: claim.status,
            createdAt: claim.created_at,
          },
        },
      });
    } catch (error) {
      console.error("Failed to submit claim:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถส่งคำร้องเคลมสินค้าได้" } });
    }
  });

  /**
   * GET /api/claims
   * Get all claims submitted by current user (or all if Admin/Staff).
   */
  router.get("/", async (request: Request, response: Response): Promise<void> => {
    try {
      const isStaffOrAdmin =
        request.user?.role === "ADMIN" || request.user?.role === "STAFF";
      const userId = getEffectiveUserId(request);

      const res = isStaffOrAdmin
        ? await pool.query(
            `SELECT * FROM claims ORDER BY created_at DESC`,
          )
        : await pool.query(
            `SELECT * FROM claims WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId],
          );

      const claims = res.rows.map((row) => ({
        id: row.id,
        claimCode: row.claim_code,
        orderId: Number(row.order_id),
        userId: row.user_id,
        issueType: row.issue_type,
        description: row.description,
        photoUrls: row.photo_urls,
        unboxingVideoUrl: row.unboxing_video_url,
        status: row.status,
        resolutionType: row.resolution_type,
        adminNotes: row.admin_notes,
        resolvedAt: row.resolved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      response.json({ success: true, data: { claims } });
    } catch (error) {
      console.error("Failed to fetch claims:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถโหลดข้อมูลคำร้องเคลมได้" } });
    }
  });

  /**
   * GET /api/admin/claims
   * Admin/Staff endpoint to view all claims.
   */
  router.get("/admin", async (_request: Request, response: Response): Promise<void> => {
    try {
      const res = await pool.query(`SELECT * FROM claims ORDER BY created_at DESC`);
      const claims = res.rows.map((row) => ({
        id: row.id,
        claimCode: row.claim_code,
        orderId: Number(row.order_id),
        userId: row.user_id,
        issueType: row.issue_type,
        description: row.description,
        photoUrls: row.photo_urls,
        unboxingVideoUrl: row.unboxing_video_url,
        status: row.status,
        resolutionType: row.resolution_type,
        adminNotes: row.admin_notes,
        resolvedAt: row.resolved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      response.json({ success: true, data: { claims } });
    } catch (error) {
      console.error("Failed to fetch admin claims:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถโหลดรายการเคลมได้" } });
    }
  });

  /**
   * PATCH /api/admin/claims/:id
   * Admin/Staff review, approve, reject, or resolve claim (FR-11.3).
   */
  router.patch("/:id", async (request: Request, response: Response): Promise<void> => {
    try {
      const claimId = Number(request.params.id);
      if (!Number.isInteger(claimId) || claimId <= 0) {
        response
          .status(400)
          .json({ success: false, error: { message: "รหัสคำร้องเคลมไม่ถูกต้อง" } });
        return;
      }

      const parsed = updateClaimSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
          },
        });
        return;
      }

      const existingRes = await pool.query(`SELECT * FROM claims WHERE id = $1`, [claimId]);
      if (existingRes.rows.length === 0) {
        response
          .status(404)
          .json({ success: false, error: { code: "NOT_FOUND", message: "ไม่พบคำร้องเคลม" } });
        return;
      }

      const existing = existingRes.rows[0];
      const { status, resolutionType, adminNotes } = parsed.data;
      const isResolving = status === "RESOLVED" || status === "APPROVED";

      const updateRes = await pool.query(
        `UPDATE claims
         SET status = COALESCE($1, status),
             resolution_type = COALESCE($2, resolution_type),
             admin_notes = COALESCE($3, admin_notes),
             resolved_at = CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE resolved_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [
          status ?? null,
          resolutionType ?? null,
          adminNotes ?? null,
          isResolving,
          claimId,
        ],
      );

      const updated = updateRes.rows[0];

      // Audit Log TC-SEC-10
      await recordAuditLog(pool, {
        performedByUserId: request.user?.id ?? 9002,
        action: `CLAIM_${status ?? "UPDATED"}`,
        resourceType: "claim",
        resourceId: claimId,
        oldValues: {
          status: existing.status,
          resolutionType: existing.resolution_type,
        },
        newValues: {
          status: updated.status,
          resolutionType: updated.resolution_type,
          adminNotes: updated.admin_notes,
        },
        ipAddress: request.ip,
      });

      response.json({
        success: true,
        data: {
          claim: {
            id: updated.id,
            claimCode: updated.claim_code,
            orderId: Number(updated.order_id),
            userId: updated.user_id,
            issueType: updated.issue_type,
            description: updated.description,
            photoUrls: updated.photo_urls,
            unboxingVideoUrl: updated.unboxing_video_url,
            status: updated.status,
            resolutionType: updated.resolution_type,
            adminNotes: updated.admin_notes,
            resolvedAt: updated.resolved_at,
            createdAt: updated.created_at,
            updatedAt: updated.updated_at,
          },
        },
      });
    } catch (error) {
      console.error("Failed to update claim:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถอัปเดตคำร้องเคลมได้" } });
    }
  });

  return router;
}

