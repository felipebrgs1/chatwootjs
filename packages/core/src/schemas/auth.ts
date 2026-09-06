import { z } from "zod";

export const RoleSchema = z.enum(["agent", "administrator"]);

export const AvailabilitySchema = z.enum(["online", "busy", "offline"]);

export const SignUpSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.email().max(255),
  password: z.string().min(8).max(128),
  account_name: z.string().trim().min(1).max(255).optional(),
});

export const SignInSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(128),
});

export const ForgotPasswordSchema = z.object({
  email: z.email().max(255),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export const InvitationAcceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(255).optional(),
});

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  availability: AvailabilitySchema.optional(),
  ui_settings: z.record(z.string(), z.unknown()).optional(),
});

export const AvailabilityBodySchema = z.object({
  availability: AvailabilitySchema,
});

export const UpdateAccountSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  locale: z.string().trim().min(1).max(10).optional(),
});

export const InviteAgentSchema = z.object({
  email: z.email().max(255),
  name: z.string().trim().min(1).max(255).optional(),
  role: RoleSchema.default("agent"),
});

export const UpdateAgentSchema = z.object({
  role: RoleSchema,
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type InviteAgentInput = z.infer<typeof InviteAgentSchema>;
