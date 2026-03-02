import { NextRequest, NextResponse } from "next/server";
import { getWhitelist, addToWhitelist, removeFromWhitelist } from "@/lib/kv";

export async function GET() {
  const handles = await getWhitelist();
  return NextResponse.json({ handles });
}

export async function POST(req: NextRequest) {
  const { handle } = (await req.json()) as { handle?: string };
  if (!handle || typeof handle !== "string") {
    return NextResponse.json({ error: "handle required" }, { status: 400 });
  }
  await addToWhitelist(handle.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { handle } = (await req.json()) as { handle?: string };
  if (!handle) {
    return NextResponse.json({ error: "handle required" }, { status: 400 });
  }
  await removeFromWhitelist(handle);
  return NextResponse.json({ ok: true });
}
