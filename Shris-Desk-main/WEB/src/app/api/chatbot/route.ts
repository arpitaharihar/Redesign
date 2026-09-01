import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const message = request.nextUrl.searchParams.get("message") ?? "";
  const reply = message
    ? "Thanks for reaching out. Our HR team will respond soon."
    : "Hi! Share your application ID and we will assist you.";

  return NextResponse.json({ reply });
}
