import { test, expect } from "bun:test";
import { canReserveMember } from "./org-access";

test("BASIC allows two active members, never a third", () => {
  expect(canReserveMember(["members.manage"], 1, 0, 2)).toBe(true);
  expect(canReserveMember(["members.manage"], 2, 0, 2)).toBe(false);
});
test("PRO allows five members", () => {
  expect(canReserveMember(["members.manage"], 4, 0, 5)).toBe(true);
  expect(canReserveMember(["members.manage"], 5, 0, 5)).toBe(false);
});
test("BUSINESS allows ten members", () => {
  expect(canReserveMember(["members.manage"], 9, 0, 10)).toBe(true);
  expect(canReserveMember(["members.manage"], 10, 0, 10)).toBe(false);
});
test("pending invitations reserve seats", () => {
  expect(canReserveMember(["members.manage"], 1, 1, 2)).toBe(false);
});
test("members without management permission cannot invite", () => {
  expect(canReserveMember(["orders.create"], 1, 0, 10)).toBe(false);
});