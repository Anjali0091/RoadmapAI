import { useState, useEffect } from 'react';
import Auth from './Auth.jsx';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [form, setForm] = useState({
    duration: '',
    hours: '',
    level: 'Beginner',
    style: 'Both',
    stack: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roadmap, setRoadmap] = useState(null);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function handleAuth(t) {
    localStorage.setItem('token', t);
    setToken(t);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setRoadmap(null);
    setError('');
  }

  // load the saved roadmap after login or page refresh
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/roadmap', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
          return;
        }
        const data = await res.json();
        if (!cancelled && data) setRoadmap(data);
      } catch {
        // ignore, the user can still generate a new roadmap
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRoadmap(null);

    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setRoadmap(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function setDone(pi, di, done) {
    setRoadmap((prev) => ({
      ...prev,
      phases: prev.phases.map((p, i) =>
        i !== pi ? p : { ...p, days: p.days.map((d, j) => (j !== di ? d : { ...d, done })) }
      )
    }));
  }

  async function toggleDay(pi, di) {
    const done = !roadmap.phases[pi].days[di].done;
    setDone(pi, di, done); // update the screen right away

    try {
      const res = await fetch('/api/roadmap/day', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phase: pi, day: di, done })
      });
      if (res.status === 401) return logout();
      if (!res.ok) throw new Error('save failed');
    } catch {
      setDone(pi, di, !done); // put it back if saving failed
      setError('Could not save your progress.');
    }
  }

  if (!token) return <Auth onAuth={handleAuth} />;

  return (
    <main className="page">
      <div className="top">
        <h1 className="brand">RoadmapAI</h1>
        <button type="button" className="ghost" onClick={logout}>
          Logout
        </button>
      </div>

      <form className="box" onSubmit={handleSubmit}>
        <label>
          Duration (months)
          <input type="number" min="1" max="12" required value={form.duration} onChange={update('duration')} />
        </label>

        <label>
          Daily study hours
          <input type="number" min="1" max="16" step="0.5" required value={form.hours} onChange={update('hours')} />
        </label>

        <label>
          Target level
          <select value={form.level} onChange={update('level')}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </label>

        <label>
          Learning style
          <select value={form.style} onChange={update('style')}>
            <option>Theory</option>
            <option>Practical</option>
            <option>Both</option>
          </select>
        </label>

        <label className="wide">
          Stack
          <input
            type="text"
            required
            placeholder="dsa, mern, java, springboot, python+ml, react+typescript"
            value={form.stack}
            onChange={update('stack')}
          />
        </label>

        <button className="wide" type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate roadmap'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {roadmap && (
        <section className="roadmap">
          {roadmap.phases.map((phase, i) => (
            <article className="phase" key={i}>
              <header>
                <h2>{phase.title}</h2>
                <span>{phase.period}</span>
              </header>
              <ul>
                {phase.days.map((d, j) => (
                  <li key={j} className={d.done ? 'done' : ''}>
                    <b>{d.day}</b>
                    <p>{d.topic}</p>
                    <input
                      type="checkbox"
                      checked={d.done}
                      onChange={() => toggleDay(i, j)}
                      aria-label={`Mark ${d.day} complete`}
                    />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}