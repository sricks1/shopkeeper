import { redirect } from "next/navigation";

// QR codes point to /t/<slug>. This route redirects to the full tool detail URL.
// proxy.ts handles auth — unauthenticated scans hit /login?next=/t/<slug> first.

export default async function QRRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/tools/${slug}`);
}
