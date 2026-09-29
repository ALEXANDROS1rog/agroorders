import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card, Loading } from "@/components/AppShell";
import { Field, PrimaryButton } from "@/components/Field";
import { fetchProfile, updateProfile } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Το προφίλ μου — AgroOrders" },
      { name: "description", content: "Αλλαγή στοιχείων παραγωγού και επιχείρησης." },
      { property: "og:title", content: "Το προφίλ μου — AgroOrders" },
      { property: "og:description", content: "Στοιχεία προφίλ." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const [f, setF] = useState({ first_name: "", last_name: "", business_name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (profile.data) setF({ first_name: profile.data.first_name, last_name: profile.data.last_name, business_name: profile.data.business_name, phone: profile.data.phone });
  }, [profile.data]);

  async function save() {
    setBusy(true);
    try {
      await updateProfile(f);
      toast.success("Τα στοιχεία αποθηκεύτηκαν.");
      await qc.invalidateQueries({ queryKey: ["profile"] });
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Το προφίλ μου" back="/dashboard">
      {profile.isLoading ? <Loading /> : (
        <div className="space-y-3">
          <Card className="space-y-3">
            <Field label="Όνομα" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
            <Field label="Επώνυμο" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />
            <Field label="Επιχείρηση" value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} />
            <Field label="Τηλέφωνο" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <Field label="Email" value={profile.data?.email ?? ""} disabled />
          </Card>
          <PrimaryButton disabled={busy} onClick={save}>{busy ? "Αποθήκευση…" : "Αποθήκευση"}</PrimaryButton>
        </div>
      )}
    </AppShell>
  );
}
