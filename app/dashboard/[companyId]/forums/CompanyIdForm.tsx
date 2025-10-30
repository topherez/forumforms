"use client";

import { useEffect, useState } from "react";

function extractCompanyId(input: string): string | null {
  if (!input) return null;
  const match = input.match(/\b(biz_[A-Za-z0-9]+)\b/);
  return match ? match[1] : null;
}

export default function CompanyIdForm({ initial }: { initial?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const derivedId = extractCompanyId(value) || value;
  const isValid = Boolean(derivedId && derivedId.startsWith("biz_"));
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [experiences, setExperiences] = useState<Array<{ id: string; name?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError(null);
  }, [value]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = derivedId;
    if (!isValid) {
      setError("Please enter a valid company ID (biz_...) or dashboard URL.");
      return;
    }
    setLoading(true);
    fetch(`/api/company-forums?companyId=${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((json) => {
        setResolvedId(json.companyId);
        setExperiences(json.experiences || []);
      })
      .catch(() => setError("Unable to fetch forums for that company. Check permissions and ID."))
      .finally(() => setLoading(false));
  };

  return (
    <>
    <form className="flex gap-2" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Paste company URL or ID (biz_XXXXXXXX)"
        className="w-full border rounded px-3 py-2"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="bg-indigo-600 text-white px-4 py-2 rounded" type="submit" disabled={loading}>
        {loading ? "Loading…" : "Continue"}
      </button>
      {error && <div className="text-xs text-red-600 self-center">{error}</div>}
    </form>
    {resolvedId && (
      <div className="mt-4 space-y-2">
        <div className="text-xs text-gray-500">Resolved company: <span className="font-mono">{resolvedId}</span></div>
        <ul className="space-y-2">
          {experiences.map((e) => (
            <li key={e.id} className="border p-3 rounded bg-white flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{e.name || e.id}</div>
              </div>
              <a className="text-indigo-600 hover:underline" href={`/experience/${e.id}`}>Open forum</a>
            </li>
          ))}
          {experiences.length === 0 && (
            <li className="text-sm text-gray-500">No forums found for this company.</li>
          )}
        </ul>
      </div>
    )}
    </>
  );
}


