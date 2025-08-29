'use client';

import { useState, FormEvent } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  Card, CardHeader, CardTitle, CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import ThemeToggle from '@/components/theme-toggle';
import {
  Search, Loader2, Rocket, Wrench, BookOpen, GitCommit, PlugZap, Link as LinkIcon,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000');

type Citation = { source: string; file: string; start_line: number; end_line: number; url?: string };
type ExplainAnswer = { summary: string; bullets: string[]; citations: Citation[] } | null;

/** Inline code preview for a citation */
function CodePreview({ file, start, end }:{file:string; start:number; end:number}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function toggle() {
    if (!open && !code) {
      setLoading(true);
      try {
        const params = new URLSearchParams({ file, start: String(start), end: String(end) });
        const res = await fetch(`${API_BASE}/snippet?` + params.toString());
        setCode(await res.text());
      } finally { setLoading(false); }
    }
    setOpen(!open);
  }
  return (
    <div className="inline-block">
      <Button size="sm" variant="outline" className="h-7 px-2" onClick={toggle}>
        {open ? 'Hide' : 'Preview'}
      </Button>
      {open && (
        <div className="mt-2 rounded-md border bg-neutral-50 dark:bg-neutral-900 overflow-auto max-h-72">
          <pre className="text-xs p-3 leading-relaxed">
            <code>{loading ? 'Loading…' : (code ?? '(no content)')}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { data } = useSWR(`${API_BASE}/health`, fetcher);

  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<ExplainAnswer>(null);

  const [preflight, setPreflight] = useState<any>(null);
  const [digest, setDigest] = useState<any>(null);
  const [onboard, setOnboard] = useState<any>(null);
  const [path, setPath] = useState('/app/src/demo_repo');
  const [days, setDays] = useState(30);
  const [indexFlag, setIndexFlag] = useState(false);
  const [loadingPreflight, setLoadingPreflight] = useState(false);
  const [loadingOnboard, setLoadingOnboard] = useState(false);

  async function onAsk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const qInput = form.elements.namedItem('q') as HTMLInputElement;
    const q = qInput?.value ?? '';
    if (!q.trim()) return;

    setAskLoading(true);
    setAskError(null);
    setAnswer(null);
    try {
      const res = await fetch(`${API_BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.detail || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setAnswer(json);
    } catch (err: any) {
      setAskError(err?.message || 'Something went wrong');
    } finally {
      setAskLoading(false);
    }
  }

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
    toast.success('Preflight complete', { description: json.summary });
  }

  async function indexFolder() {
    const res = await fetch(`${API_BASE}/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const json = await res.json();
    toast.success('Indexed', { description: `Chunks: ${json.chunks_indexed}` });
  }

  async function runDigest() {
    const res = await fetch(`${API_BASE}/change-digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, days }),
    });
    const json = await res.json();
    setDigest(json);
    toast('Change digest ready', { description: `Since ${json.since}` });
  }

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
    toast.success('Onboarding plan created', { description: json.preflight?.summary });
  }

  return (
    <div className="relative min-h-screen bg-radial-fade">
      <header className="sticky top-0 z-10 backdrop-blur border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/60 dark:bg-black/40">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">RepoGuide</span>
            <Badge variant="secondary" className="ml-2">Onboarding</Badge>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Badge variant={data?.status === 'ok' ? 'default' : 'destructive'}>
              API: {data ? data.status : '…'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl py-8">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-3xl font-bold tracking-tight"
        >
          Onboard faster with context-aware answers.
        </motion.h1>

        <Separator className="my-6" />

        <Tabs defaultValue="explain" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="explain" className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Explain
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Repo Tools
            </TabsTrigger>
          </TabsList>

          {/* Explain */}
          <TabsContent value="explain" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Ask about this codebase
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={onAsk} className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <Input name="q" placeholder="How do I bring the system up?" className="pl-9" disabled={askLoading} />
                  </div>
                  <Button type="submit" disabled={askLoading}>
                    {askLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Ask
                  </Button>
                </form>

                {askError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                    {askError}
                  </div>
                )}

                {answer && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-md border bg-white dark:bg-neutral-900"
                  >
                    <div className="p-4">
                      <div className="mb-2 font-medium">Summary</div>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">{answer.summary}</p>
                    </div>
                    <Separator />
                    {!!answer.bullets?.length && (
                      <div className="p-4">
                        <div className="mb-2 font-medium">Steps</div>
                        <ul className="list-disc pl-5 space-y-1">
                          {answer.bullets.map((b, i) => (
                            <li key={i} className="text-sm">{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!!answer.citations?.length && (
                      <>
                        <Separator />
                        <div className="p-4">
                          <div className="mb-2 font-medium">Citations</div>
                          <ul className="space-y-2">
                            {answer.citations.map((c, i) => (
                              <li key={i} className="text-sm flex items-center gap-2 flex-wrap">
                                <LinkIcon className="h-3.5 w-3.5 text-neutral-500" />
                                <code className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">
                                  {c.file} ({c.start_line}–{c.end_line})
                                </code>
                                {c.url && (
                                  <a className="underline text-blue-600" href={c.url} target="_blank" rel="noreferrer">open</a>
                                )}
                                <CodePreview file={c.file} start={c.start_line} end={c.end_line} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Repo Tools */}
          <TabsContent value="tools" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" /> Repo utilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <div>
                    <Label htmlFor="repo-path">Path</Label>
                    <Input id="repo-path" value={path} onChange={(e) => setPath(e.target.value)} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={runPreflight} disabled={loadingPreflight}>
                      {loadingPreflight && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Run Preflight
                    </Button>
                    <Button variant="secondary" onClick={indexFolder}>
                      <Rocket className="mr-2 h-4 w-4" />
                      Index folder
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto] items-end">
                  <div>
                    <Label htmlFor="days">Digest window (days)</Label>
                    <Input id="days" type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value || 30))} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={indexFlag} onCheckedChange={setIndexFlag} id="index-switch" />
                    <Label htmlFor="index-switch">Index as part of onboarding</Label>
                  </div>
                  <div className="justify-self-end">
                    <Button onClick={runOnboard} disabled={loadingOnboard}>
                      {loadingOnboard && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Onboard me
                    </Button>
                  </div>
                </div>

                {preflight && (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Preflight</div>
                      <Badge variant="outline">{preflight.summary}</Badge>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {preflight.checks?.map((c: any, i: number) => (
                        <li key={i} className="text-sm">
                          <Badge variant={c.status === 'ok' ? 'default' : c.status === 'warn' ? 'secondary' : 'destructive'}>
                            {String(c.status).toUpperCase()}
                          </Badge>
                          <span className="ml-2">{c.name}</span>
                          {c.fix ? <span className="text-neutral-500 ml-2">• {c.fix}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {digest && (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <GitCommit className="h-4 w-4" /> Change Digest
                    </div>
                    <div className="text-sm mt-1">Since: {digest.since} · Commits: {digest.commit_count}</div>
                    {digest.note ? <div className="text-xs text-neutral-500 mt-1">{digest.note}</div> : null}
                    {!!digest.top_files?.length && (
                      <>
                        <Separator className="my-3" />
                        <div className="text-sm font-medium mb-1">Top files</div>
                        <ul className="text-sm space-y-1">
                          {digest.top_files.map((f: any, i: number) => (
                            <li key={i}>{f.file}
                              {f.count != null ? ` — ${f.count} change(s)` : ''}
                              {f.modified_at ? ` — ${new Date(f.modified_at).toLocaleString()}` : ''}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                {onboard && (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <Rocket className="h-4 w-4" /> Onboarding Plan
                    </div>
                    <div className="text-sm mt-1">Path: {onboard.path}</div>
                    <div className="text-sm">Chunks indexed: {onboard.chunks_indexed}</div>
                    <Separator className="my-3" />
                    <div className="text-sm font-medium mb-1">Quick links</div>
                    <ul className="text-sm space-y-1">
                      {onboard.links && Object.entries(onboard.links).map(([k, v]: any, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <LinkIcon className="h-3.5 w-3.5 text-neutral-500" />
                          <a className="underline text-blue-600" href={String(v)} target="_blank" rel="noreferrer">{k}</a>
                        </li>
                      ))}
                    </ul>
                    {!!onboard.next_steps?.length && (
                      <>
                        <Separator className="my-3" />
                        <div className="text-sm font-medium mb-1">Next steps</div>
                        <ul className="text-sm space-y-1">
                          {onboard.next_steps.map((s: any, i: number) => (
                            <li key={i}>
                              <Badge variant={s.status === 'done' ? 'default' : 'secondary'}>
                                {String(s.status).toUpperCase()}
                              </Badge>
                              <span className="ml-2">{s.name}</span>
                              {s.detail ? <span className="text-neutral-500 ml-2">— {s.detail}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
