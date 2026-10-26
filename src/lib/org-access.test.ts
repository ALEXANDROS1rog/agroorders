import { test } from "node:test";
import { strict as assert } from "node:assert";
import { canReserveMember } from "./org-access";

test("BASIC allows two active members, never a third", () => {
  assert.equal(canReserveMember(["members.manage"], 1, 0, 2), true);
  assert.equal(canReserveMember(["members.manage"], 2, 0, 2), false);
});
test("PRO allows five members", () => {
  assert.equal(canReserveMember(["members.manage"], 4, 0, 5), true);
  assert.equal(canReserveMember(["members.manage"], 5, 0, 5), false);
});
test("BUSINESS allows ten members", () => {
  assert.equal(canReserveMember(["members.manage"], 9, 0, 10), true);
  assert.equal(canReserveMember(["members.manage"], 10, 0, 10), false);
});
test("pending invitations reserve seats", () => {
  assert.equal(canReserveMember(["members.manage"], 1, 1, 2), false);
});
test("members without management permission cannot invite", () => {
  assert.equal(canReserveMember(["orders.create"], 1, 0, 10), false);
});