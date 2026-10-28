import { test } from "node:test";
import { strict as assert } from "node:assert";
import { canReserveMember } from "./org-access";

test("BASIC includes only the owner", () => {
  assert.equal(canReserveMember(["members.manage"], 0, 0, 1), true);
  assert.equal(canReserveMember(["members.manage"], 1, 0, 1), false);
});
test("PRO allows two members", () => {
  assert.equal(canReserveMember(["members.manage"], 1, 0, 2), true);
  assert.equal(canReserveMember(["members.manage"], 2, 0, 2), false);
});
test("BUSINESS enforces the purchased four to ten seats", () => {
  for (let seats=4; seats<=10; seats++) {
    assert.equal(canReserveMember(["members.manage"], seats-1, 0, seats), true);
    assert.equal(canReserveMember(["members.manage"], seats, 0, seats), false);
    assert.equal(canReserveMember(["members.manage"], seats-1, 1, seats), false);
  }
});
test("pending invitations reserve seats", () => {
  assert.equal(canReserveMember(["members.manage"], 1, 1, 2), false);
});
test("members without management permission cannot invite", () => {
  assert.equal(canReserveMember(["orders.create"], 1, 0, 10), false);
});