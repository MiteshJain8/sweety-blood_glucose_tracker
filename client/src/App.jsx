import { useEffect, useState } from 'react';

async function request(path, body) {
  const response = await fetch(`/api/auth/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.');
  return data;
}
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  useEffect(() => {
    let active = true;
    request('me').then(data => { if (active) setUser(data.user); }).catch(err => {
      if (active && err.message !== 'Please log in.') setError(err.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data = await request(register ? 'register' : 'login', form);
      setUser(data.user); setForm({ name: '', email: '', password: '' });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await request('logout', {}); setUser(null); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-page px-6 py-12 text-content">
    <div className="mx-auto max-w-lg">
      <header className="mb-8 border-b border-outline pb-6"><p className="text-3xl font-bold text-brand">Sweety</p><p className="mt-2 text-secondary">Your daily blood glucose tracker</p></header>
      {error && <p role="alert" className="mb-4 rounded border border-brand p-3">{error}</p>}
      {loading ? <p role="status">Loading your session…</p> : user ? <section className="rounded-2xl border border-outline bg-surface p-6">
        <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
        <p className="mt-3 text-secondary">You are logged in. Reading management is coming in the next milestone.</p>
        <button disabled={busy} onClick={logout} className="mt-6 rounded bg-brand px-4 py-2 text-page disabled:opacity-50">Log out</button>
      </section> : <section className="rounded-2xl border border-outline bg-surface p-6">
        <h1 className="mb-5 text-xl font-semibold">{register ? 'Create an account' : 'Log in'}</h1>
        <form onSubmit={submit} className="space-y-4">
          {(register ? ['name', 'email', 'password'] : ['email', 'password']).map(field => <label key={field} className="block">
            <span className="mb-1 block capitalize">{field}</span>
            <input required name={field} type={field === 'name' ? 'text' : field} autoComplete={field === 'password' ? (register ? 'new-password' : 'current-password') : field} minLength={field === 'password' && register ? 8 : undefined} maxLength={field === 'name' ? 100 : field === 'email' ? 254 : undefined} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} className="w-full rounded border border-outline bg-page px-3 py-2 focus:outline-2 focus:outline-brand" />
          </label>)}
          <button disabled={busy} className="w-full rounded bg-brand px-4 py-2 font-medium text-page disabled:opacity-50">{busy ? 'Please wait…' : register ? 'Sign up' : 'Log in'}</button>
        </form>
        <button disabled={busy} onClick={() => { setRegister(!register); setError(''); }} className="mt-5 text-brand underline">{register ? 'Already registered? Log in' : 'New here? Create an account'}</button>
      </section>}
    </div>
  </main>;
}
