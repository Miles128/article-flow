"use client";

import { useEffect, useState } from "react";
import { contentApi } from "@/lib/api/client";
import { BookOpen, Loader2, RefreshCw } from "lucide-react";

interface PlaybookEntry {
  id: string;
  learnedAt: string;
  removedPhrases: string[];
  addedOralMarkers: string[];
  note: string;
  projectId?: string;
}

export function PlaybookPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [learnings, setLearnings] = useState<PlaybookEntry[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const resp = await contentApi.getPlaybookLearnings();
      setLearnings(resp.data.learnings || []);
    } catch {
      setLearnings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  return (
    <div className=" border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="wen-title flex items-center gap-2">
          <BookOpen size={16} className="text-amber-600" />
          改稿 Playbook
        </h3>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-amber-700 hover:underline"
        >
          {loading ? (
            <Loader2 className="inline animate-spin" size={12} />
          ) : (
            <RefreshCw size={12} className="inline" />
          )}
        </button>
      </div>
      <p className="text-[11px] text-ink-500 mb-3">
        保存草稿时自动从你的改稿中学习规律
      </p>

      {learnings.length === 0 ? (
        <p className="text-xs text-ink-400 text-center py-4">
          暂无学习记录，改稿并保存后会自动积累
        </p>
      ) : (
        <ul className="max-h-[min(24rem,calc(100vh-14rem))] overflow-y-auto space-y-2">
          {learnings.slice(0, 8).map((entry) => (
            <li
              key={entry.id}
              className="text-xs bg-surface-50/70 backdrop-blur-[3px] p-2 border border-amber-100"
            >
              <p className="text-ink-700">{entry.note}</p>
              {entry.removedPhrases?.length > 0 && (
                <p className="text-red-500 mt-1">
                  − {entry.removedPhrases.join("、")}
                </p>
              )}
              {entry.addedOralMarkers?.length > 0 && (
                <p className="text-green-600 mt-0.5">
                  + {entry.addedOralMarkers.join("、")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
