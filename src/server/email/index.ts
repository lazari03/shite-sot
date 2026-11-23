import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { env } from "@/env";
import { log } from "../logger";

export type EmailMessage = { to: string; subject: string; text: string; html?: string };

export interface EmailProvider {
  send(msg: EmailMessage): Promise<void>;
}

/** Dev/test: logs the email and appends it to .storage/outbox.jsonl (E2E reads links from there). */
class ConsoleEmailProvider implements EmailProvider {
  async send(msg: EmailMessage) {
    // In production without Resend, emails (e.g. password-reset links) only appear in the server logs.
    const dir = path.resolve(env().LOCAL_STORAGE_DIR);
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "outbox.jsonl"), JSON.stringify({ ...msg, at: new Date().toISOString() }) + "\n");
    log.info("email (console)", { subject: msg.subject });
    if (env().APP_ENV !== "test") console.log(`\n--- EMAIL to ${msg.to} ---\n${msg.subject}\n${msg.text}\n---\n`);
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(msg: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env().RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env().EMAIL_FROM, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html }),
    });
    if (!res.ok) {
      log.error("resend failed", { status: res.status });
      throw new Error(`Email provider error ${res.status}`);
    }
  }
}

let provider: EmailProvider | undefined;
export function email(): EmailProvider {
  provider ??= env().EMAIL_PROVIDER === "resend" ? new ResendEmailProvider() : new ConsoleEmailProvider();
  return provider;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function linkEmail(opts: { to: string; subject: string; intro: string; cta: string; url: string; outro?: string }): EmailMessage {
  const text = `${opts.intro}\n\n${opts.cta}: ${opts.url}\n\n${opts.outro ?? ""}\n\nShitShpejt`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#14231b">
<p style="font-weight:800;font-size:22px">shit<span style="color:#5f8a00">shpejt</span></p>
<p>${esc(opts.intro)}</p>
<p><a href="${esc(opts.url)}" style="display:inline-block;background:#c6f24e;color:#14231b;padding:12px 18px;border-radius:7px;font-weight:700;text-decoration:none">${esc(opts.cta)}</a></p>
<p style="color:#646e63;font-size:13px">${esc(opts.outro ?? "")}</p></div>`;
  return { to: opts.to, subject: opts.subject, text, html };
}
