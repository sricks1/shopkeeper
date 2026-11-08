# Add to ShopKeeper (Chrome extension)

One toolbar button: on a product page (Amazon, Rockler, Woodcraft, anything),
click it and ShopKeeper's **Add Consumable** form opens in a new tab with the
name, SKU, vendor, link, and brand/model notes filled in. You still pick the
category, kind, and tools, and nothing is saved until you press **Add
Consumable**. The extension never talks to Supabase; it rides on your normal
ShopKeeper login.

If an existing part has the same SKU or vendor link, the form shows an
"Already in inventory?" warning with links.

## Install (unpacked)

```bash
cd extension
pnpm install
pnpm build
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → pick this `extension/` folder. Pin the icon from the puzzle-piece
menu.

After pulling changes, run `pnpm build` and hit the reload arrow on the
extension's card.

## Settings

Right-click the icon → **Options** to set the ShopKeeper address. It defaults
to production, `https://shopkeeper.thejoinery.club`; set it to
`http://localhost:3000` to test against a local dev server.

## What it reads

- **Amazon:** `#productTitle`, brand from the byline, and "Item model number"
  from the details table as the SKU (the shop's convention: manufacturer part
  number, e.g. `D1050X`), falling back to the ASIN. The link is shortened to
  `amazon.com/dp/<ASIN>`.
- **Everything else:** schema.org `Product` JSON-LD (name, sku/mpn, brand),
  then Open Graph tags, then the page title. The link is the page's canonical
  URL, which drops tracking parameters.
- **Highlighted text** on the page, if any, is used as the name. That's handy
  when the listing title is 40 words of SEO.

Photos aren't carried over; save the image and add it in the form if you want
one.

## Development

- `src/scrape.ts` runs inside the product page. It's serialized by
  `chrome.scripting.executeScript`, so it can't import anything or reference
  outside variables.
- `pnpm lint` / `pnpm typecheck` before committing.
