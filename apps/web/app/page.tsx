'use client';

import { useState, FormEvent } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Safe base URL for the API (env first, then sensible fallback)
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000');

export default function Home() {
  // Health
  const { data } = useSWR(`${API_BASE}/health`, fetcher);

  // State
  const [preflight, setPreflight] = useState<any>(null);
  const [digest, setDigest] = useState<any>(null);
  const [onboard, setOnboard] = useState<any>(null);

  const [path, setPath] = useState('/app/src/demo_repo');
  const [days, setDays] = useState(30);
  const [indexFlag, setIndexFlag] = useState(false);

  const [loadingPreflight, setLoadingPreflight] = useState(false);
  const [loadingOnboard, setLoadingOnboard] = useState(false);

  // ---- Explain ------------------------------------------------------------
  async function onAsk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const qInput = form.elements.namedItem('q') as HTMLInputElement;
    const q = qInput?.value ?? '';
    if (!q.trim()) return;

    const res = await fetch(`${API_BASE}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    });
    const json = await res.json();
    alert(JSON.stringify(json, null, 2));
  }

  // ---- Preflight ----------------------------------------------------------
  async function runPreflight() {
    setLoadingPreflight(true);
    const res = await fetch(`${API_BASE}/preflight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const json = await res.json();
    setPreflight(json);
    setLoadingPreflight(false);
  }

  // ---- Index --------------------------------------------------------------
  async function indexFolder() {
    const res = await fetch(`${API_BASE}/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const json = await res.json();
    alert(`Indexed ${json.chunks_indexed} chunks from ${json.path}`);
  }

  // ---- Change Digest ------------------------------------------------------
  async function runDigest() {
    const res = await fetch(`${API_BASE}/change-digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, days }),
    });
    const json = await res.json();
    setDigest(json);
  }

  // ---- Onboard (Preflight + optional Index + links/next steps) -----------
  async function runOnboard() {
    setLoadingOnboard(true);
    const res = await fetch(`${API_BASE}/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, index: indexFlag }),
    });
    const json = await res.json();
    setOnboard(json);
    setLoadingOnboard(false);
  }

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>RepoGuide – Onboarding Essentials</h1>

      <p>
        API health: <strong>{data ? data.status : 'loading...'}</strong>
      </p>

      {/* Explain */}
      <section style={{ marginTop: 24 }}>
        <h2>Try an explanation</h2>
        <form onSubmit={onAsk}>
          <input
            name="q"
            placeholder="How do I bring the system up?"
            style={{ padding: 8, width: 460 }}
          />
          <button type="submit" style={{ marginLeft: 8, padding: '8px 12px' }}>
            Ask
          </button>
        </form>
      </section>

      {/* Repo tools */}
      <section style={{ marginTop: 32 }}>
        <h2>Repo tools</h2>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/app/src/demo_repo"
            style={{ padding: 8, width: 420 }}
          />

          <button onClick={runPreflight} style={{ padding: '8px 12px' }} disabled={loadingPreflight}>
            {loadingPreflight ? 'Running…' : 'Run Preflight'}
          </button>

          <button onClick={indexFolder} style={{ padding: '8px 12px' }}>
            Index folder
          </button>

          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Number(e.target.value || 30))}
            min={1}
            style={{ padding: 8, width: 100 }}
            title="Days to look back for Change Digest"
          />
          <button onClick={runDigest} style={{ padding: '8px 12px' }}>
            Change Digest
          </button>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={indexFlag}
              onChange={(e) => setIndexFlag(e.target.checked)}
            />
            Index as part of onboarding
          </label>
          <button onClick={runOnboard} style={{ padding: '8px 12px' }} disabled={loadingOnboard}>
            {loadingOnboard ? 'Onboarding…' : 'Onboard me'}
          </button>
        </div>

        {/* Preflight render */}
        {preflight && (
          <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
            <div>
              <strong>Path:</strong> {preflight.path}
            </div>
            <div>
              <strong>Summary:</strong> {preflight.summary}
            </div>
            <ul style={{ marginTop: 8 }}>
              {preflight.checks?.map((c: any, i: number) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  <strong>{String(c.status).toUpperCase()}</strong> — {c.name}
                  {c.fix ? <span> • fix: {c.fix}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Digest render */}
        {digest && (
          <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
            <div>
              <strong>Since:</strong> {digest.since}</div>
            <div>
              <strong>Commits:</strong> {digest.commit_count}</div>
            {digest.note ? <div><em>{digest.note}</em></div> : null}

            {digest.top_files?.length ? (
              <>
                <h3 style={{ marginTop: 10 }}>Top files</h3>
                <ul>
                  {digest.top_files.map((f: any, i: number) => (
                    <li key={i}>
                      {f.file}
                      {f.count != null ? ` — ${f.count} change(s)` : ''}
                      {f.modified_at ? ` — ${new Date(f.modified_at).toLocaleString()}` : ''}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {digest.commits?.length ? (
              <>
                <h3 style={{ marginTop: 10 }}>Recent commits</h3>
                <ul>
                  {digest.commits.map((c: any, i: number) => (
                    <li key={i}>
                      <code>{c.hash}</code> — {c.date} — {c.subject}
                      {c.files?.length ? (
                        <div style={{ fontSize: 12, color: '#555' }}>
                          files: {c.files.slice(0, 6).join(', ')}
                          {c.files.length > 6 ? '…' : ''}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        )}

        {/* Onboard render */}
        {onboard && (
          <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
            <h3>Onboarding plan</h3>
            <div><strong>Path:</strong> {onboard.path}</div>
            <div><strong>Chunks indexed:</strong> {onboard.chunks_indexed}</div>

            <h4 style={{ marginTop: 10 }}>Quick links</h4>
            <ul>
              {onboard.links &&
                Object.entries(onboard.links).map(([k, v]: [string, any], i: number) => (
                  <li key={i}>
                    <a href={String(v)} target="_blank" rel="noreferrer">{k}</a>
                  </li>
                ))}
            </ul>

            <h4 style={{ marginTop: 10 }}>Next steps</h4>
            <ul>
              {onboard.next_steps?.map((s: any, i: number) => (
                <li key={i}>
                  <strong>{String(s.status).toUpperCase()}</strong> — {s.name}
                  {s.detail ? ` — ${s.detail}` : ''}
                </li>
              ))}
            </ul>

            <h4 style={{ marginTop: 10 }}>Preflight summary</h4>
            <div>{onboard.preflight?.summary}</div>
          </div>
        )}
      </section>
    </main>
  );
}
