import { Hono } from "hono";

import accounts from "./accounts";
import apiChannel from "./api-channel";
import contacts from "./contacts";
import conversations from "./conversations";
import customAttributes from "./custom-attributes";
import inboxItem from "./inbox-item";
import inboxes from "./inboxes";
import labels from "./labels";
import profile from "./profile";

const v1 = new Hono();

v1.route("/profile", profile);
v1.route("/inboxes", inboxItem);
v1.route("/accounts/:account_id/inboxes", inboxes);
v1.route("/accounts/:account_id/conversations", conversations);
v1.route("/accounts/:account_id/api_channel", apiChannel);
v1.route("/accounts/:account_id/contacts", contacts);
v1.route("/accounts/:account_id/labels", labels);
v1.route("/accounts/:account_id/custom_attribute_definitions", customAttributes);
v1.route("/", accounts);

export default v1;
