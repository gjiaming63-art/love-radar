import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { claimNewUserGiftCode } from "@/lib/unlock-codes";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录后再领取新人福利。" }, { status: 401 });
  }

  const result = await claimNewUserGiftCode(user.id);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
