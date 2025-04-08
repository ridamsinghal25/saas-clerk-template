import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please set the WEBHOOK_SECRET environment variable");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured - No Svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook", err);
    return new Response("Error occured - Invalid signature for webhook", {
      status: 400,
    });
  }

  console.log("event", event);

  const { id } = event.data;
  const eventType = event.type;

  if (eventType === "user.created") {
    try {
      const { email_addresses, primary_email_address_id } = event.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );

      if (!primaryEmail) {
        return new Response("Error occured - No primary email", {
          status: 400,
        });
      }

      // Create a new user

      const user = await prisma.user.create({
        data: {
          id: event.data.id,
          email: primaryEmail.email_address,
          isSubscribed: false,
        },
      });

      console.log("New user created", user);
    } catch (error) {
      return new Response("Error occured - Failed to create user", {
        status: 400,
      });
    }
  }

  return new Response("Webhook received successfully", { status: 200 });
}
