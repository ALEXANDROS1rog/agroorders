import type { ReactNode } from "react";
import { AppShell, EmptyState, Loading } from "@/components/AppShell";
import { useOrg } from "@/lib/org";

/** UX guard only; database policies remain the authority for every operation. */
export function OrgAccess({ permission, feature, title, children }: { permission: string; feature?: string; title: string; children: ReactNode }) {
  const { can, hasFeature, isLoading, isError } = useOrg();
  if (isLoading) return <AppShell title={title}><Loading /></AppShell>;
  if (isError) return <AppShell title={title}><EmptyState title="Δεν ήταν δυνατή η φόρτωση της επιχείρησης." /></AppShell>;
  if (!can(permission) || (feature && !hasFeature(feature))) return <AppShell title={title}><EmptyState title="Δεν έχετε πρόσβαση σε αυτή τη σελίδα." /></AppShell>;
  return children;
}