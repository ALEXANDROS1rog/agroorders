import { test } from "node:test";
import { strict as assert } from "node:assert";
import { ANNUAL_PLANS, subscriptionAccess, needsPlanSelection, canEnterAfterPayment, CHECKOUT_FEATURES } from "./subscription-rules";
test("Basic annual price is €350 and includes two users", () => { assert.equal(ANNUAL_PLANS.basic.price, 350); assert.equal(ANNUAL_PLANS.basic.seats, 2); });
test("Pro annual price is €420 and includes five users", () => { assert.equal(ANNUAL_PLANS.pro.price, 420); assert.equal(ANNUAL_PLANS.pro.seats, 5); });
test("Business annual price is €550 and includes ten users", () => { assert.equal(ANNUAL_PLANS.business.price, 550); assert.equal(ANNUAL_PLANS.business.seats, 10); });
test("Unpaid initial subscriptions never grant access", () => assert.equal(subscriptionAccess("active", "2030-01-01", false, 0), false));
test("Paid cancellation retains access until paid period ends", () => { assert.equal(subscriptionAccess("canceled", "2030-01-01", true, 0), true); assert.equal(subscriptionAccess("canceled", "2030-01-01", true, Date.parse("2031-01-01")), false); });
test("Free signup with an unpaid owner goes to plan selection", () => assert.equal(needsPlanSelection({role:"owner", subscription_status:"unpaid", features:[]}), true));
test("Existing members and subscribed owners keep their existing access", () => {
  assert.equal(needsPlanSelection({role:"driver", subscription_status:"unpaid", features:[]}), false);
  assert.equal(needsPlanSelection({role:"owner", subscription_status:"active", features:["orders"]}), false);
});
test("An incomplete payment does not allow entry", () => assert.equal(canEnterAfterPayment({paid:false,status:"incomplete",period_end:"2030-01-01",price_id:"voiceorders_basic_yearly"}, "unpaid", ["orders"], 0), false));
test("Return URL without trusted paid state does not allow entry", () => assert.equal(canEnterAfterPayment(null, "paid", ["orders"], 0), false));
test("Confirmed payment with existing entitlements allows entry for each existing plan", () => {
  for (const plan of Object.values(ANNUAL_PLANS)) assert.equal(canEnterAfterPayment({paid:true,status:"active",period_end:"2030-01-01",price_id:plan.lookupKey}, "paid", ["orders"], 0), true);
});
test("Test payment never bypasses existing live entitlement restrictions", () => assert.equal(canEnterAfterPayment({paid:true,status:"active",period_end:"2030-01-01",price_id:"voiceorders_pro_yearly"}, "paid", [], 0), false));
test("Unimplemented advanced AI and analytics are not advertised", () => {
  assert.equal(CHECKOUT_FEATURES.has("advanced_ai"), false);
  assert.equal(CHECKOUT_FEATURES.has("advanced_analytics"), false);
});