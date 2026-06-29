export default function FormList() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-3xl font-bold">
          Available Forms
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-6 shadow">
            Request IT
          </div>

          <div className="rounded-lg border bg-white p-6 shadow">
            Request Design
          </div>

          <div className="rounded-lg border bg-white p-6 shadow">
            Request Marketing
          </div>
        </div>
      </div>
    </section>
  );
}