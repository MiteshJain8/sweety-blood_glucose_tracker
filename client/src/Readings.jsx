import { useEffect, useState } from 'react';
const slots = { morning: 'Morning (fasting)', after_breakfast: 'After breakfast', after_lunch: 'After lunch', after_dinner: 'After dinner' };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
async function api(path, method = 'GET', body) {
  const response = await fetch(`/api/readings${path}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}
export default function Readings() {
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ slot: 'morning', value: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setRows([]); setError('');
    api(`?date=${date}`).then(data => { if (active) setRows(data.readings); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, reload]);
  function reset() { setEditing(null); setForm({ slot: 'morning', value: '' }); }
  async function save(event) {
    event.preventDefault(); setError('');
    if (form.value === '') { setError('Please enter a glucose value.'); return; }
    const value = Number(form.value);
    if (!Number.isInteger(value) || value < 40 || value > 600) { setError('Value must be between 40 and 600 mg/dl.'); return; }
    setBusy(true);
    try { await api(editing ? `/${editing}` : '', editing ? 'PUT' : 'POST', { date, slot: form.slot, value }); reset(); setReload(n => n + 1); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Delete the ${slots[row.slot]} reading?`)) return;
    setBusy(true); setError('');
    try { await api(`/${row.id}`, 'DELETE'); if (editing === row.id) reset(); setReload(n => n + 1); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const input = 'w-full rounded border border-outline bg-page px-3 py-2 focus:outline-2 focus:outline-brand';
  return <section className="mt-6 space-y-5">
    <h2 className="text-xl font-semibold">Daily readings</h2>
    <label className="block">Date<input aria-label="Reading date" type="date" max={today()} required value={date} disabled={busy} onChange={e => { if (e.target.value) { setDate(e.target.value); reset(); } }} className={input} /></label>
    {error && <p role="alert">{error}</p>}
    <form onSubmit={save} noValidate className="space-y-4 rounded border border-outline p-4">
      <h3 className="font-semibold">{editing ? 'Edit reading' : 'Add reading'}</h3>
      <label className="block">Time slot<select value={form.slot} onChange={e => setForm({ ...form, slot: e.target.value })} className={input}>{Object.entries(slots).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block">Glucose (mg/dl)<input type="number" min="40" max="600" step="1" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} className={input} /></label>
      <button disabled={busy || loading} className="rounded bg-brand px-4 py-2 text-page disabled:opacity-50">{busy ? 'Please wait…' : editing ? 'Save changes' : 'Add reading'}</button>
      {editing && <button type="button" disabled={busy} onClick={reset} className="ml-4 underline">Cancel</button>}
    </form>
    {loading ? <p role="status">Loading readings…</p> : rows.length === 0 ? <p>No readings for this date yet.</p> : <ul className="space-y-3">{rows.map(row => <li key={row.id} className="rounded border border-outline p-4"><p>{slots[row.slot]}: <strong>{row.value} mg/dl</strong></p><div className="mt-2 flex gap-5"><button disabled={busy} className="text-brand underline" onClick={() => { setEditing(row.id); setForm({ slot: row.slot, value: String(row.value) }); setError(''); }}>Edit</button><button disabled={busy} className="text-brand underline" onClick={() => remove(row)}>Delete</button></div></li>)}</ul>}
    <p className="text-secondary">{rows.length} of 4 readings recorded</p>
  </section>;
}
