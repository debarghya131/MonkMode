export default function ToDoWeeklyReport() {
  return (
    <section className="rounded-2xl border border-amber-100/10 bg-stone-950/45 p-6">
      <p className="text-label-md">ToDo Weekly Report</p>
      <h3 className="mt-3 text-2xl font-bold text-amber-100">Task Completion Summary</h3>
      <p className="mt-3 text-sm text-stone-400">
        Review completed, pending, missed, and important tasks across the week.
      </p>
    </section>
  );
}
