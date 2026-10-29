#!/usr/bin/env node
/**
 * One-time production finish-up, run by the owner (double-click "Finish Dishwise setup.command"):
 *   1. Adds the production domains to Neon Auth's trusted domains (Neon API, key typed by you, never stored).
 *   2. Runs the real signed-in E2E test on production with credentials you type (never stored).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const DOMAINS = ["https://dishwise.bhanusadhu.com", "https://dishwise-alpha.vercel.app"];
const SITE = "https://dishwise.bhanusadhu.com";
const API = "https://console.neon.tech/api/v2";

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const open = (url) => spawnSync(process.platform === "darwin" ? "open" : "xdg-open", [url], { stdio: "ignore" });

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) process.stdout.write(s);
        else if (!s.includes("\n")) process.stdout.write("•");
        else process.stdout.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

function envValue(name) {
  if (process.env[name]) return process.env[name];
  if (!existsSync(".env.local")) return undefined;
  const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).replace(/^"|"$/g, "").trim() || undefined;
}

async function neon(path, key, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json", ...init.headers },
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {}
  return { ok: res.ok, status: res.status, body, text };
}

async function trustDomains() {
  console.log(bold("\nStep 1 of 2 · Let production sign in through Neon Auth\n"));
  const projectId = envValue("NEON_PROJECT_ID");
  if (!projectId) {
    console.log(red("NEON_PROJECT_ID isn't in .env.local. Run `npx vercel env pull .env.local` first."));
    return false;
  }
  let key = process.env.NEON_API_KEY;
  if (!key) {
    console.log("This needs a Neon API key from the Neon org that Vercel created for Dishwise.");
    console.log(dim("  Don't sign in to Neon with GitHub/Google: that's a separate personal Neon account that can't see this database."));
    console.log(dim("  Instead: Vercel → dishwise → Storage → dishwise-db → \"Open in Neon\" (I'll open Vercel for you),"));
    console.log(dim("  then in Neon: Settings → API keys → Create new API key, and copy it.\n"));
    await ask("Press Enter to open Vercel Storage… ");
    open("https://vercel.com/bhanu-sadhu-s-projects/dishwise/stores");
    key = await ask("Paste the API key here (hidden) and press Enter: ", { hidden: true });
  }
  if (!key) {
    console.log(red("No key entered, skipping."));
    return false;
  }

  const branches = await neon(`/projects/${projectId}/branches`, key);
  if (!branches.ok) {
    console.log(red(`Neon said ${branches.status}: ${branches.body?.message ?? branches.text.slice(0, 200)}`));
    if (branches.status === 401) console.log("That key wasn't accepted. Create a new one and try again.");
    if (branches.status === 404 || branches.status === 403)
      console.log("That key can't see the Dishwise database. It probably came from a personal Neon login (GitHub/Google). Sign out of Neon, open it from Vercel → Storage → dishwise-db → \"Open in Neon\", and create the key there.");
    return false;
  }
  const branch = branches.body.branches.find((b) => b.default) ?? branches.body.branches[0];
  const path = `/projects/${projectId}/branches/${branch.id}/auth/domains`;
  const existing = await neon(path, key);
  const have = new Set((existing.body?.domains ?? []).map((d) => d.domain));
  for (const domain of DOMAINS) {
    if (have.has(domain)) {
      console.log(`${green("✓")} ${domain} ${dim("(already trusted)")}`);
      continue;
    }
    const r = await neon(path, key, { method: "POST", body: JSON.stringify({ domain, auth_provider: "better_auth" }) });
    if (r.ok) console.log(`${green("✓")} ${domain} added`);
    else {
      console.log(red(`✗ ${domain}: ${r.status} ${r.body?.message ?? r.text.slice(0, 200)}`));
      return false;
    }
  }
  const after = await neon(path, key);
  console.log(dim(`Trusted domains now: ${(after.body?.domains ?? []).map((d) => d.domain).join(", ") || "(none reported)"}`));
  return true;
}

async function accountTest() {
  console.log(bold("\nStep 2 of 2 · Real account test on production\n"));
  console.log("This signs in on the live site in a test browser, saves a taste in one session, and checks it loads in a fresh one.");
  const hasAccount = (await ask("Do you already have a Dishwise account to test with? (y/N) ")).toLowerCase().startsWith("y");
  if (!hasAccount) {
    console.log(`Opening ${SITE}/account. Choose "Create account", sign up, then come back here.`);
    open(`${SITE}/account`);
    await ask("Press Enter once the account exists… ");
  }
  const email = await ask("Test account email: ");
  const password = await ask("Test account password (hidden): ", { hidden: true });
  if (!email || !password) {
    console.log(red("Email and password are both needed, skipping."));
    return false;
  }
  console.log(dim("\nRunning the test (about 30 seconds)…\n"));
  const code = await new Promise((resolve) => {
    const p = spawn("npx", ["playwright", "test", "tests/e2e/security.spec.ts", "--project", "desktop", "--reporter", "list"], {
      stdio: "inherit",
      env: { ...process.env, BASE_URL: SITE, E2E_EMAIL: email, E2E_PASSWORD: password },
    });
    p.on("close", resolve);
  });
  if (code === 0) console.log(green("\n✓ Accounts work end to end on production."));
  else console.log(red("\n✗ The account test failed. Copy the output above and send it to Claude."));
  return code === 0;
}

const domainsOk = await trustDomains();
const accountOk = await accountTest();
console.log(bold("\nSummary"));
console.log(`  Neon trusted domains: ${domainsOk ? green("done") : red("not done")}`);
console.log(`  Real account test:    ${accountOk ? green("passed") : red("not passed")}`);
console.log(dim("\nNothing you typed was saved anywhere."));
