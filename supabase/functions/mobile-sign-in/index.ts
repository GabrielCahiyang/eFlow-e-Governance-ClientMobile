import { createMobileSignIn } from "./handler.ts";

Deno.serve(
  createMobileSignIn({
    url: Deno.env.get("SUPABASE_URL") ?? "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  }),
);
