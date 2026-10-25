import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { z } from "zod";

const GetChatsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().email("Invalid email address format.")),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    const parsed = GetChatsSchema.safeParse({ email });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "A valid email query parameter is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("user_chats")
      .select("id, email, title, genre, level, user_message, books, ladder, explanation, messages, created_at, updated_at")
      .eq("email", parsed.data.email)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch user chats:", error);
      // Fallback without messages column in case table was created with older schema
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("user_chats")
        .select("id, email, title, genre, level, user_message, books, ladder, explanation, created_at, updated_at")
        .eq("email", parsed.data.email)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fallbackError) {
        return NextResponse.json(
          { error: "Could not retrieve chats." },
          { status: 500 }
        );
      }
      return NextResponse.json({ chats: fallbackData ?? [] });
    }

    return NextResponse.json({ chats: data ?? [] });
  } catch (err) {
    console.error("Chats GET error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

const DeleteChatSchema = z.object({
  id: z.string().trim().uuid("Invalid chat ID format."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().email("Invalid email address format.")),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = DeleteChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_chats")
      .delete()
      .eq("id", parsed.data.id)
      .eq("email", parsed.data.email.toLowerCase().trim());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Chats DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const RenameChatSchema = z.object({
  id: z.string().trim().uuid("Invalid chat ID format."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().email("Invalid email address format.")),
  title: z
    .string()
    .trim()
    .min(1, "Chat title cannot be empty.")
    .max(100, "Chat title cannot exceed 100 characters."),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RenameChatSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid request payload";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { id, email, title } = parsed.data;

    const { error } = await supabase
      .from("user_chats")
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("email", email);

    if (error) {
      console.error("Failed to rename chat:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, title });
  } catch (err) {
    console.error("Chats PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
