import { z } from "zod";

// message_type: incoming/outgoing/activity/template — o servidor decide
// incoming vs outgoing; o cliente nunca envia activity.

export const MessagesQuerySchema = z.object({
  after: z.coerce.number().int().optional(), // só mensagens com id > after
});

export const CreateMessageSchema = z.object({
  content: z.string().trim().min(1).max(150000),
  private: z.boolean().default(false),
  content_type: z.string().default("text"),
  content_attributes: z.record(z.string(), z.unknown()).optional(),
  // mensagens enviadas "como e-mail" (CC/BCC) — espelha messages_controller
  echo_id: z.union([z.string(), z.number()]).optional(),
});

export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;

export const MESSAGE_TYPE_TO_INT: Record<string, number> = {
  incoming: 0,
  outgoing: 1,
  activity: 2,
  template: 3,
};

export const MESSAGE_TYPE_FROM_INT = ["incoming", "outgoing", "activity", "template"] as const;

export const FILE_TYPES: Record<string, number> = {
  image: 0,
  audio: 1,
  video: 2,
  file: 3,
};

export function guessFileType(mime: string): number {
  if (mime.startsWith("image/")) return 0;
  if (mime.startsWith("audio/")) return 1;
  if (mime.startsWith("video/")) return 2;
  return 3;
}

export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024; // 40MB (máximo do ActiveStorage)
