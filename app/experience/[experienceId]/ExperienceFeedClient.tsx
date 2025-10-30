"use client";

import { useEffect, useMemo, useState } from "react";

function extractExpId(input?: string | null): string | null {
  if (!input) return null;
  const m = input.match(/(exp_[A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

export default function ExperienceFeedClient({
  initialExperienceId,
  initialCompanyId,
}: {
  initialExperienceId?: string | null;
  initialCompanyId?: string | null;
}) {
  const [experienceId, setExperienceId] = useState<string | null>(initialExperienceId ?? null);
  const [posts, setPosts] = useState<any[]>([]);
  const [pageInfo, setPageInfo] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [referrer, setReferrer] = useState<string>("");

  // Resolve experience id on the client if missing
  useEffect(() => {
    setReferrer(typeof document !== "undefined" ? document.referrer : "");
    if (experienceId) return;
    const fromRef = (typeof document !== "undefined" && extractExpId(document.referrer)) ||
      (typeof window !== "undefined" && extractExpId(window.location.href)) || null;
    if (fromRef) {
      setExperienceId(fromRef);
      return;
    }
    // If we still don't have it but have company id, try DB binding in a client call
    const cid = initialCompanyId || null;
    if (cid) {
      fetch(`/api/bindings?companyId=${encodeURIComponent(cid)}`)
        .then((r) => r.json())
        .then((j) => {
          const bound = j?.bindings?.[0]?.forumId as string | undefined;
          if (bound?.startsWith("exp_")) setExperienceId(bound);
        })
        .catch(() => {});
    }
  }, [experienceId, initialCompanyId]);

  // Fetch posts once we have an experience id
  useEffect(() => {
    if (!experienceId) return;
    setError(null);
    fetch(`/api/forum?experienceId=${encodeURIComponent(experienceId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((j) => {
        setPosts(j?.posts ?? []);
        setPageInfo(j?.pageInfo ?? null);
      })
      .catch(() => setError("Unable to load posts for this experience."));
  }, [experienceId]);

  if (!experienceId) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600">Select an experience to view its forum.</div>
        <div className="text-sm text-gray-500">No experiences found in this context.</div>
        <details className="text-xs text-gray-500">
          <summary>Debug</summary>
          <div>referrer: {referrer || "(none)"}</div>
          <div>companyId: {initialCompanyId || "(none)"}</div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.id} className="border p-3 rounded bg-white">
            <h2 className="text-xl font-semibold">{post.title}</h2>
            {post.content ? (
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">{post.content}</p>
            ) : null}
            <div className="text-sm text-gray-500 mt-3">
              By {post.user?.name || post.user?.username || "Unknown"}
              {typeof post.like_count === "number" ? ` • ${post.like_count} likes` : ""}
              {typeof post.comment_count === "number" ? ` • ${post.comment_count} comments` : ""}
            </div>
          </li>
        ))}
        {posts.length === 0 && (
          <li className="text-sm text-gray-500">No forum posts yet.</li>
        )}
      </ul>
      {pageInfo?.has_next_page && (
        <div className="pt-4 text-center text-base text-gray-600">More posts available…</div>
      )}
    </div>
  );
}


