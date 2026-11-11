export default function App() {
  return (
    <main className="min-h-screen bg-page px-6 py-12 text-content sm:py-20">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-outline pb-6">
          <p className="text-3xl font-bold tracking-tight text-brand">Sweety</p>
          <p className="mt-2 text-secondary">Your daily blood glucose tracker</p>
        </header>
        <section className="mt-8 rounded-2xl border border-outline bg-surface p-6 sm:p-8">
          <h1 className="text-xl font-semibold">A simple place for your readings</h1>
          <p className="mt-3 leading-7 text-secondary">
            Record up to four readings a day and see your daily and monthly reports.
          </p>
        </section>
      </div>
    </main>
  );
}
