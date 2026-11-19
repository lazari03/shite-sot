import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetForm } from "@/features/auth/components/password-forms";

export const metadata: Metadata = { title: "Rivendos fjalëkalimin", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("resetTitle")}>
      <ResetForm token={token ?? null} invalid={Boolean(error)} />
    </AuthCard>
  );
}
