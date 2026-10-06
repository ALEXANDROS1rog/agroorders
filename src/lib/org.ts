import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OrgRole = "owner" | "manager" | "driver";
export type OrgContext = {
  organization_id: string;
  organization_name: string;
  role: OrgRole;
  plan_slug: string | null;
  plan_name: string | null;
  max_users: number;
  active_users: number;
  pending_invites: number;
  subscription_status: string | null;
  features: string[];
  permissions: string[];
};

export const ROLE_LABEL: Record<OrgRole, string> = { owner: "Ιδιοκτήτης", manager: "Υπεύθυνος", driver: "Διανομέας" };

export const FEATURE_LABEL: Record<string, string> = {
  orders: "Διαχείριση παραγγελιών",
  customers: "Πελάτες",
  products: "Προϊόντα",
  routes: "Δρομολόγια",
  deliveries: "Διανομές",
  voice_ai: "Φωνητικές παραγγελίες με AI",
  advanced_routes: "Προχωρημένα δρομολόγια",
  gps_delivery: "Διανομές με GPS",
  auto_arrival: "Αυτόματη επιβεβαίωση άφιξης",
  advanced_finance: "Έσοδα, έξοδα και καθαρά",
  advanced_deliveries: "Προχωρημένες διανομές",
  advanced_permissions: "Προχωρημένα δικαιώματα",
  advanced_analytics: "Προχωρημένα στατιστικά",
  advanced_ai: "Προχωρημένο AI",
  advanced_org: "Προχωρημένη διαχείριση επιχείρησης",
};

export async function fetchOrgContext(): Promise<OrgContext | null> {
  const { data, error } = await supabase.rpc("my_org_context");
  if (error) throw error;
  const row = (data ?? [])[0];
  if (!row) return null;
  return { ...row, features: (row.features as string[] | null) ?? [], permissions: row.permissions ?? [] } as OrgContext;
}

/** Central access check: permissions come from the role, features from the plan. Both are enforced again in the database. */
export function useOrg() {
  const q = useQuery({ queryKey: ["org-context"], queryFn: fetchOrgContext, staleTime: 60_000 });
  const org = q.data ?? null;
  return {
    ...q,
    org,
    can: (perm: string) => !!org?.permissions.includes(perm),
    hasFeature: (feature: string) => !!org?.features.includes(feature),
    canAddMember: () => !!org && org.permissions.includes("members.manage") && org.active_users + org.pending_invites < org.max_users,
  };
}

export type Plan = { id: string; slug: string; name: string; price: number; currency: string; billing_interval: string; max_users: number; features: string[] };
export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase.from("subscription_plans").select("*").eq("active", true).order("sort_order");
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, price: Number(p.price), features: (p.features as string[]) ?? [] }));
}

export type Member = { member_id: string; user_id: string; full_name: string; email: string; role: OrgRole; status: string };
export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase.rpc("org_members_list");
  if (error) throw error;
  return (data ?? []) as Member[];
}

export type Invitation = { id: string; email: string; role: OrgRole; token: string; status: string; expires_at: string };
export async function fetchInvitations(orgId: string): Promise<Invitation[]> {
  const { data, error } = await supabase.from("organization_invitations").select("id, email, role, token, status, expires_at")
    .eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invitation[];
}

export async function createInvitation(orgId: string, email: string, role: OrgRole) {
  const { data, error } = await supabase.from("organization_invitations")
    .insert({ organization_id: orgId, email: email.trim().toLowerCase(), role }).select("token").single();
  if (error) throw error;
  return data.token as string;
}

export async function cancelInvitation(id: string) {
  const { error } = await supabase.from("organization_invitations").update({ status: "cancelled" }).eq("id", id);
  if (error) throw error;
}

export async function changeMemberRole(memberId: string, role: OrgRole) {
  const { error } = await supabase.rpc("change_member_role", { _member: memberId, _role: role });
  if (error) throw error;
}
export async function removeMember(memberId: string) {
  const { error } = await supabase.rpc("remove_member", { _member: memberId });
  if (error) throw error;
}
export async function renameOrganization(orgId: string, name: string) {
  const { error } = await supabase.from("organizations").update({ name }).eq("id", orgId);
  if (error) throw error;
}
export async function acceptInvitation(token: string) {
  const { error } = await supabase.rpc("accept_invitation", { _token: token });
  if (error) throw error;
}
export async function getInvitation(token: string) {
  const { data, error } = await supabase.rpc("get_invitation", { _token: token });
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}
export async function fetchMyInvitations() {
  const { data, error } = await supabase.rpc("my_invitations");
  if (error) throw error;
  return data ?? [];
}

export function inviteLink(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

export const PENDING_INVITE_KEY = "pending-invite";
