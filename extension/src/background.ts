import { type ScrapedProduct, scrapeProduct } from "./scrape.js";
import { getBaseUrl } from "./settings.js";

// Long Amazon titles can blow past sensible URL lengths; the form caps at
// 2000 chars per field anyway.
const MAX_FIELD_LENGTH = 500;

chrome.action.onClicked.addListener(async (tab) => {
  const product = await scrapeTab(tab);
  const url = new URL("/inventory/new", await getBaseUrl());
  for (const [key, value] of Object.entries(product)) {
    if (value) url.searchParams.set(key, value.slice(0, MAX_FIELD_LENGTH));
  }
  await chrome.tabs.create({ url: url.toString(), index: (tab.index ?? 0) + 1 });
});

async function scrapeTab(tab: chrome.tabs.Tab): Promise<ScrapedProduct> {
  // Fallback for pages Chrome won't let extensions script (chrome://, the Web
  // Store, PDFs): the tab's own title and URL are still worth sending.
  const fallback: ScrapedProduct = { name: tab.title, vendor_url: tab.url };
  if (tab.id === undefined) return fallback;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeProduct,
    });
    return (result?.result as ScrapedProduct | undefined) ?? fallback;
  } catch {
    return fallback;
  }
}
