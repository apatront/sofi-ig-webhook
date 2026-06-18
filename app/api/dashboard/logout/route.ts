import { NextResponse } from "next/server";

const DASHBOARD_COOKIE_NAME = "sofi_dashboard_auth";

export async function GET() {
  const response = NextResponse.redirect(new URL("/dashboard/login", process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"
  ));

  response.cookies.set({
    name: DASHBOARD_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}