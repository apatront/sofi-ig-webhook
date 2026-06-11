import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("Webhook verification request:", {
    mode,
    tokenFromUrl: token,
    verifyTokenFromEnv: VERIFY_TOKEN,
    challenge,
    tokenMatches: token === VERIFY_TOKEN,
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    {
      error: "Forbidden",
      received: {
        mode,
        tokenFromUrl: token,
        verifyTokenFromEnv: VERIFY_TOKEN,
        tokenMatches: token === VERIFY_TOKEN,
        challenge,
      },
    },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("META WEBHOOK PAYLOAD:");
    console.log(JSON.stringify(body, null, 2));

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }
}