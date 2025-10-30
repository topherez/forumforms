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
  const [selected, setSelected] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
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
    fetch(`/api/company-experiences?companyId=${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((json) => {
        setResolvedId(json.companyId);
        setExperiences(json.experiences || []);
        setSelected(null);
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
        className="w-full border rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-500"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="bg-indigo-600 text-white px-4 py-2 rounded" type="submit" disabled={loading}>
        {loading ? "Loading…" : "Continue"}
      </button>
      {error && <div className="text-xs text-red-600 self-center">{error}</div>}
    </form>
    {resolvedId && (
      <div className="mt-4 space-y-3">
        <div className="text-sm text-gray-700">Resolved company: <span className="font-mono text-gray-900">{resolvedId}</span></div>
        <ul className="space-y-2">
          {experiences.map((e) => (
            <li key={e.id} className="border p-3 rounded bg-white flex items-start gap-3 hover:shadow-sm">
              <input
                type="radio"
                name="exp"
                value={e.id}
                checked={selected === e.id}
                onChange={() => setSelected(e.id)}
                className="mt-1 h-4 w-4"
              />
              <div>
                <div className="text-sm font-semibold text-gray-900">{e.name || "Untitled experience"}</div>
                <div className="text-xs text-gray-600 font-mono">{e.id}</div>
              </div>
            </li>
          ))}
          {experiences.length === 0 && (
            <li className="text-sm text-gray-600">No experiences found for this company.</li>
          )}
        </ul>
        <div className="flex items-center gap-2">
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={!selected}
            onClick={async () => {
              setSaveMsg(null);
              if (!selected || !resolvedId) return;
              const res = await fetch("/api/bindings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyId: resolvedId, experienceId: selected }),
              });
              if (res.ok) {
                // Persist for member view in iframe (same origin), 30 days
                try {
                  if (resolvedId) document.cookie = `ff_company_id=${resolvedId}; path=/; max-age=${60 * 60 * 24 * 30}`;
                  if (selected) document.cookie = `ff_forum_exp_id=${selected}; path=/; max-age=${60 * 60 * 24 * 30}`;
                } catch {}
                setSaveMsg("Saved. View member feed below.");
              } else {
                let msg = "Failed to save binding; check DB connection and permissions.";
                try {
                  const j = await res.json();
                  if (j?.error) msg = `Failed to save: ${j.error}`;
                } catch {}
                setSaveMsg(msg);
              }
            }}
          >
            Save as forum experience
          </button>
          {saveMsg && <div className="text-xs text-gray-600">{saveMsg}</div>}
        </div>
        {selected && (
          <div className="pt-2">
            <a className="text-indigo-600 underline" href={`/experience/${selected}?companyId=${encodeURIComponent(resolvedId || "")}`}>Open member feed</a>
          </div>
        )}
      </div>
    )}
    </>
  );
}


