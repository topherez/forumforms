"use client";

import { useState } from "react";

function extractCompanyId(input: string): string | null {
  if (!input) return null;
  const match = input.match(/\b(biz_[A-Za-z0-9]+)\b/);
  return match ? match[1] : null;
}

export default function CompanyIdForm({ initial }: { initial?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractCompanyId(value) || value;
    if (!id || !id.startsWith("biz_")) {
      setError("Please enter a valid company ID (biz_...) or dashboard URL.");
      return;
    }
    // Navigate to path segment so Whop can't strip query params
    window.location.href = `/dashboard/${id}/forums`;
  };

  return (
    <form className="flex gap-2" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Paste company URL or ID (biz_XXXXXXXX)"
        className="w-full border rounded px-3 py-2"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="bg-indigo-600 text-white px-4 py-2 rounded" type="submit">Continue</button>
      {error && <div className="text-xs text-red-600 self-center">{error}</div>}
    </form>
  );
}


