'use client';
import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'dark';
    setDark(stored === 'dark');
    document.documentElement.classList.toggle('dark', stored === 'dark');
  }, []);

  function onChange(v: boolean) {
    setDark(v);
    const theme = v ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', v);
  }

  return (
    <div className="flex items-center gap-2">
      <Switch id="theme" checked={dark} onCheckedChange={onChange} />
      <Label htmlFor="theme" className="text-sm">Dark</Label>
    </div>
  );
}
