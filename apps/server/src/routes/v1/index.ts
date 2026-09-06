import { Hono } from "hono";

import accounts from "./accounts";
import conversations from "./conversations";
import profile from "./profile";

const v1 = new Hono();

v1.route("/profile", profile);
v1.route("/", accounts);
v1.route("/accounts/:account_id/conversations", conversations);

export default v1;
