import { NextRequest, NextResponse } from "next/server";

const DASHBOARD_COOKIE_NAME = "sofi_dashboard_auth";

function isProtectedDashboardPath(pathname: string) {
// Login/logout API must remain public so users can authenticate
if (pathname === "/api/dashboard/login") return false;
if (pathname === "/api/dashboard/logout") return false;

// Login page must remain public
if (pathname === "/dashboard/login") return false;

// Protect the original dashboard
if (
pathname === "/dashboard" ||
pathname.startsWith("/dashboard/")
) {
return true;
}

// Protect the horizontal dashboard
if (
pathname === "/dashboard-horizontal" ||
pathname.startsWith("/dashboard-horizontal/")
) {
return true;
}

// Protect dashboard data APIs, except login/logout above
if (pathname.startsWith("/api/dashboard")) {
return true;
}

return false;
}

export function proxy(req: NextRequest) {
const { pathname } = req.nextUrl;

if (!isProtectedDashboardPath(pathname)) {
return NextResponse.next();
}

const dashboardSecret = process.env.DASHBOARD_SECRET;

if (!dashboardSecret) {
return NextResponse.json(
{
error: "Dashboard auth is not configured",
},
{ status: 500 }
);
}

const authCookie = req.cookies.get(DASHBOARD_COOKIE_NAME)?.value;

if (authCookie === dashboardSecret) {
return NextResponse.next();
}

if (pathname.startsWith("/api/dashboard")) {
return NextResponse.json(
{
error: "Unauthorized",
},
{ status: 401 }
);
}

const loginUrl = new URL("/dashboard/login", req.url);
loginUrl.searchParams.set("next", pathname);

return NextResponse.redirect(loginUrl);
}

export const config = {
matcher: [
"/dashboard/:path*",
"/dashboard-horizontal/:path*",
"/api/dashboard/:path*",
],
};
