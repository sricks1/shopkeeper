// Session 5: Report Issue form.

export default async function NewIssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Report Issue: {slug}</h1>
      <p className="mt-2 text-sm text-zinc-500">Form coming in Session 5.</p>
    </main>
  );
}
