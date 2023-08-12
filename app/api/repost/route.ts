import { getServerSession } from "next-auth";
import { OPTIONS } from "../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { PusherServer } from "@/pusher";

export async function GET(request: Request, response: Response) {
  const session = await getServerSession(OPTIONS);
  const { searchParams } = new URL(request.url);

  const postId = searchParams.get("post_id")!;
  if (session) {
    const prisma = new PrismaClient();
    const email = session.user?.email!;
    const user = await prisma.user.findFirst({
      where: { email },
      include: { reposts: true },
    });
    const post = await prisma.post.findFirst({
      where: { id: parseInt(postId) },
      include: { reposts: true, author: true },
    });
    if (user && post) {
      const userRepostIds = user?.reposts.map((repost) => repost.id);
      const postRepostIds = post.reposts.map((repost) => repost.id);

      const includes = userRepostIds.filter((id) => postRepostIds.includes(id));
      if (includes.length > 0) {
        // repost exists
        return NextResponse.json({ reposted: true });
      } else {
        return NextResponse.json({ reposted: false });
      }
    }
  }
}

export async function POST(request: Request, response: Response) {
  const session = await getServerSession(OPTIONS);
  if (session) {
    const prisma = new PrismaClient();
    const email = session.user?.email!;
    const data = await request.json();
    const user = await prisma.user.findFirst({ where: { email } });
    const post = await prisma.post.findFirst({ where: { id: data.id } });

    if (user && post) {
      const repost = await prisma.repost.findFirst({
        where: { author: { id: user.id }, post: { id: post.id } },
      });

      if (repost) {
        await prisma.repost.delete({ where: { id: repost.id } });
        return NextResponse.json({ reposted: false });
      } else {
        await prisma.repost.create({
          data: {
            post: {
              connect: {
                id: post.id,
              },
            },
            author: {
              connect: {
                id: user.id,
              },
            },
          },
        });
        return NextResponse.json({ reposted: true });
      }
    }
  }
}
