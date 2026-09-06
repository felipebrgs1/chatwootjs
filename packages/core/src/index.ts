export { pageMeta, paginate, PaginationQuerySchema } from "./lib/pagination.js";
export type { PageMeta, PaginationQuery } from "./lib/pagination.js";
export {
  ForbiddenError,
  HttpError,
  NotFoundError,
  ServiceUnavailableError,
  toErrorBody,
  UnauthorizedError,
  UnprocessableError,
} from "./lib/errors.js";
export type { ErrorBody, ErrorCode } from "./lib/errors.js";
export { keysToCamel } from "./lib/mapper.js";
export {
  digestOf,
  isExpired,
  jwtSecret,
  opaqueToken,
  signAccessToken,
  verifyAccessToken,
} from "./lib/tokens.js";
export { AccountIdParamSchema, IdParamSchema } from "./schemas/ids.js";
export type { AccountIdParam, IdParam } from "./schemas/ids.js";
export {
  AvailabilityBodySchema,
  AvailabilitySchema,
  ForgotPasswordSchema,
  InvitationAcceptSchema,
  InviteAgentSchema,
  RefreshSchema,
  ResetPasswordSchema,
  RoleSchema,
  SignInSchema,
  SignUpSchema,
  UpdateAccountSchema,
  UpdateAgentSchema,
  UpdateProfileSchema,
} from "./schemas/auth.js";
export type {
  InviteAgentInput,
  SignInInput,
  SignUpInput,
  UpdateProfileInput,
} from "./schemas/auth.js";
export {
  AVAILABILITY_FROM_INT,
  AVAILABILITY_TO_INT,
  acceptInvitation,
  forgotPassword,
  getAccount,
  getProfile,
  inviteAgent,
  listAgents,
  listMyAccounts,
  loadMembership,
  refreshTokens,
  removeAgent,
  resetPassword,
  setAvailability,
  signIn,
  signOut,
  signUp,
  toApiUser,
  toRole,
  updateAccount,
  updateAgentRole,
  updateProfile,
} from "./services/auth.js";
export type { ApiAccount, ApiAgent, AuthUser, TokenPair } from "./services/auth.js";
export { requireAdmin } from "./policies/index.js";
export type { AuthCtx, Role } from "./policies/index.js";
export { InProcessRunner, jobs } from "./jobs/index.js";
export type { Job, JobHandler, JobRunner } from "./jobs/index.js";
export { publish, realtime, subscribe, unsubscribe } from "./realtime/index.js";
export type { RealtimeEvent, RealtimeHandler, RealtimeMessage } from "./realtime/index.js";
