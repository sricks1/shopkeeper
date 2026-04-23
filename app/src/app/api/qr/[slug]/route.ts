import QRCode from "qrcode";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const url = `https://shopkeeper.thejoinery.club/t/${slug}`;

  try {
    const png = await QRCode.toBuffer(url, {
      type: "png",
      width: 512,
      margin: 2,
      color: { dark: "#0a112a", light: "#ffffff" }, // deepNavy on white
    });

    return new NextResponse(png, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="qr-${slug}.png"`,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    console.error("[qr-route] Failed to generate QR for slug:", slug, err);
    return NextResponse.json({ error: "QR generation failed" }, { status: 500 });
  }
}
