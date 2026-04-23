// Session 4: Tool detail — Server Component. QR code entry point.

export default async function ToolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Tool: {slug}</h1>
      <p className="mt-2 text-sm text-zinc-500">Tool detail coming in Session 4.</p>
    </main>
  );
}
