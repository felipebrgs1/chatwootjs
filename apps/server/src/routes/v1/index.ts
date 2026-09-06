import { Hono } from "hono";

import conversations from "./conversations";

const v1 = new Hono();

v1.route("/accounts/:account_id/conversations", conversations);

export default v1;
