#!/usr/bin/env bun
/**
 * Actual Budget CLI client
 *
 * Usage: bun run client.ts [--env=NAME] <command> [args...]
 *
 * Commands:
 *   budgets                                           list available budgets (no budget required)
 *   accounts [limit] [offset]                         list accounts with balances
 *   account-balance <id> [cutoff]                     get account balance
 *   transactions <accountId> [start] [end] [limit] [offset]  list transactions
 *   budget-months [limit] [offset]                    list budget months
 *   budget-month [month]                              budget vs actual (YYYY-MM, default: current)
 *   categories [limit] [offset]                       list categories
 *   category-groups [limit] [offset]                  list category groups
 *   payees [limit] [offset]                           list payees
 *   net-worth                                         total assets / liabilities / net worth
 *   add-transaction <accountId> <date> <amount> <payee> [categoryId] [notes...]
 */

import { mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as api from "@actual-app/api";

// Redirect console.log to stderr so API internals don't pollute JSON output
const _log = console.log.bind(console);
console.log = console.error.bind(console);

const DEFAULT_LIMIT = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function out(data: unknown): never {
  _log(JSON.stringify(data, null, 2));
  process.exit(0);
}

function die(message: string): never {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function paginate<T>(items: T[], limitArg?: string, offsetArg?: string) {
  const limit = Math.max(1, parseInt(limitArg ?? String(DEFAULT_LIMIT)));
  const offset = Math.max(0, parseInt(offsetArg ?? "0"));
  return { data: items.slice(offset, offset + limit), total: items.length, limit, offset };
}

function toAmount(n: number) {
  return api.utils.integerToAmount(n);
}

// ── Args ──────────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);
const envFlag = rawArgs.find((a) => a.startsWith("--env="));
const ENV = envFlag?.slice("--env=".length) ?? "";
const args = rawArgs.filter((a) => !a.startsWith("--env="));
const [command, ...rest] = args;

if (!command) die("No command provided. Run with --help to see available commands.");

// ── Credentials ───────────────────────────────────────────────────────────────

const credFile = join(
  homedir(),
  ".claude/channels/actual-budget",
  ENV ? `${ENV}.env` : ".env"
);

function loadCredentials(path: string): Record<string, string> {
  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    die(`Credentials not found: ${path}\nRun /actual-budget:configure first.`);
  }
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    vars[m[1]] = v;
  }
  return vars;
}

const creds = loadCredentials(credFile);
const { SERVER_URL, PASSWORD, SYNC_ID, ENCRYPT_PASSWORD } = creds;
const encryptPassword = ENCRYPT_PASSWORD || PASSWORD;

if (!SERVER_URL || !PASSWORD) die("Missing SERVER_URL or PASSWORD in credentials file.");

// ── Init ──────────────────────────────────────────────────────────────────────

const DATA_DIR = join(homedir(), ".cache/actual-budget", ENV || "default");
mkdirSync(DATA_DIR, { recursive: true });

await api.init({ dataDir: DATA_DIR, serverURL: SERVER_URL, password: PASSWORD });

// The `budgets` command lists available budgets without loading one
if (command === "budgets") {
  const budgets = await api.getBudgets();
  await api.shutdown();
  out(paginate(budgets, rest[0], rest[1]));
}

// All other commands require a loaded budget
let syncId = SYNC_ID;
if (!syncId) {
  const list = await api.getBudgets();
  if (!list.length) {
    await api.shutdown();
    die("No budgets found. Set SYNC_ID in your credentials file or create a budget.");
  }
  syncId = (list[0] as any).groupId;
}

await api.downloadBudget(syncId, { password: encryptPassword });

// ── Commands ──────────────────────────────────────────────────────────────────

switch (command) {
  case "accounts": {
    const accounts = (await api.getAccounts()) as any[];
    const withBalances = await Promise.all(
      accounts.map(async (a) => ({
        ...a,
        balance: toAmount(await api.getAccountBalance(a.id)),
      }))
    );
    await api.shutdown();
    out(paginate(withBalances, rest[0], rest[1]));
  }

  case "account-balance": {
    const [id, cutoffStr] = rest;
    if (!id) die("Usage: account-balance <accountId> [cutoff]");
    const cutoff = cutoffStr ? new Date(cutoffStr) : undefined;
    const balance = await api.getAccountBalance(id, cutoff);
    await api.shutdown();
    out({ id, balance: toAmount(balance) });
  }

  case "transactions": {
    const [accountId, startDate = "2000-01-01", endDate = today(), limitArg, offsetArg] = rest;
    if (!accountId) die("Usage: transactions <accountId> [startDate] [endDate] [limit] [offset]");
    const txns = (await api.getTransactions(accountId, startDate, endDate)) as any[];
    const paged = paginate(txns, limitArg, offsetArg);
    await api.shutdown();
    out({
      ...paged,
      data: paged.data.map((t) => ({ ...t, amount: toAmount(t.amount) })),
    });
  }

  case "budget-months": {
    const months = await api.getBudgetMonths();
    await api.shutdown();
    out(paginate(months, rest[0], rest[1]));
  }

  case "budget-month": {
    const month = rest[0] ?? currentMonth();
    const data = await api.getBudgetMonth(month);
    await api.shutdown();
    out(data);
  }

  case "categories": {
    const cats = await api.getCategories();
    await api.shutdown();
    out(paginate(cats, rest[0], rest[1]));
  }

  case "category-groups": {
    const groups = await api.getCategoryGroups();
    await api.shutdown();
    out(paginate(groups, rest[0], rest[1]));
  }

  case "payees": {
    const payees = await api.getPayees();
    await api.shutdown();
    out(paginate(payees, rest[0], rest[1]));
  }

  case "net-worth": {
    const accounts = (await api.getAccounts()) as any[];
    let assets = 0;
    let liabilities = 0;
    for (const a of accounts) {
      const b = await api.getAccountBalance(a.id);
      if (b >= 0) assets += b;
      else liabilities += b;
    }
    await api.shutdown();
    out({
      assets: toAmount(assets),
      liabilities: toAmount(liabilities),
      net_worth: toAmount(assets + liabilities),
    });
  }

  case "add-transaction": {
    const [accountId, date, amountStr, payee, categoryId, ...noteParts] = rest;
    if (!accountId || !date || !amountStr || !payee) {
      die("Usage: add-transaction <accountId> <date> <amount> <payee> [categoryId] [notes...]");
    }
    const amount = api.utils.amountToInteger(parseFloat(amountStr));
    const txn: Record<string, unknown> = { date, amount, payee_name: payee };
    if (categoryId) txn.category = categoryId;
    if (noteParts.length) txn.notes = noteParts.join(" ");
    const ids = (await api.addTransactions(accountId, [txn as any])) as string[];
    await api.shutdown();
    out({
      id: ids?.[0] ?? null,
      account_id: accountId,
      date,
      amount: toAmount(amount),
      payee,
      category_id: categoryId ?? null,
      notes: noteParts.join(" ") || null,
    });
  }

  default:
    await api.shutdown();
    die(
      `Unknown command: ${command}\n` +
        "Available: budgets, accounts, account-balance, transactions, " +
        "budget-months, budget-month, categories, category-groups, payees, " +
        "net-worth, add-transaction"
    );
}
