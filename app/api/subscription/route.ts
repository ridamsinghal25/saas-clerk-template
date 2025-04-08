import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // capture subscription

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const subscriptionEnds = new Date();

    subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1);

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isSubscribed: true,
        subscriptionEnds,
      },
    });

    return NextResponse.json({
      message: "Subscription successful",
      subscriptionEnds: updatedUser.subscriptionEnds,
    });
  } catch (error) {
    console.log("Error updating [SUBSCRIPTION]", error);
    return NextResponse.json(
      { error: "Something went wrong while updating subscription" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        isSubscribed: true,
        subscriptionEnds: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();

    if (user.subscriptionEnds && user.subscriptionEnds < now) {
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          isSubscribed: false,
          subscriptionEnds: null,
        },
      });

      return NextResponse.json(
        {
          message: "Subscription expired",
          isSubscribed: false,
          subscriptionEnds: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Subscription successful",
        isSubscribed: user.isSubscribed,
        subscriptionEnds: user.subscriptionEnds,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error getting [SUBSCRIPTION]", error);
    return NextResponse.json(
      { error: "Something went wrong while getting subscription" },
      { status: 500 }
    );
  }
}
