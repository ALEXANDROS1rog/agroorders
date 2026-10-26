"""Live security regression checks; requires a locally minted preview session."""
import asyncio
import json
import os
from playwright.async_api import async_playwright


async def main():
    with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as file:
        minted = json.load(file)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto("http://localhost:8080")
        await page.evaluate("([key, value]) => localStorage.setItem(key, value)",
                            [minted["storage_key"], json.dumps(minted["session"])])
        await page.goto("http://localhost:8080/organization")
        await page.wait_for_timeout(1000)
        result = await page.evaluate("""async () => {
          const {supabase} = await import('/src/integrations/supabase/client.ts');
          const {data: orgs, error} = await supabase.rpc('my_org_context');
          if (error || !orgs?.[0]) throw new Error('No organization for this session');
          const org = orgs[0];
          const {data: user} = await supabase.auth.getUser();
          const write = await supabase.from('role_permissions').insert({role:'driver',permission:'billing.manage'});
          const read = await supabase.from('role_permissions').select('*');
          const membership = await supabase.from('organization_members').insert({
            organization_id:org.organization_id,user_id:user.user.id,role:'owner',status:'active'
          });
          return {
            definitionWriteDenied:write.error?.code === '42501',
            definitionReadAllowed:!read.error && read.data.length > 0,
            directRoleAssignmentDenied:membership.error?.code === '42501'
          };
        }""")
        assert result["definitionWriteDenied"], "Signed-in users must not change role permission definitions"
        assert result["definitionReadAllowed"], "Signed-in members must retain permitted reads"
        assert result["directRoleAssignmentDenied"], "Users must not directly assign themselves roles"
        print("PASS: permission definitions immutable to app users, permitted reads work, direct role assignment denied")
        await browser.close()


asyncio.run(main())