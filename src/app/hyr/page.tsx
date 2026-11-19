import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUser } from "@/server/authz";
import { googleEnabled } from "@/server/auth";

export const metadata: Metadata = { title: "Hyr", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; verifikuar?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/paneli");
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link className="font-bold text-ink underline" href={`/regjistrohu${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
            {t("register")}
          </Link>
        </>
      }
    >
      <LoginForm next={next} google={googleEnabled()} />
    </AuthCard>
  );
}
