import { NextRequest, NextResponse } from "next/server";

const DASHBOARD_COOKIE_NAME = "sofi_dashboard_auth";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const password = String(formData.get("password") || "");
    const nextPath = String(formData.get("next") || "/dashboard");

    const expectedPassword = process.env.DASHBOARD_PASSWORD;
    const dashboardSecret = process.env.DASHBOARD_SECRET;

    if (!expectedPassword || !dashboardSecret) {
      return NextResponse.json(
        {
          error: "Dashboard auth is not configured",
        },
        { status: 500 }
      );
    }

    if (password !== expectedPassword) {
      const loginUrl = new URL("/dashboard/login", req.url);
      loginUrl.searchParams.set("error", "1");
      loginUrl.searchParams.set("next", nextPath);

      return NextResponse.redirect(loginUrl, { status: 303 });
    }

    const safeNextPath = nextPath.startsWith("/dashboard")
      ? nextPath
      : "/dashboard";

    const response = NextResponse.redirect(new URL(safeNextPath, req.url), {
      status: 303,
    });

    response.cookies.set({
      name: DASHBOARD_COOKIE_NAME,
      value: dashboardSecret,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });

    return response;
  } catch (error) {
    console.error("Dashboard login error:", error);

    return NextResponse.json(
      {
        error: "Invalid login request",
      },
      { status: 400 }
    );
  }
}