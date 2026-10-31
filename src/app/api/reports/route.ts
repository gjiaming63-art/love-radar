import { NextResponse } from "next/server";

// Reports are now created only by /api/analyze on the server, so the full report (including paid
// sections) never passes through the browser, and nobody can save hand-written reports on our domain.
export async function POST() {
  return NextResponse.json({ error: "This endpoint has moved. Please refresh the page and try again." }, { status: 410 });
}
