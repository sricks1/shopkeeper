import { NextResponse } from "next/server";

// Apple Universal Links config for the ShopKeeper iOS companion app.
// Must be served at exactly this path, over HTTPS, with no redirects,
// as HTTP 200 with a JSON content-type — Apple's CDN fetches it directly
// and silently disables universal links if any of that isn't met.
// See docs/ios-phase1.md for the iOS app scope; house rule in CLAUDE.md
// (ios/ section) applies if the bundle id or paths ever change.
export const dynamic = "force-static";

const AASA = {
  applinks: {
    details: [
      {
        appID: "9R99EUR743.club.thejoinery.shopkeeper",
        paths: ["/t/*", "/tools/*"],
      },
    ],
  },
};

export function GET() {
  return NextResponse.json(AASA, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
