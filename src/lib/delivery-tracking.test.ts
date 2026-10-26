import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  arrivalSample,
  deliveryDestination,
  getTracking,
  setTracking,
  stopTracking,
} from "./delivery-tracking";
test("changed order address never auto-completes at old customer location", () => {
  assert.equal(
    deliveryDestination({
      address: "New destination",
      customer: { address: "Old destination", latitude: 38, longitude: 23 },
    }),
    null,
  );
});
test("pause retains delivery identity and resume continues it", () => {
  setTracking("delivery-a", "active");
  setTracking("delivery-a", "paused");
  assert.deepEqual(getTracking(), { deliveryId: "delivery-a", status: "paused" });
  setTracking("delivery-a", "active");
  assert.equal(getTracking().deliveryId, "delivery-a");
  stopTracking();
  assert.equal(getTracking().status, "stopped");
});
test("inaccurate and isolated GPS never complete delivery", () => {
  assert.equal(arrivalSample(null, 0, 100, 0).arrived, false);
  assert.equal(arrivalSample(null, 0, 5, 20000).arrived, false);
});
test("60 metre fence includes uncertainty rather than expanding radius", () =>
  assert.equal(arrivalSample(null, 55, 10, 0).dwell, null));
test("three accurate readings over 20 seconds complete arrival", () => {
  let sample = arrivalSample(null, 10, 5, 0);
  sample = arrivalSample(sample.dwell, 10, 5, 10000);
  assert.equal(sample.arrived, false);
  sample = arrivalSample(sample.dwell, 10, 5, 20000);
  assert.equal(sample.arrived, true);
});
test("leaving fence or long GPS gap resets dwell", () => {
  const initial = arrivalSample(null, 10, 5, 0);
  assert.equal(arrivalSample(initial.dwell, 100, 5, 10000).dwell, null);
  assert.equal(arrivalSample(initial.dwell, 10, 5, 20000).arrived, false);
});
