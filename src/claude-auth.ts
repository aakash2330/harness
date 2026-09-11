// Anthropic OAuth (Claude Pro/Max), same flow Claude Code uses. Dev-only scaffold.
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { app, shell } from "electron";
import path from "node:path";
import fs from "node:fs";

const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const AUTHORIZE_URL = "https://claude.ai/oauth/authorize";
const TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
const PORT = 53692;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES =
  "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";

export type Credential = { access: string; refresh: string; expires: number };

const file = () => path.join(app.getPath("userData"), "claude-auth.json");
export const load = (): Credential | null =>
  fs.existsSync(file()) ? JSON.parse(fs.readFileSync(file(), "utf8")) : null;
const save = (c: Credential) => fs.writeFileSync(file(), JSON.stringify(c));
export const logout = () => fs.rmSync(file(), { force: true });

async function token(body: Record<string, string>): Promise<Credential> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, ...body }),
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  const c = { access: d.access_token, refresh: d.refresh_token, expires: Date.now() + d.expires_in * 1000 - 5 * 60_000 };
  save(c);
  return c;
}

function waitForCode(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      if (url.pathname !== "/callback") return void res.writeHead(404).end();
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const ok = code && state === expectedState;
      res.writeHead(ok ? 200 : 400, { "Content-Type": "text/html" }).end(ok ? "Logged in. You can close this tab." : "Login failed.");
      server.close();
      ok ? resolve(code) : reject(new Error(url.searchParams.get("error") ?? "bad callback"));
    });
    server.on("error", reject);
    server.listen(PORT, "127.0.0.1");
  });
}

export async function login(): Promise<Credential> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    code: "true",
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: verifier,
  });
  const pending = waitForCode(verifier);
  await shell.openExternal(`${AUTHORIZE_URL}?${params}`);
  const code = await pending;
  return token({ grant_type: "authorization_code", code, state: verifier, redirect_uri: REDIRECT_URI, code_verifier: verifier });
}

/** Valid access token, refreshing if needed. */
export async function accessToken(): Promise<string> {
  let c = load();
  if (!c) throw new Error("not logged in");
  if (Date.now() >= c.expires) c = await token({ grant_type: "refresh_token", refresh_token: c.refresh });
  return c.access;
}
