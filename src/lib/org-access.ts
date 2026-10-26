export function canReserveMember(permissions: readonly string[], active: number, pending: number, maximum: number): boolean {
  return permissions.includes("members.manage") && active + pending < maximum;
}