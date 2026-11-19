"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";
import { updateProfileAction, deleteAccountAction, type ProfileState, type DeleteState } from "../actions";
import { authClient } from "@/features/auth/client";
import { setLocaleAction } from "@/i18n/actions";

type Profile = { name: string; city: string; bio: string; whatsapp: string; contactConsent: boolean; image: string | null; email: string };

export function ProfileForm({ profile, cities }: { profile: Profile; cities: string[] }) {
  const t = useTranslations("account");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, null);
  const [v, setV] = useState(profile);
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const bind = (k: "name" | "city" | "bio" | "whatsapp") => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV((p) => ({ ...p, [k]: e.target.value })) });

  return (
    <form action={action} className="grid gap-4">
      <div className="field">
        <label htmlFor="name">{t("displayName")}</label>
        <input id="name" name="name" required minLength={2} maxLength={40} className="input" {...bind("name")} aria-invalid={Boolean(fe.name)} />
        {fe.name && <p className="error">{te(fe.name)}</p>}
      </div>
      <div className="field">
        <label htmlFor="city">{t("city")}</label>
        <select id="city" name="city" className="input" {...bind("city")}>
          <option value="">—</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="bio">{t("bio")}</label>
        <textarea id="bio" name="bio" maxLength={300} className="input min-h-[90px]" {...bind("bio")} />
      </div>
      <fieldset className="rounded-[var(--radius-md)] border border-line p-4">
        <legend className="label px-1">{t("contactTitle")}</legend>
        <p className="hint mb-3">{t("contactHint")}</p>
        <div className="field">
          <label htmlFor="whatsapp">{t("whatsapp")}</label>
          <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="069 123 4567" className="input" {...bind("whatsapp")} aria-invalid={Boolean(fe.whatsapp)} />
          {fe.whatsapp && <p className="error">{te(fe.whatsapp)}</p>}
        </div>
        <label className="check mt-3">
          <input type="checkbox" name="contactConsent" checked={v.contactConsent} onChange={(e) => setV((p) => ({ ...p, contactConsent: e.target.checked }))} />
          <span>{t("contactConsent")}</span>
        </label>
      </fieldset>
      <div aria-live="polite">
        {state?.ok && <p className="font-semibold text-sage-ink">{t("saved")}</p>}
        {state && !state.ok && !state.fieldErrors && <p className="error">{te(state.messageKey)}</p>}
      </div>
      <button className="btn btn-ink btn-lg" disabled={pending}>
        {t("save")}
      </button>
    </form>
  );
}

export function AvatarForm({ image, name }: { image: string | null; name: string }) {
  const t = useTranslations("account");
  const te = useTranslations("errors");
  const router = useRouter();
  const [src, setSrc] = useState(image);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/account/avatar", { method: "POST", body: fd });
    const json = (await res.json()) as { ok: boolean; url?: string; messageKey?: string };
    setBusy(false);
    if (json.ok && json.url) {
      setSrc(json.url);
      router.refresh();
    } else setError(te(json.messageKey ?? "upload_failed"));
  }
  return (
    <div className="flex items-center gap-4">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar
        <img src={src} alt="" className="size-16 rounded-full object-cover" />
      ) : (
        <span className="grid size-16 place-items-center rounded-full bg-ink font-display text-2xl font-bold text-lime">{name.slice(0, 1).toUpperCase()}</span>
      )}
      <label className="btn btn-line relative cursor-pointer">
        <Camera className="size-4" aria-hidden />
        {busy ? t("uploading") : t("changePhoto")}
        <input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={onChange} disabled={busy} aria-label={t("changePhoto")} />
      </label>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function LanguageSwitch({ locale }: { locale: string }) {
  const t = useTranslations("account");
  const router = useRouter();
  return (
    <div className="flex gap-2" role="group" aria-label={t("language")}>
      {(["sq", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          className="chip"
          aria-pressed={locale === l}
          onClick={async () => {
            await setLocaleAction(l);
            router.refresh();
          }}
        >
          {l === "sq" ? "Shqip" : "English"}
        </button>
      ))}
    </div>
  );
}

export function SignOutButton() {
  const t = useTranslations("account");
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-line"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {t("signOut")}
    </button>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const t = useTranslations("account");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccountAction, null);
  const [confirm, setConfirm] = useState("");
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="grid gap-3">
      <p className="text-sm text-muted">{t("deleteBody")}</p>
      <div className="field">
        <label htmlFor="confirm">{t("deleteConfirm", { email })}</label>
        <input id="confirm" name="confirm" autoComplete="off" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {fe?.confirm && <p className="error">{te(fe.confirm)}</p>}
      </div>
      <button className="btn btn-danger" disabled={pending || confirm.trim().toLowerCase() !== email.toLowerCase()}>
        {t("deleteButton")}
      </button>
    </form>
  );
}
