import { test } from "node:test";
import { strict as assert } from "node:assert";
import { ANNUAL_PLANS, subscriptionAccess } from "./subscription-rules";
test("Basic annual price is €350 and includes two users", () => { assert.equal(ANNUAL_PLANS.basic.price, 350); assert.equal(ANNUAL_PLANS.basic.seats, 2); });
test("Pro annual price is €420 and includes five users", () => { assert.equal(ANNUAL_PLANS.pro.price, 420); assert.equal(ANNUAL_PLANS.pro.seats, 5); });
test("Business annual price is €550 and includes ten users", () => { assert.equal(ANNUAL_PLANS.business.price, 550); assert.equal(ANNUAL_PLANS.business.seats, 10); });
test("Unpaid initial subscriptions never grant access", () => assert.equal(subscriptionAccess("active", "2030-01-01", false, 0), false));
test("Paid cancellation retains access until paid period ends", () => { assert.equal(subscriptionAccess("canceled", "2030-01-01", true, 0), true); assert.equal(subscriptionAccess("canceled", "2030-01-01", true, Date.parse("2031-01-01")), false); });