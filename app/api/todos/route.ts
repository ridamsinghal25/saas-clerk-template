import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

const ITEMS_PER_PAGE = 10;

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  console.log("Search Params", searchParams);
  console.log("req.url", req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";

  try {
    const todos = await prisma.todo.findMany({
      where: {
        userId,
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: ITEMS_PER_PAGE,
      skip: (page - 1) * ITEMS_PER_PAGE,
    });

    const totalItems = await prisma.todo.count({
      where: {
        userId,
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
    });

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return NextResponse.json(
      {
        todos,
        currentPage: page,
        totalPages,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.log("Error in getting todos", error);
    return NextResponse.json(
      { error: "Error in getting todos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        todos: true,
      },
    });

    console.log("user", user);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.isSubscribed && user.todos.length >= 3) {
      return NextResponse.json(
        {
          error:
            "Free users can only create upto 3 todos. Please subscribe to our paid plan to write more awesome todos",
        },
        { status: 403 }
      );
    }

    const { title } = await req.json();

    const newTodo = await prisma.todo.create({
      data: {
        title,
        userId,
      },
    });

    if (!newTodo) {
      return NextResponse.json(
        {
          error: "Error in creating todo",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Todo created successfully",
        todo: newTodo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.log("Error in creating todo", error);
    return NextResponse.json(
      { error: "Error while creating todo" },
      { status: 500 }
    );
  }
}
