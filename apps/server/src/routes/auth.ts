import {
  ForgotPasswordSchema,
  InvitationAcceptSchema,
  RefreshSchema,
  ResetPasswordSchema,
  SignInSchema,
  SignUpSchema,
  acceptInvitation,
  forgotPassword,
  refreshTokens,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { UserEnv } from "../middlewares/auth";
import { authUser } from "../middlewares/auth";
import { fail, ok } from "./v1/_helpers";

const auth = new Hono();

function sessionResponse(
  user: { id: number; name: string; email: string; availability: string },
  tokens: { accessToken: string; refreshToken: string },
  extra?: Record<string, unknown>,
) {
  return {
    data: {
      user,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "Bearer",
      ...extra,
    },
  };
}

auth.post("/sign_up", zValidator("json", SignUpSchema), async (c) => {
  try {
    const input = c.req.valid("json");
    const { user, accountId, tokens } = await signUp(input);
    const res = c.json(sessionResponse(user, tokens, { account_id: accountId }), 201);
    res.headers.set("access-token", tokens.accessToken);
    res.headers.set("uid", user.email);
    return res;
  } catch (err) {
    return fail(c, err);
  }
});

auth.post("/sign_in", zValidator("json", SignInSchema), async (c) => {
  try {
    const input = c.req.valid("json");
    const { user, tokens } = await signIn(input);
    const res = c.json(sessionResponse(user, tokens));
    res.headers.set("access-token", tokens.accessToken);
    res.headers.set("uid", user.email);
    return res;
  } catch (err) {
    return fail(c, err);
  }
});

auth.post("/refresh", zValidator("json", RefreshSchema), async (c) => {
  try {
    const { refresh_token } = c.req.valid("json");
    const tokens = await refreshTokens(refresh_token);
    return c.json({
      data: { access_token: tokens.accessToken, refresh_token: tokens.refreshToken },
    });
  } catch (err) {
    return fail(c, err);
  }
});

auth.post("/sign_out", zValidator("json", RefreshSchema), async (c) => {
  try {
    await signOut(c.req.valid("json").refresh_token);
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

auth.post("/password", zValidator("json", ForgotPasswordSchema), async (c) => {
  try {
    const { email } = c.req.valid("json");
    const result = await forgotPassword(email);
    return ok(c, { ok: true, reset_token: result.resetToken });
  } catch (err) {
    return fail(c, err);
  }
});

auth.post("/password/reset", zValidator("json", ResetPasswordSchema), async (c) => {
  try {
    const { token, password } = c.req.valid("json");
    await resetPassword(token, password);
    return ok(c, { ok: true });
  } catch (err) {
    return fail(c, err);
  }
});

auth.post("/invitation/accept", zValidator("json", InvitationAcceptSchema), async (c) => {
  try {
    const { token, password, name } = c.req.valid("json");
    const { user } = await acceptInvitation(token, password, name);
    return c.json({ data: { user } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

// Compat: widget antigo do Chatwoot valida a sessão por estes headers.
const authed = new Hono<UserEnv>().use(authUser);
authed.get("/validate_token", async (c) => {
  try {
    const { getProfile } = await import("@chatwootjs/core");
    return ok(c, { user: await getProfile(c.var.auth.userId) });
  } catch (err) {
    return fail(c, err);
  }
});
auth.route("/", authed);

export default auth;
