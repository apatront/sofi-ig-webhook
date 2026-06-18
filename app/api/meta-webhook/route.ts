export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("META WEBHOOK RAW PAYLOAD:");
    console.log(JSON.stringify(body, null, 2));

    const entries = body.entry || [];

    for (const entry of entries) {
      const messagingEvents = entry.messaging || [];

      for (const event of messagingEvents) {
        const message = event.message;
        const read = event.read;

        if (message) {
          const isEcho = message.is_echo === true;
          const direction = isEcho ? "outbound" : "inbound";

          console.log("PARSED MESSAGE EVENT:", {
            event_type: "message",
            direction,
            isEcho,
            senderId: event.sender?.id,
            recipientId: event.recipient?.id,
            messageId: message.mid,
            text: message.text || null,
            timestamp: event.timestamp,
          });
        } else if (read) {
          console.log("PARSED READ EVENT:", {
            event_type: "read",
            senderId: event.sender?.id,
            recipientId: event.recipient?.id,
            readMessageId: read.mid,
            timestamp: event.timestamp,
          });
        } else {
          console.log("PARSED UNKNOWN EVENT:", {
            event,
          });
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }
}