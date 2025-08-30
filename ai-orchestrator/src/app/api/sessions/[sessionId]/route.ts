import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/utils/auth";
import { sessionManager } from "@/services/SessionManager";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface RouteParams {
  params: {
    sessionId: string;
  };
}

// Helper function to check for authorization
async function isAuthorized(sessionId: string, userId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });
  // @ts-ignore
  return session?.userId === userId;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { sessionId } = params;

  if (!session || !session.user?.id || !await isAuthorized(sessionId, session.user.id)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessionState = await sessionManager.getSessionState(sessionId);
    if (sessionState) {
      return NextResponse.json(sessionState);
    } else {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to get session state:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { sessionId } = params;

  if (!session || !session.user?.id || !await isAuthorized(sessionId, session.user.id)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await sessionManager.terminateSession(sessionId);
    return NextResponse.json({ message: "Session terminated" });
  } catch (error) {
    console.error("Failed to terminate session:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
