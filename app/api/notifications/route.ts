import { getServerSession } from "next-auth";
import { OPTIONS } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import prisma from "@/prisma";

export async function GET(request: Request, response: Response) {
  const session = await getServerSession(OPTIONS);
  const { searchParams } = new URL(request.url);
  const skip = parseInt(searchParams.get("skip")!);

  if (session) {
    const email = session.user?.email!;
    await prisma.notification.updateMany({
      where: {
        to: { email },
      },
      data: {
        read: true,
      },
    });
    const notifications = await prisma.notification.findMany({
      where: {
        to: {
          email,
        },
      },
      include: {
        from: true,
        to: true,
        post: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: skip * 10,
      take: 10,
    });
    if (notifications.length <= 9) {
      return NextResponse.json({ notifications, noMore: true });
    } else {
      return NextResponse.json({ notifications });
    }
  } else {
    return NextResponse.json({ notifications: [] });
  }
}
