import { Hono } from "hono";

import accounts from "./accounts";
import apiChannel from "./api-channel";
import automation from "./automation";
import campaigns from "./campaigns";
import cannedResponses from "./canned-responses";
import companies from "./companies";
import contacts from "./contacts";
import conversations from "./conversations";
import customAttributes from "./custom-attributes";
import inboxItem from "./inbox-item";
import inboxes from "./inboxes";
import labels from "./labels";
import macros from "./macros";
import portals from "./portals";
import profile from "./profile";
import reports from "./reports";
import teams from "./teams";
import webhooks from "./webhooks";

const v1 = new Hono();

v1.route("/profile", profile);
v1.route("/inboxes", inboxItem);
v1.route("/accounts/:account_id/inboxes", inboxes);
v1.route("/accounts/:account_id/conversations", conversations);
v1.route("/accounts/:account_id/api_channel", apiChannel);
v1.route("/accounts/:account_id/contacts", contacts);
v1.route("/accounts/:account_id/companies", companies);
v1.route("/accounts/:account_id/labels", labels);
v1.route("/accounts/:account_id/teams", teams);
v1.route("/accounts/:account_id/canned_responses", cannedResponses);
v1.route("/accounts/:account_id/macros", macros);
v1.route("/accounts/:account_id/automation_rules", automation);
v1.route("/accounts/:account_id/campaigns", campaigns);
v1.route("/accounts/:account_id/reports", reports);
v1.route("/accounts/:account_id/portals", portals);
v1.route("/accounts/:account_id/webhooks", webhooks);
v1.route("/accounts/:account_id/custom_attribute_definitions", customAttributes);
v1.route("/", accounts);

export default v1;
