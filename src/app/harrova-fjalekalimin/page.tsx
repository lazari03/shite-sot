import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotForm } from "@/features/auth/components/password-forms";

export const metadata: Metadata = { title: "Harrova fjalëkalimin", robots: { index: false } };

export default async function ForgotPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("forgotTitle")} subtitle={t("forgotSubtitle")}>
      <ForgotForm />
    </AuthCard>
  );
}
