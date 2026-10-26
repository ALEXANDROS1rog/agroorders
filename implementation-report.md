# VoiceOrders implementation and verification report

## Bugs found and addressed
- Unpaid/expired subscriptions previously exposed plan features. Feature checks now validate paid live status; pre-existing `legacy` organizations retain existing access without deleting data.
- Driver reads previously exposed company-wide deliveries/orders. Database policies now require a delivery or route assignment and restrict related customer/order-line reads.
- Member directory RPC previously exposed all member account details to drivers. It now requires owner/manager membership.
- Cross-company customer, route, order and product references could be submitted. Database reference triggers reject them, including company reassignment.
- Order creation/editing and delivery completion used multiple independent writes. Transactional RPCs now commit all required changes together or roll back.
- GPS auto-arrival previously scanned all pending work and enlarged its fence with poor accuracy. It now targets one started delivery, supports pause/resume, requires accuracy ≤30m inside a conservative 60m fence, at least three samples over 20 seconds without >10-second gaps, and stops on completion. A changed order address cannot use stale customer coordinates.

## Prices and payment setup
- Basic: €350/year, 2 users. Pro: €420/year, 5 users. Business: €550/year, 10 users.
- Confirmed by the owner; existing feature lists preserved. These are catalog amounts; applicable checkout taxes may be added (the observed Dutch test checkout displayed €423.50 for Basic).
- Built-in Stripe was explicitly selected instead of own API keys. Three annual test products exist. Embedded Checkout and an owner-only billing portal are implemented.
- Signed provider events reconcile the current subscription, record event IDs transactionally, and update separate test/live snapshots. An unpaid initial payment or a visit to a return URL does not activate live features. Failed renewals do not extend the paid-through date.
- Full tax/compliance handling is configured for new SaaS subscriptions, adding 3.5% to provider fees; buyers may see `LINK.COM*` on their statements.
- No card data or private credentials are stored in application code.

## Changed areas
- Billing: `src/lib/{stripe.server,stripe,payments.functions,subscription-rules}.ts`, `src/components/{CompanyCheckout,PaymentTestModeBanner}.tsx`, `src/routes/api/public/payments/webhook.ts`, plans and registration pages.
- Operations: `src/lib/api.ts`, `src/lib/delivery-tracking.ts`, `AutoDeliver`, `DeliveryCard`, deliveries/trip detail/order detail/customer list, position hook.
- Synchronization/access: `CompanySync`, root auth listener, `src/lib/org.ts`, supplemental payment locale dictionaries and DOM translator.
- Applied additive migrations: `0002` trusted billing/reference guards, `0003` assignment policies/atomic delivery/plan guards, `0004` legacy preservation/atomic order save, `0005` member-directory restriction, `0006` driver direct-write/company-reassignment guards.
- Existing `role_permissions` read-only policy retained.

## Tests actually executed
- 16 rule tests: all passed (seat limits, annual prices, paid access, pause/resume identity, GPS accuracy/fence/dwell/reset, stale destination prevention).
- Authenticated owner security checks: permission-definition writes denied, direct role assignment denied, permitted definition reads retained.
- Signed-in browser: three prices displayed; checkout iframe rendered; test purchase returned with a real provider session. Provider emitted `invoice.paid`.
- Replayed that actual signed provider event locally: 200. Replayed again: 200 with only one event row. Test snapshot reads paid/active; live state remains unpaid and operational write rejected.
- Owner portal control appears; duplicate purchase disabled. Orders page loaded. Registration displayed all three annual plan choices.
- Missing-signature webhook request: 400.
- All 11 supplemental locale dictionaries have identical complete keys.
- Automated build/type-check logs reached `build OK`; targeted lint completed with no errors and existing component-export fast-refresh warnings.

## Remaining configuration and limitations
1. Payments → live setup: claim/link account, verify business, add payout bank, install Lovable app and pass readiness check. No manual private key is required. Live payments are not enabled or tested.
2. Automatic hosted event delivery was not observed during the test; only a genuine provider event replay to the local handler was verified. Verify delivery on the hosted test app before live acceptance.
3. Choose/confirm upgrade proration, downgrade timing and cancellation access policy and configure the provider portal accordingly; plan-change end-to-end tests remain unexecuted. Code preserves access through the paid period and reconciles trusted plan updates.
4. Test full signup/email confirmation and declined payment: the selector works, but signup was not executed and the attempted decline did not conclusively display a decline state.
5. Driver/manager/shared-data/invitation acceptance/removal tests require approved role accounts and assigned work; only the owner account was exercised. Assignment UI exists on order details; route-wide assignment UI is not yet supplied.
6. Real-device GPS and mounted watcher pause/resume end-to-end checks remain unexecuted; only tracking/geofence logic tests ran. Browser location needs foreground permission; continuous background iOS Safari tracking is not promised.
7. Existing advanced feature labels were preserved, not a claim that every advertised advanced capability was completed in this update.

AI Gateway script was used only to generate the supplemental translations.