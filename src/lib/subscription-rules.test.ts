import { test } from "node:test";
import { strict as assert } from "node:assert";
import { ANNUAL_PLANS, annualPrice, purchasedSeats, seatsForSubscriptionPrice, subscriptionAccess, needsPlanSelection, canEnterAfterPayment, CHECKOUT_FEATURES } from "./subscription-rules";
test("Basic annual price is €350 and includes one user", () => { assert.equal(ANNUAL_PLANS.basic.price, 350); assert.equal(purchasedSeats("basic"), 1); assert.throws(() => purchasedSeats("basic", 2)); });
test("Pro annual price is €600 and includes two users", () => { assert.equal(ANNUAL_PLANS.pro.price, 600); assert.equal(purchasedSeats("pro"), 2); assert.throws(() => purchasedSeats("pro", 5)); });
test("Business annual price is €1200 and includes four users", () => { assert.equal(annualPrice("business", 4), 1200); assert.equal(purchasedSeats("business"), 4); });
test("Each Business user above four adds €300 annually", () => { assert.equal(annualPrice("business", 5), 1500); assert.equal(annualPrice("business", 6), 1800); assert.equal(annualPrice("business", 10), 3000); });
test("Business accepts only whole counts from four to ten", () => { for (const n of [3, 11, 4.5, NaN]) assert.throws(() => purchasedSeats("business", n)); });
test("Trusted Business quantities enforce purchased capacity", () => { assert.equal(seatsForSubscriptionPrice("business",30000,5),5); assert.equal(seatsForSubscriptionPrice("business",30000,11),null); });
test("Existing subscription prices preserve old seat limits", () => { assert.equal(seatsForSubscriptionPrice("pro",42000,1),5); assert.equal(seatsForSubscriptionPrice("business",55000,1),10); assert.equal(seatsForSubscriptionPrice("basic",35000,1,"price_1UUwPhKmzqfVZ3iXD1bBfvEY"),2); });
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
});test("Basic can upgrade to Pro and Business; Pro only to Business", async () => {
  const { canUpgrade } = await import("./subscription-rules");
  assert.equal(canUpgrade("basic","pro"), true);
  assert.equal(canUpgrade("basic","business"), true);
  assert.equal(canUpgrade("pro","business"), true);
  assert.equal(canUpgrade("pro","basic"), false);
  assert.equal(canUpgrade("business","pro"), false);
  assert.equal(canUpgrade("pro","pro"), false);
});
test("Live price IDs map to the plan keys", async () => {
  const { planKeyForPrice } = await import("./subscription-rules");
  assert.equal(planKeyForPrice({id:"price_1UUwPhKmzqfVZ3iXD1bBfvEY", lookup_key:null}), "voiceorders_basic_yearly");
  assert.equal(planKeyForPrice({id:"price_1UUwQGKmzqfVZ3iXiJGX6D2A"}), "voiceorders_pro_yearly");
  assert.equal(planKeyForPrice({id:"price_1UUwR7KmzqfVZ3iXyIhUhUbi"}), "voiceorders_business_yearly");
  assert.equal(planKeyForPrice({id:"price_unknown"}), null);
});
