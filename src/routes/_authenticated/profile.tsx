import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { AppShell, Card, Loading } from "@/components/AppShell";
import { Field, PrimaryButton, Select } from "@/components/Field";
import { fetchProfile, updateProfile } from "@/lib/api";
import { LANGUAGES, isLang, useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Το προφίλ μου — VoiceOrders" },
      { name: "description", content: "Στοιχεία λογαριασμού, ρυθμίσεις και γλώσσα εφαρμογής." },
      { property: "og:title", content: "Το προφίλ μου — VoiceOrders" },
      { property: "og:description", content: "Προφίλ και ρυθμίσεις." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const [f, setF] = useState({ first_name: "", last_name: "", business_name: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setF({ first_name: data.first_name, last_name: data.last_name, business_name: data.business_name, phone: data.phone, email: data.email });
  }, [data]);

  async function save() {
    setBusy(true);
    try {
      const email = f.email.trim();
      if (email && data && email !== data.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
      }
      await updateProfile({ ...f, email, preferred_language: lang });
      await supabase.auth.updateUser({ data: { first_name: f.first_name, last_name: f.last_name, business_name: f.business_name, phone: f.phone } });
      toast.success(t("p.saved"));
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("c.error"));
    } finally { setBusy(false); }
  }

  async function changeLang(v: string) {
    if (!isLang(v)) return;
    setLang(v);
    try { if (data) await updateProfile({ ...f, email: data.email, preferred_language: v }); } catch { /* language still applied locally */ }
  }

  return (
    <AppShell title={t("p.title")} back="/dashboard">
      {isLoading ? <Loading /> : (
        <div className="space-y-4">
          <Card className="space-y-3">
            <Field label={t("p.first")} value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
            <Field label={t("p.last")} value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />
            <Field label={t("p.business")} value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} />
            <Field label={t("p.phone")} type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <Field label={t("p.email")} type="email" value={f.email} hint={t("p.emailHint")} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <PrimaryButton disabled={busy} onClick={save}>{t("p.saveChanges")}</PrimaryButton>
          </Card>
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-semibold">{t("p.settings")}</h2>
            <Select label={t("p.language")} value={lang} onChange={(e) => changeLang(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </Select>
          </Card>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            className="glass press flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-semibold text-destructive"
          >
            <LogOut className="h-5 w-5" /> {t("p.logout")}
          </button>
        </div>
      )}
    </AppShell>
  );
}
