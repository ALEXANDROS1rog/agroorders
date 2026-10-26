<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Translation: Greek UI text is the source; src/lib/dom-translate.ts swaps on-screen Greek text using src/lib/locales/<lang>.json (keyed by the exact Greek string). Why: translates every page without wrapping each string. When adding new Greek UI text, add its translation to every locale file.
- Organization access uses centralized permissions and feature flags from my_org_context, with UI guards for affordances and database RLS as authority; this prevents client-side role spoofing.
- Organization translation dictionaries supplement each supported locale and merge in the DOM translator; this isolates new vocabulary without replacing existing translations.
- Invitation creation and acceptance serialize on the organization row so concurrent invitations cannot oversubscribe a plan; existing active members cannot accept an invitation that would replace their role.
- Company payments reuse organization_subscriptions with separate test/live payment snapshots; only signed provider events update entitlements, and test payments never grant live access.
- Order creation/editing and delivery status changes use transactional database RPCs so partial writes cannot leave operational records inconsistent.
- Delivery tracking is explicitly scoped to one delivery in memory, with pause/resume and accuracy/dwell checks; never restore an automatic GPS watcher from persistent preferences.
- CompanySync combines company-filtered realtime with visibility-aware polling so updates and revoked memberships refresh without relying on realtime publication availability.
