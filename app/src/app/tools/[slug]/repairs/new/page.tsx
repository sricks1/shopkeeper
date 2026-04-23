// Session 6: Log Repair form with consumable picker.

export default async function NewRepairPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Log Repair: {slug}</h1>
      <p className="mt-2 text-sm text-zinc-500">Form coming in Session 6.</p>
    </main>
  );
}
