import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { verifiedPaidPeriod } from './payment-state';

const previous = { subscription_id: 'sub_old', customer_id: 'cus_old', paid: true, period_end: '2027-01-01' };
const current = { subscriptionId: 'sub_old', customerId: 'cus_old', invoicePaid: false, periodEnd: '2028-01-01' };

test('New unpaid subscription cannot inherit paid access', () => {
  assert.deepEqual(verifiedPaidPeriod(previous, { ...current, subscriptionId: 'sub_new' }), { paid: false, period_end: null });
});
test('Different customer cannot inherit paid access', () => {
  assert.deepEqual(verifiedPaidPeriod(previous, { ...current, customerId: 'cus_new' }), { paid: false, period_end: null });
});
test('Failed renewal does not extend the last paid period', () => {
  assert.deepEqual(verifiedPaidPeriod(previous, current), { paid: true, period_end: '2027-01-01' });
});
test('Confirmed renewal advances the paid period', () => {
  assert.deepEqual(verifiedPaidPeriod(previous, { ...current, invoicePaid: true }), { paid: true, period_end: '2028-01-01' });
});
test('Unpaid first subscription has no paid period', () => {
  assert.deepEqual(verifiedPaidPeriod(undefined, current), { paid: false, period_end: null });
});