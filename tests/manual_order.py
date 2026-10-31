"""Authenticated regression: manual order creation reads back its items and total."""
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
        await page.evaluate("([k,v])=>localStorage.setItem(k,v)",
                            [minted["storage_key"], json.dumps(minted["session"])])
        await page.goto("http://localhost:8080/orders/new")
        await page.get_by_role("button", name="Χειροκίνητα", exact=True).click()
        await page.locator("select").nth(0).select_option(index=1)
        await page.get_by_label("Προσθήκη προϊόντος", exact=True).select_option(index=1)
        await page.get_by_role("button", name="Περισσότερο", exact=True).click()
        order_id = None
        try:
            async with page.expect_response(lambda r: "rpc/save_company_order" in r.url) as pending:
                await page.get_by_role("button", name="Δημιουργία παραγγελίας", exact=True).click()
            response = await pending.value
            assert response.status == 200, "Authorized manual creation must succeed"
            order_id = await response.json()
            await page.wait_for_url(f"**/orders/{order_id}")
            await page.get_by_role("link", name="Επεξεργασία παραγγελίας").wait_for()
            result = await page.evaluate("""async (id) => {
              const {supabase}=await import('/src/integrations/supabase/client.ts');
              const {data,error}=await supabase.from('orders').select('total,source,order_items(quantity,unit_price),deliveries(id)').eq('id',id).single();
              if(error) throw new Error(error.message);
              return data;
            }""", order_id)
            assert result["source"] == "manual"
            assert len(result["order_items"]) == 1
            assert float(result["order_items"][0]["quantity"]) == 2
            assert float(result["total"]) == 2 * float(result["order_items"][0]["unit_price"])
            assert len(result["deliveries"]) == 1
            print("PASS: manual creation, two units, computed total and delivery read back")
        finally:
            if order_id:
                await page.evaluate("""async id=>{
                  const {supabase}=await import('/src/integrations/supabase/client.ts');
                  const {error}=await supabase.from('orders').delete().eq('id',id);
                  if(error) throw new Error(error.message);
                }""", order_id)
            await browser.close()


asyncio.run(main())