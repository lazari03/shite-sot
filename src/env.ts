import { z } from "zod";

/**
 * The only place that reads process.env. The app refuses to boot on invalid config.
 * Optional integrations (Google, Resend, S3) degrade gracefully when unset.
 */
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 chars"),
    BETTER_AUTH_URL: z.string().url(),
    SITE_URL: z.string().url(),
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    EMAIL_FROM: z.string().default("ShitShpejt <njoftime@shitshpejt.al>"),
    RESEND_API_KEY: optional,
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    LOCAL_STORAGE_DIR: z.string().default("./.storage"),
    S3_ENDPOINT: optional,
    S3_REGION: z.string().default("fsn1"),
    S3_BUCKET: optional,
    S3_ACCESS_KEY_ID: optional,
    S3_SECRET_ACCESS_KEY: optional,
    S3_PUBLIC_URL: optional,
    ANALYTICS_SALT: z.string().default("dev-analytics-salt"),
    // "first_n": sellers need review until MODERATION_TRUST_AFTER listings were approved.
    MODERATION_MODE: z.enum(["all", "first_n", "none"]).default("first_n"),
    MODERATION_TRUST_AFTER: z.coerce.number().int().min(0).default(3),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    // false = sign up and log in immediately (no email needed). Turn on once Resend is configured.
    REQUIRE_EMAIL_VERIFICATION: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
  })
  .superRefine((v, ctx) => {
    if (v.STORAGE_DRIVER === "s3") {
      for (const k of ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_URL"] as const) {
        if (!v[k]) ctx.addIssue({ code: "custom", path: [k], message: `${k} is required when STORAGE_DRIVER=s3` });
      }
    }
    if (v.EMAIL_PROVIDER === "resend" && !v.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend" });
    }
    if (v.APP_ENV === "production" && v.BETTER_AUTH_SECRET.startsWith("dev-")) {
      ctx.addIssue({ code: "custom", path: ["BETTER_AUTH_SECRET"], message: "Use a real secret in production" });
    }
  });

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

let cached: Env | undefined;
/** Lazily validated so `next build` can run without runtime secrets. */
export function env(): Env {
  cached ??= load();
  return cached;
}

/** Canonical public base URL, read at runtime (never inlined at build time). */
export function siteUrl(): string {
  return env().SITE_URL.replace(/\/$/, "");
}
