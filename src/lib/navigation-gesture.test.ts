import { test } from "node:test";
import { strict as assert } from "node:assert";
import { bubblePosition, liquidBubbleWidth, selectedIcon, tabAtPosition } from "./navigation-gesture";

test("release selects the category under the finger, not the initial category", () => {
  const tabs = [{ left: 6, width: 70 }, { left: 78, width: 70 }, { left: 150, width: 70 }];
  assert.equal(tabAtPosition(40, tabs), 0);
  assert.equal(tabAtPosition(180, tabs), 2);
});
test("filtered navigation selects only visible categories", () => {
  assert.equal(tabAtPosition(180, [{ left: 6, width: 100 }, { left: 108, width: 100 }]), 1);
  assert.equal(tabAtPosition(100, []), -1);
});
test("bubble follows the finger continuously and stays inside the bar", () => {
  assert.equal(bubblePosition(130, 70, 390), 95);
  assert.equal(bubblePosition(140, 70, 390), 105);
  assert.equal(bubblePosition(-10, 70, 390), 6);
  assert.equal(bubblePosition(450, 70, 390), 314);
});
test("icons only gain color after explicit selection of the current category", () => {
  assert.equal(selectedIcon("/dashboard", null, "/dashboard"), false);
  assert.equal(selectedIcon("/orders", "/dashboard", "/orders"), false);
  assert.equal(selectedIcon("/orders", "/orders", "/orders"), true);
  assert.equal(selectedIcon("/orders/123", "/orders", "/orders"), true);
  assert.equal(selectedIcon("/customers", "/orders", "/orders"), false);
});
test("liquid bubble stretches with motion in either direction and has a bounded width", () => {
  assert.equal(liquidBubbleWidth(70, 0, 16), 70);
  assert.equal(liquidBubbleWidth(70, 8, 16), 75);
  assert.equal(liquidBubbleWidth(70, -8, 16), 75);
  assert.equal(liquidBubbleWidth(70, 200, 0), 84);
});