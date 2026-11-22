import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
}

function validJwtSecret() {
  const secret = process.env.JWT_SECRET;
  return secret && secret.length >= 32 && !secret.startsWith("replace-this")
    ? secret
    : undefined;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.campuscash_token;
  const secret = validJwtSecret();
  if (!token || !secret) {
    res
      .status(401)
      .json({
        error: { code: "UNAUTHORIZED", message: "Please log in to continue." },
      });
    return;
  }
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      throw new Error("Invalid token payload");
    }
    req.userId = payload.sub;
    next();
  } catch {
    res
      .status(401)
      .json({
        error: {
          code: "UNAUTHORIZED",
          message: "Your session has expired. Please log in again.",
        },
      });
  }
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof SyntaxError && "body" in error) {
    res
      .status(400)
      .json({
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      });
    return;
  }
  console.error(error);
  res
    .status(500)
    .json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
      },
    });
}
