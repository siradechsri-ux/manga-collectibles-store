import multer, { MulterError, RequestHandler } from "multer";
import { NextFunction, Request, Response } from "express";
import { SlipVerificationError } from "../checkout/slipVerificationService";

const MAX_SLIP_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_SLIP_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class SlipUploadFileTypeError extends Error {
  constructor() {
    super("รองรับไฟล์สลิปเฉพาะ JPEG, PNG และ WEBP");
    this.name = "SlipUploadFileTypeError";
  }
}

export interface SlipUploadErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

function sendUploadError(
  response: Response<SlipUploadErrorBody>,
  error: unknown,
): void {
  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({
        success: false,
        error: {
          code: "SLIP_TOO_LARGE",
          message: "ไฟล์สลิปต้องมีขนาดไม่เกิน 5 MB",
        },
      });
      return;
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      response.status(400).json({
        success: false,
        error: {
          code: "UNEXPECTED_UPLOAD_FIELD",
          message: "กรุณาแนบไฟล์ในช่อง slip เพียง 1 ไฟล์",
        },
      });
      return;
    }
    response.status(400).json({
      success: false,
      error: {
        code: "INVALID_MULTIPART_REQUEST",
        message: "รูปแบบข้อมูลอัปโหลดไฟล์ไม่ถูกต้อง",
      },
    });
    return;
  }

  if (error instanceof SlipUploadFileTypeError) {
    response.status(400).json({
      success: false,
      error: {
        code: "UNSUPPORTED_SLIP_TYPE",
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof SlipVerificationError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  console.error("Slip upload middleware failed.", error);
  response.status(500).json({
    success: false,
    error: {
      code: "UPLOAD_FAILED",
      message: "ไม่สามารถรับไฟล์สลิปได้ในขณะนี้",
    },
  });
}

const slipUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SLIP_SIZE_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_SLIP_MIME_TYPES.has(file.mimetype)) {
      callback(new SlipUploadFileTypeError());
      return;
    }
    callback(null, true);
  },
});

export const uploadSingleSlip: RequestHandler = (
  request: Request,
  response: Response<SlipUploadErrorBody>,
  next: NextFunction,
): void => {
  slipUpload.single("slip")(request, response, (error: unknown) => {
    if (error) {
      sendUploadError(response, error);
      return;
    }
    next();
  });
};
