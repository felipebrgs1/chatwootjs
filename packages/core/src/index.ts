export { pageMeta, paginate, PaginationQuerySchema } from "./lib/pagination.js";
export type { PageMeta, PaginationQuery } from "./lib/pagination.js";
export {
  ForbiddenError,
  HttpError,
  NotFoundError,
  NotImplementedError,
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
  signSuperAccessToken,
  verifyAccessToken,
  verifySuperAccessToken,
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
export { clearPresence, dropPresence, listPresence, touchPresence } from "./realtime/presence.js";
export type { PresenceEntry, PresenceStatus } from "./realtime/presence.js";
export {
  ChannelSchema,
  CreateInboxSchema,
  InboxMembersBodySchema,
  UpdateInboxSchema,
  WorkingHoursBodySchema,
  WorkingHourSchema,
  ApiChannelSchema,
  EmailChannelSchema,
  FacebookChannelSchema,
  InstagramChannelSchema,
  LineChannelSchema,
  SmsChannelSchema,
  TelegramChannelSchema,
  TwitterChannelSchema,
  WebWidgetChannelSchema,
  WhatsappChannelSchema,
} from "./schemas/inboxes.js";
export type {
  CreateInboxInput,
  InboxMembersBody,
  UpdateInboxInput,
  WorkingHoursBody,
} from "./schemas/inboxes.js";
export {
  ATTRIBUTE_TYPES,
  ContactsQuerySchema,
  ContactInboxBodySchema,
  CreateContactSchema,
  CreateCustomAttributeSchema,
  CreateLabelSchema,
  CreateNoteSchema,
  MergeContactSchema,
  UpdateContactSchema,
  UpdateCustomAttributeSchema,
  UpdateLabelSchema,
} from "./schemas/contacts.js";
export type {
  AttributeType,
  ContactsQuery,
  CreateContactInput,
  CreateCustomAttributeInput,
  UpdateContactInput,
} from "./schemas/contacts.js";
export {
  CompaniesQuerySchema,
  CompanyContactBodySchema,
  CreateCompanySchema,
  UpdateCompanySchema,
} from "./schemas/companies.js";
export type {
  CompaniesQuery,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "./schemas/companies.js";
export {
  addCompanyContact,
  createCompany,
  deleteCompany,
  getCompany,
  listCompanies,
  listCompanyContacts,
  listCompanyConversations,
  listCompanyNotes,
  removeCompanyContact,
  updateCompany,
} from "./services/companies.js";
export type { ApiCompany, CompanyContactItem, CompanyNoteItem } from "./services/companies.js";
export {
  addInboxMembers,
  assertInboxAccess,
  createInbox,
  deleteInbox,
  getInbox,
  getInboxByIdForUser,
  getWorkingHours,
  isOutsideWorkingHours,
  listAssignableAgents,
  listInboxMembers,
  listInboxes,
  removeInboxMember,
  setInboxMembers,
  updateInbox,
  updateWorkingHours,
} from "./services/inboxes.js";
export type { ApiInbox, ApiInboxAgent, ApiWorkingHour } from "./services/inboxes.js";
export {
  ATTRIBUTE_TYPES as CONTACT_ATTRIBUTE_TYPES,
  createContact,
  createContactInbox,
  createCustomAttribute,
  createLabel,
  createNote,
  deleteContact,
  deleteCustomAttribute,
  deleteLabel,
  deleteNote,
  getContact,
  getImport,
  listContactAttachments,
  listContactConversations,
  listContactLabels,
  listContacts,
  listCustomAttributes,
  listLabels,
  listNotes,
  mergeContacts,
  registerContactImportJob,
  setContactLabels,
  startContactImport,
  updateContact,
  updateCustomAttribute,
  updateLabel,
  validateCustomAttributes,
} from "./services/contacts.js";
export type {
  ApiContact,
  ApiCustomAttribute,
  ApiLabel,
  ApiNote,
  ContactAttachmentItem,
  ContactHistoryItem,
} from "./services/contacts.js";
export {
  CONVERSATION_PRIORITIES,
  CONVERSATION_STATUSES,
  ConversationLabelsBodySchema,
  ConversationMetaQuerySchema,
  ConversationQuerySchema,
  PRIORITY_FROM_INT as PRIORITY_LABELS,
  PRIORITY_TO_INT,
  PriorityBodySchema,
  AssigneeBodySchema,
  SnoozeBodySchema,
  STATUS_FROM_INT as STATUS_LABELS,
  STATUS_TO_INT,
  TeamBodySchema,
  ToggleStatusSchema,
} from "./schemas/conversations.js";
export type { ConversationQuery } from "./schemas/conversations.js";
export {
  CreateMessageSchema,
  FILE_TYPES,
  MAX_UPLOAD_BYTES,
  MESSAGE_TYPE_FROM_INT,
  MESSAGE_TYPE_TO_INT,
  MessagesQuerySchema,
  guessFileType,
} from "./schemas/messages.js";
export type { CreateMessageInput } from "./schemas/messages.js";
export {
  assignConversation,
  assertConversationAccess,
  createActivityMessage,
  createConversation,
  findConversation,
  getConversation,
  listConversations,
  markConversationRead,
  muteConversation,
  registerSnoozeJob,
  setConversationLabels,
  setConversationPriority,
  setConversationTeam,
  toApiConversationDetail,
  toApiConversationItem,
  toggleConversationStatus,
  visibleInboxIds,
} from "./services/conversations.js";
export type {
  ApiConversationDetail,
  ApiConversationItem,
  ApiMessagePreview,
} from "./services/conversations.js";
export {
  addParticipants,
  createIncomingMessage,
  deleteMessage,
  lastMessage,
  listMessages,
  listParticipants,
  removeParticipant,
  sendAgentMessage,
  toApiMessage,
  uploadMessageAttachment,
} from "./services/messages.js";
export type { ApiAttachment, ApiMessage } from "./services/messages.js";
export {
  LocalStorageProvider,
  S3StorageProvider,
  setStorageProvider,
  storage,
} from "./lib/storage.js";
export type { StorageProvider, StoredBytes, StoredObject } from "./lib/storage.js";
export {
  createApiChannelConversation,
  createWidgetConversation,
  findWidgetContact,
  findWidgetInbox,
  getWidgetConfig,
  listWidgetConversations,
  listWidgetMessages,
  markWidgetConversationRead,
  sendWidgetMessage,
  submitWidgetCsat,
  updateWidgetContact,
  upsertWidgetContact,
} from "./services/widget.js";
export type { ApiChannelMessageInput, WidgetContactInput, WidgetInbox } from "./services/widget.js";
export {
  CannedQuerySchema,
  CreateCannedSchema,
  UpdateCannedSchema,
} from "./schemas/canned-responses.js";
export {
  CreateMacroSchema,
  ExecuteMacroSchema,
  MACRO_ACTION_NAMES,
  UpdateMacroSchema,
} from "./schemas/macros.js";
export {
  ActionItemSchema,
  AUTOMATION_ACTION_NAMES,
  AUTOMATION_CONDITION_KEYS,
  AUTOMATION_EVENTS,
  AUTOMATION_FILTER_OPERATORS,
  ConditionItemSchema,
  CreateAutomationRuleSchema,
  UpdateAutomationRuleSchema,
} from "./schemas/automation.js";
export type { ActionItem, ConditionItem } from "./schemas/automation.js";
export { CreateTeamSchema, TeamMembersBodySchema, UpdateTeamSchema } from "./schemas/teams.js";
export { CreateWebhookSchema, UpdateWebhookSchema, WEBHOOK_EVENTS } from "./schemas/webhooks.js";
export {
  addTeamMembers,
  createTeam,
  deleteTeam,
  findTeam,
  getTeam,
  listMyTeams,
  listTeams,
  pickAutoAssignee,
  removeTeamMember,
  toApiTeam,
  updateTeam,
} from "./services/teams.js";
export type { ApiTeam, ApiTeamMember } from "./services/teams.js";
export {
  createCannedResponse,
  deleteCannedResponse,
  findCannedResponse,
  listCannedResponses,
  updateCannedResponse,
} from "./services/canned-responses.js";
export type { ApiCannedResponse } from "./services/canned-responses.js";
export { applyActionItems, validateActionItems } from "./services/conversation-actions.js";
export {
  createMacro,
  deleteMacro,
  executeMacro,
  findMacro,
  listMacros,
  registerMacroJob,
  updateMacro,
} from "./services/macros.js";
export type { ApiMacro } from "./services/macros.js";
export {
  createAutomationRule,
  cloneAutomationRule,
  deleteAutomationRule,
  executeRuleOn,
  findAutomationRule,
  listAutomationRules,
  matchesConditions,
  processDueExecutions,
  registerAutomationSweep,
  runRulesFor,
  updateAutomationRule,
  validateRule,
} from "./services/automation.js";
export type { ApiAutomationRule, RuleCondition, RuleContext } from "./services/automation.js";
export {
  createWebhook,
  deleteWebhook,
  deliverWebhookUrl,
  findWebhook,
  fireWebhooks,
  listWebhooks,
  registerWebhookJob,
  testWebhook,
  updateWebhook,
  webhookPayload,
} from "./services/webhooks.js";
export type { ApiWebhook } from "./services/webhooks.js";
export {
  CHANNEL_TYPE_TO_EXTERNAL,
  dispatchChannelSend,
  findInboxByChannel,
  ingestInbound,
  loadChannelContext,
  parseBandwidthSms,
  parseEvolutionWebhook,
  parseFacebookWebhook,
  parseInboundEmail,
  parseInstagramWebhook,
  parseLineWebhook,
  parseTelegramUpdate,
  parseTwilioSms,
  parseTwilioWhatsapp,
  parseTwitterWebhook,
  parseVoiceWebhook,
  parseWhatsappWebhook,
  PROVIDERS,
  providerFor,
  registerChannelSendJob,
  registerEmailPollerJob,
} from "./channels/index.js";
export type {
  BandwidthSmsWebhook,
  ChannelProvider,
  EvolutionWebhook,
  ExternalChannel,
  IngestResult,
  InboundEmail,
  LineWebhook,
  MetaWebhook,
  NormalizedAttachment,
  NormalizedInbound,
  OutboundContext,
  OutboundMessage,
  SendResult,
  TelegramUpdate,
  TwilioSmsPayload,
  TwitterWebhook,
  VoiceWebhook,
  WhatsappWebhook,
} from "./channels/index.js";
export { activeJobRunner, initJobs } from "./jobs/index.js";
export { registerAutomationListeners } from "./jobs/automation.js";
export {
  CampaignsQuerySchema,
  CreateCampaignSchema,
  UpdateCampaignSchema,
} from "./schemas/campaigns.js";
export { ReportsQuerySchema, SubmitCsatSchema } from "./schemas/reports.js";
export type { ReportsQuery } from "./schemas/reports.js";
export {
  CreateArticleSchema,
  CreateCategorySchema,
  CreatePortalSchema,
  UpdateArticleSchema,
  UpdateCategorySchema,
  UpdatePortalSchema,
} from "./schemas/portals.js";
export {
  audiencePreview,
  createCampaign,
  deleteCampaign,
  findCampaign,
  listActiveOngoingCampaigns,
  listCampaigns,
  registerCampaignJob,
  triggerCampaign,
  updateCampaign,
} from "./services/campaigns.js";
export type { ApiCampaign, AudiencePreview } from "./services/campaigns.js";
export {
  getAgentsReport,
  getCsatReport,
  getInboxesReport,
  getLabelsReport,
  getOverview,
  getSummary,
  getTeamsReport,
  registerReportingEmitters,
  registerReportingRollup,
  runRollupOnce,
  submitCsat,
} from "./services/reporting.js";
export type { BreakdownRow, CsatReport, OverviewPoint, Summary } from "./services/reporting.js";
export {
  createArticle,
  createCategory,
  createPortal,
  deleteArticle,
  deleteCategory,
  deletePortal,
  getPublicArticle,
  getPublicPortal,
  listArticles,
  listCategories,
  listPortals,
  sanitizeArticleHtml,
  setArticleStatus,
  updateArticle,
  updateCategory,
  updatePortal,
} from "./services/portals.js";
export type { ApiArticle, ApiCategory, ApiPortal, PublicPortal } from "./services/portals.js";
export {
  NOTIFICATION_TYPES,
  NotificationSettingsSchema,
  NotificationsQuerySchema,
  PresenceHeartbeatSchema,
  NotificationSnoozeBodySchema,
  CreateCustomFilterSchema,
  UpdateCustomFilterSchema,
} from "./schemas/notifications.js";
export type {
  CreateCustomFilterInput,
  NotificationSettingsInput,
  NotificationTypeName,
  NotificationsQuery,
  UpdateCustomFilterInput,
} from "./schemas/notifications.js";
export {
  NOTIFICATION_TYPE_TO_INT,
  createCustomFilter,
  deleteCustomFilter,
  ensureNotificationSettings,
  extractMentionTokens,
  getNotificationSettings,
  listCustomFilters,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  notify,
  processMentions,
  registerNotificationEmitters,
  snoozeNotification,
  updateCustomFilter,
  updateNotificationSettings,
} from "./services/notifications.js";
export type {
  ApiCustomFilter,
  ApiNotification,
  ApiNotificationSettings,
} from "./services/notifications.js";
export { unifiedSearch } from "./services/search.js";
export type { SearchHit, SearchResults } from "./services/search.js";
export {
  AgentBotWebhookSchema,
  AuditLogsQuerySchema,
  CaptainAssistSchema,
  CreateAgentBotSchema,
  InstallationConfigSchema,
  SetInboxBotSchema,
  SuperAdminSignInSchema,
  UpdateAgentBotSchema,
} from "./schemas/ops.js";
export type {
  AgentBotWebhookInput,
  CaptainAssistInput,
  CreateAgentBotInput,
  SuperAdminSignInInput,
  UpdateAgentBotInput,
} from "./schemas/ops.js";
export { logAudit, listAuditLogs } from "./services/audit.js";
export type { AuditAction } from "./services/audit.js";
export {
  createAgentBot,
  deleteAgentBot,
  getInboxAgentBot,
  listAgentBots,
  receiveAgentBotWebhook,
  registerAgentBotForwarder,
  setInboxAgentBot,
  updateAgentBot,
} from "./services/agent-bots.js";
export type { ApiAgentBot } from "./services/agent-bots.js";
export { captainAssist, captainEnabledFor } from "./services/captain.js";
export {
  deleteAccountCascade,
  deleteUserEverywhere,
  listAllAccounts,
  listAllUsers,
  listInstallationConfigs,
  listPlatformApps,
  listPlatformBanners,
  requireSuperAdmin,
  superAdminSignIn,
  upsertInstallationConfig,
} from "./services/super-admin.js";
export { getDataImport, listDataImports } from "./services/data-imports.js";
export type { ApiDataImport } from "./services/data-imports.js";
