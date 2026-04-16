import { BookingForm } from './components/BookingForm';
import { Calendar } from './components/Calendar';
import { Hierarchy } from './components/Hierarchy';
import { useSelection } from './store';

export default function App() {
  const areaId = useSelection((s) => s.areaId);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-6 p-6">
      <aside className="w-64 shrink-0 rounded-lg border bg-white p-4 shadow-sm">
        <h1 className="mb-3 text-lg font-bold">Test Areas</h1>
        <Hierarchy />
      </aside>

      <main className="flex-1 space-y-4">
        {areaId ? (
          <>
            <Calendar areaId={areaId} />
            <BookingForm areaId={areaId} />
          </>
        ) : (
          <div className="rounded-lg border bg-white p-8 text-center text-slate-500 shadow-sm">
            Select a test area on the left to view its availability.
          </div>
        )}
      </main>
    </div>
  );
}
