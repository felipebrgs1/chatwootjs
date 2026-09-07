-- Fixture mínima de compatibilidade de dump (trilha D — D3/D4/D5).
--
-- Gerada a partir do DDL do Chatwoot pinado (chatwoot/db/schema.rb, v4.17.1):
-- só colunas que existem no Rails, com listas de coluna explícitas, para que
-- este arquivo importe tanto no nosso banco quanto num banco Rails puro.
-- Senha dos dois usuários: "password123" (bcrypt, custo 10).
-- Uso: psql -1 -f tests/fixtures/chatwoot-mini.sql   (ou via
-- CHATWOOT_DUMP=tests/fixtures/chatwoot-mini.sql bun scripts/db-import-chatwoot.sh)
-- Importa em segundos; os SELECT setval no fim deixam as sequências prontas.

BEGIN;

INSERT INTO accounts (id, name, created_at, updated_at, locale, domain, support_email, feature_flags, auto_resolve_duration, limits, custom_attributes, status, internal_attributes, settings, feature_flags_ext_1)
VALUES (1, 'Acme Import', '2026-02-01 10:00:00', '2026-02-01 10:00:00', 0, NULL, NULL, 0, NULL, '{}', '{}', 0, '{}', '{}', 0);

INSERT INTO users (id, provider, uid, encrypted_password, reset_password_token, reset_password_sent_at, remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at, current_sign_in_ip, last_sign_in_ip, confirmation_token, confirmed_at, confirmation_sent_at, unconfirmed_email, name, display_name, email, tokens, created_at, updated_at, pubsub_token, availability, ui_settings, custom_attributes, type, message_signature, otp_secret, consumed_timestep, otp_required_for_login, otp_backup_codes)
VALUES
  (1, 'email', 'admin@fixture.test', '$2b$10$k9Qm7LdkvZuEtvaa8XvXeuFFSQZhmuRLa8iX6nNtMExeYqpXR4hRW', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ada Fixture', NULL, 'admin@fixture.test', NULL, '2026-02-01 10:00:00', '2026-02-01 10:00:00', NULL, 0, '{}', '{}', NULL, NULL, NULL, NULL, false, NULL),
  (2, 'email', 'agent@fixture.test', '$2b$10$k9Qm7LdkvZuEtvaa8XvXeuFFSQZhmuRLa8iX6nNtMExeYqpXR4hRW', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Alan Fixture', NULL, 'agent@fixture.test', NULL, '2026-02-01 10:00:00', '2026-02-01 10:00:00', NULL, 0, '{}', '{}', NULL, NULL, NULL, NULL, false, NULL);

INSERT INTO account_users (id, account_id, user_id, role, inviter_id, created_at, updated_at, active_at, availability, auto_offline, custom_role_id, agent_capacity_policy_id)
VALUES
  (1, 1, 1, 1, NULL, '2026-02-01 10:00:00', '2026-02-01 10:00:00', NULL, 0, true, NULL, NULL),
  (2, 1, 2, 0, 1, '2026-02-01 10:00:00', '2026-02-01 10:00:00', NULL, 0, true, NULL, NULL);

INSERT INTO channel_api (id, account_id, webhook_url, created_at, updated_at, identifier, hmac_token, hmac_mandatory, additional_attributes, secret)
VALUES (1, 1, NULL, '2026-02-01 10:00:00', '2026-02-01 10:00:00', 'fixture-api-1', NULL, false, '{}', NULL);

INSERT INTO inboxes (id, channel_id, account_id, name, created_at, updated_at, channel_type, enable_auto_assignment, greeting_enabled, greeting_message, email_address, working_hours_enabled, out_of_office_message, timezone, enable_email_collect, csat_survey_enabled, allow_messages_after_resolved, auto_assignment_config, lock_to_single_conversation, portal_id, sender_name_type, business_name, csat_config)
VALUES (1, 1, 1, 'API Fixture', '2026-02-01 10:00:00', '2026-02-01 10:00:00', 'Channel::Api', true, false, NULL, NULL, false, NULL, 'UTC', true, false, true, '{}', false, NULL, 0, NULL, '{}');

INSERT INTO contacts (id, name, email, phone_number, account_id, created_at, updated_at, additional_attributes, identifier, custom_attributes, last_activity_at, contact_type, middle_name, last_name, location, country_code, blocked, company_id)
VALUES
  (1, 'Vitor Visitante', 'visitor@fixture.test', NULL, 1, '2026-02-01 10:00:00', '2026-02-01 10:00:00', '{}', 'visitor-1', '{}', NULL, 0, '', '', '', '', false, NULL),
  (2, 'Bia Visitante', 'bia@fixture.test', '+5511988887777', 1, '2026-02-01 10:00:00', '2026-02-01 10:00:00', '{}', 'visitor-2', '{}', NULL, 0, '', '', '', '', false, NULL);

INSERT INTO contact_inboxes (id, contact_id, inbox_id, source_id, created_at, updated_at, hmac_verified, pubsub_token)
VALUES
  (1, 1, 1, 'visitor-1', '2026-02-01 10:00:00', '2026-02-01 10:00:00', false, NULL),
  (2, 2, 1, 'visitor-2', '2026-02-01 10:00:00', '2026-02-01 10:00:00', false, NULL);

INSERT INTO conversations (id, account_id, inbox_id, status, assignee_id, created_at, updated_at, contact_id, display_id, contact_last_seen_at, agent_last_seen_at, additional_attributes, contact_inbox_id, uuid, last_activity_at, team_id, campaign_id, snoozed_until, custom_attributes, assignee_last_seen_at, first_reply_created_at, priority, sla_policy_id, waiting_since, cached_label_list, assignee_agent_bot_id, ai_assignee_type, status_changed_at)
VALUES
  (1, 1, 1, 0, 2, '2026-02-01 10:00:00', '2026-02-01 10:00:00', 1, 1, NULL, NULL, '{}', 1, '11111111-1111-4111-8111-111111111111', '2026-02-01 10:05:00', NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (2, 1, 1, 2, NULL, '2026-02-01 11:00:00', '2026-02-01 11:00:00', 2, 2, NULL, NULL, '{}', 2, '22222222-2222-4222-8222-222222222222', '2026-02-01 11:05:00', NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO messages (id, content, account_id, inbox_id, conversation_id, message_type, created_at, updated_at, private, status, source_id, content_type, content_attributes, sender_type, sender_id, external_source_ids, additional_attributes, processed_message_content, sentiment)
VALUES
  (1, 'Olá, preciso de ajuda', 1, 1, 1, 0, '2026-02-01 10:01:00', '2026-02-01 10:01:00', false, 0, NULL, 0, '{}', 'Contact', 1, '{}', '{}', NULL, '{}'),
  (2, 'Olá Vitor! Como posso ajudar?', 1, 1, 1, 1, '2026-02-01 10:02:00', '2026-02-01 10:02:00', false, 0, NULL, 0, '{}', 'User', 2, '{}', '{}', NULL, '{}'),
  (3, 'Meu pedido não chegou', 1, 1, 2, 0, '2026-02-01 11:01:00', '2026-02-01 11:01:00', false, 0, NULL, 0, '{}', 'Contact', 2, '{}', '{}', NULL, '{}');

-- Deixa as sequências prontas para inserts futuros (não colidir ID).
SELECT setval('accounts_id_seq', COALESCE((SELECT MAX(id) FROM accounts), 1));
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('account_users_id_seq', COALESCE((SELECT MAX(id) FROM account_users), 1));
SELECT setval('channel_api_id_seq', COALESCE((SELECT MAX(id) FROM channel_api), 1));
SELECT setval('inboxes_id_seq', COALESCE((SELECT MAX(id) FROM inboxes), 1));
SELECT setval('contacts_id_seq', COALESCE((SELECT MAX(id) FROM contacts), 1));
SELECT setval('contact_inboxes_id_seq', COALESCE((SELECT MAX(id) FROM contact_inboxes), 1));
SELECT setval('conversations_id_seq', COALESCE((SELECT MAX(id) FROM conversations), 1));
SELECT setval('messages_id_seq', COALESCE((SELECT MAX(id) FROM messages), 1));

COMMIT;
