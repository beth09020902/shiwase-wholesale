import { getStore } from "@netlify/blobs";
import { STORE_NAME } from "./config.mjs";

// Orders live in the SHOP site's blob store so the admin app can read them.
// BLOB_SITE_ID = the shop site's Site ID, NETLIFY_AUTH_TOKEN = a personal access token.
export function ordersStore() {
  const siteID = process.env.BLOB_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID, token, consistency: "strong" });
  }
  return getStore({ name: STORE_NAME, consistency: "strong" });
}
