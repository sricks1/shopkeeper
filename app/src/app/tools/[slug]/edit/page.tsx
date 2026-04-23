// Session 4: Edit Tool form (owner/shop_master only).

export default async function EditToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Edit Tool: {slug}</h1>
      <p className="mt-2 text-sm text-zinc-500">Form coming in Session 4.</p>
    </main>
  );
}
