import { z } from "zod";

// Espelha teams_controller + team_members do Rails.

export const CreateTeamSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  description: z.string().optional(),
  allow_auto_assign: z.boolean().optional(),
  user_ids: z.array(z.number().int().positive()).optional(),
});

export const UpdateTeamSchema = CreateTeamSchema.partial().omit({ user_ids: true });

export const TeamMembersBodySchema = z.object({
  user_ids: z.array(z.number().int().positive()).min(1),
});
