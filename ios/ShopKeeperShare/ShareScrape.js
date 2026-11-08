// Safari runs this on the page before the share extension opens
// (NSExtensionJavaScriptPreprocessingFile). It must be plain JavaScript that
// defines a global `ExtensionPreprocessingJS`; iOS loads it as-is, which is
// why it isn't TypeScript like the rest of the repo.
//
// Port of extension/src/scrape.ts (the Chrome extension). Change one, change
// the other: Amazon selectors first, then schema.org Product JSON-LD, Open
// Graph, and the page title. Highlighted text wins as the name. Every value
// returned is a string, so Swift can read the result as [String: String].

var ExtensionPreprocessingJS = {
  run: function (args) {
    var result = {};
    try {
      result = scrapeProduct();
    } catch (e) {
      result = { name: document.title, vendor_url: location.href };
    }
    var clean = {};
    for (var key in result) {
      if (typeof result[key] === "string" && result[key]) clean[key] = result[key];
    }
    args.completionFunction(clean);
  },
  finalize: function () {},
};

function scrapeProduct() {
  var clean = function (s) {
    var v = (s || "").replace(/\s+/g, " ").trim();
    return v || undefined;
  };
  var meta = function (selector) {
    var el = document.querySelector(selector);
    return clean(el && el.content);
  };
  var text = function (selector) {
    var el = document.querySelector(selector);
    return clean(el && el.textContent);
  };

  var selection = clean(window.getSelection && window.getSelection().toString());
  var host = location.hostname.replace(/^www\./, "");

  // ─── Amazon ────────────────────────────────────────────────────────────────
  if (/(^|\.)amazon\.[a-z.]+$/.test(host)) {
    var asinInput = document.querySelector("#ASIN");
    var pathMatch = location.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/);
    var asin = clean(asinInput && asinInput.value) || (pathMatch && pathMatch[1]) || undefined;

    var brand = text("#bylineInfo");
    if (brand) {
      brand = brand.replace(/^Visit the\s+/i, "").replace(/\s+Store$/i, "").replace(/^Brand:\s*/i, "");
    }

    // "Item model number" / "Part Number" live in one of a few detail tables;
    // the mobile site uses the same ids as desktop for these.
    var model;
    var rows = document.querySelectorAll(
      "#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #detailBullets_feature_div li, #tech tr",
    );
    for (var i = 0; i < rows.length && !model; i++) {
      var labelEl = rows[i].querySelector("th, .a-text-bold");
      var label = clean(labelEl && labelEl.textContent);
      label = label && label.replace(/[:‎‏]/g, "");
      if (label && /^(item model number|model number|part number|manufacturer part number)/i.test(label)) {
        var valueEl = rows[i].querySelector("td") || rows[i].querySelector(".a-text-bold + span");
        model = clean(valueEl && valueEl.textContent);
        model = model && model.replace(/[‎‏]/g, "");
      }
    }

    // Shop convention: SKU holds the manufacturer part number; ASIN is the
    // fallback and is noted when the model number took the SKU slot.
    var notes = [brand && "Brand: " + brand, model && asin && "ASIN: " + asin].filter(Boolean).join(" · ");

    return {
      name: selection || text("#productTitle") || text("#title") || clean(document.title),
      sku: model || asin,
      vendor: "Amazon",
      vendor_url: asin ? "https://" + location.hostname + "/dp/" + asin : location.href,
      notes: notes || undefined,
    };
  }

  // ─── Everything else ───────────────────────────────────────────────────────
  var findProduct = function (node) {
    if (Array.isArray(node)) {
      for (var j = 0; j < node.length; j++) {
        var hit = findProduct(node[j]);
        if (hit) return hit;
      }
      return undefined;
    }
    if (!node || typeof node !== "object") return undefined;
    var type = node["@type"];
    if (type === "Product" || (Array.isArray(type) && type.indexOf("Product") !== -1)) return node;
    return findProduct(node["@graph"]);
  };

  var product;
  var scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (var k = 0; k < scripts.length && !product; k++) {
    try {
      product = findProduct(JSON.parse(scripts[k].textContent || ""));
    } catch (e) {
      // Malformed JSON-LD is common; skip it.
    }
  }

  var str = function (v) {
    return typeof v === "string" ? clean(v) : undefined;
  };
  var brandField = product && product.brand;
  var productBrand =
    str(brandField) || str(brandField && brandField.name) || meta('meta[property="product:brand"]');
  var mpn = str(product && product.mpn);
  var sku = str(product && product.sku) || mpn;
  var productNotes = [productBrand && "Brand: " + productBrand, mpn && mpn !== sku && "MPN: " + mpn]
    .filter(Boolean)
    .join(" · ");

  var canonicalEl = document.querySelector('link[rel="canonical"]');
  var canonical = clean(canonicalEl && canonicalEl.href);

  // Some sites (Rockler) put a URL in og:site_name; the bare host reads better.
  var siteName = meta('meta[property="og:site_name"]');
  var vendor = siteName && !/^https?:\/\/|\.(com|net|org)\/?$/i.test(siteName) ? siteName : host;

  return {
    name: selection || str(product && product.name) || meta('meta[property="og:title"]') || clean(document.title),
    sku: sku,
    vendor: vendor,
    vendor_url: canonical || meta('meta[property="og:url"]') || location.href,
    notes: productNotes || undefined,
  };
}
