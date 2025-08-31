import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/utils/auth";
import { sessionManager } from "@/services/SessionManager";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const newSession = await sessionManager.createSession(session.user.id);
    return NextResponse.json(newSession);
  } catch (error) {
    console.error("Session creation failed:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
