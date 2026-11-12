import { useEffect, useState } from 'react';
const titles = { daily: 'Daily report', monthToDate: 'Month-to-date', monthly: 'Previous month' };
export default function Reports({ date, reload }) {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setReports(null); setError('');
    fetch(`/api/reports?date=${date}`).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not load reports.');
      if (active) setReports(data);
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [date, reload]);
  return <section aria-label="Glucose reports" className="space-y-3">
    <h2 className="text-xl font-semibold">Reports</h2>
    {error ? <p role="alert">{error}</p> : !reports ? <p role="status">Loading reports…</p> : Object.entries(titles).map(([key, title]) => {
      const report = reports[key];
      return <article key={key} className="rounded border border-outline p-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-secondary">{report.start} – {report.end}</p>
        {report.count === 0 ? <p className="mt-3">No readings in this period yet.</p> : <dl className="mt-3 grid grid-cols-2 gap-3">
          <div><dt>Highest</dt><dd>{report.maximum} mg/dl</dd></div>
          <div><dt>Lowest</dt><dd>{report.minimum} mg/dl</dd></div>
          <div><dt>Average</dt><dd>{report.average.toFixed(1)} mg/dl</dd></div>
          <div><dt>Readings</dt><dd>{report.count}</dd></div>
        </dl>}
      </article>;
    })}
  </section>;
}
