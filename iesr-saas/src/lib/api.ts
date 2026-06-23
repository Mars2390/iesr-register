// Tiny JSON response helpers for route handlers.
import { NextResponse } from "next/server";

export const ok = (data: unknown, status = 200) =>
  NextResponse.json({ ok: true, data }, { status });
export const fail = (error: string, status = 400) =>
  NextResponse.json({ ok: false, error }, { status });

export const unauthorized = () => fail("unauthorized", 401);
export const forbidden = () => fail("forbidden", 403);
export const badRequest = (e = "bad_request") => fail(e, 400);
