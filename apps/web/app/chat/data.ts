import "server-only";
import { asUser } from "@/lib/db";
import type { ChatMessage } from "@/lib/chat";

export interface ConversationRow { id: string; kind: "direct" | "group"; title: string | null; other_person: string | null;
  last_body: string | null; last_at: string | null; unread: string }

export const myConversations = (authUserId: string) =>
  asUser(authUserId, async (c) => (await c.query<ConversationRow>("select * from app.my_conversations()")).rows);

/** Accepted connections of the signed-in user, named through app.profile_card (so blocks / visibility rules apply). */
export const myConnections = (authUserId: string) =>
  asUser(authUserId, async (c) => (await c.query<{ person_id: string; display_name: string }>(
    `select pc.person_id, pc.display_name
       from (select case when requester = app.current_person_id() then addressee else requester end as pid
               from public.connections where status = 'accepted') x,
            lateral app.profile_card(x.pid) pc
      order by pc.display_name`)).rows);

export const initialMessages = (authUserId: string, conversationId: string) =>
  asUser(authUserId, async (c) => (await c.query<ChatMessage>(
    `select id, sender, sender_name, body, removed,
            to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at
       from app.conversation_messages($1, null)`, [conversationId])).rows.reverse());
