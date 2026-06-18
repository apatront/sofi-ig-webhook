import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasMetaVerifyToken: Boolean(process.env.META_VERIFY_TOKEN),
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseServiceRoleKey: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  });
}