import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getCurrentUser } from "@/server/authz";
import { googleEnabled } from "@/server/auth";

export const metadata: Metadata = { title: "Regjistrohu", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/paneli");
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link className="font-bold text-ink underline" href="/hyr">
            {t("login")}
          </Link>
        </>
      }
    >
      <RegisterForm next={next} google={googleEnabled()} />
    </AuthCard>
  );
}
