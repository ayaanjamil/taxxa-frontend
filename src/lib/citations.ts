import type { Source } from '@/mock-data/answers';

// Chunk-IDs in this corpus contain `#chunk` or underscores and are long.
// Tight regex keeps "[note]" / "[1]" / "[a]" from being treated as citations.
const CITE_RE = /\[([^\]\n]{6,})\]/g;

function looksLikeCiteId(s: string): boolean {
  if (s.length < 6) return false;
  if (/^\d+$/.test(s)) return false;
  return s.includes('#chunk') || /_/.test(s);
}

export interface CiteInfo {
  /** The raw chunk_id the model emitted. */
  id: string;
  /** 1-based footnote number, assigned in order of first appearance in the text. */
  index: number;
  /** The source row this chunk's parent maps to, or null if no source claims it. */
  source: Source | null;
}

export interface CiteIndex {
  byId: Map<string, CiteInfo>;
  list: CiteInfo[];
  /** Reverse lookup: for a given source's parentId, which footnote numbers cite it. */
  bySourceParentId: Map<string, CiteInfo[]>;
}

/**
 * Walk the raw answer text in order and assign each unique chunk_id a footnote number.
 * The order is stable across re-renders for any prefix of the same text, so streaming
 * tokens never shuffle the numbering.
 */
export function buildCiteIndex(raw: string, sources: Source[]): CiteIndex {
  const chunkToSource = new Map<string, Source>();
  for (const s of sources) {
    for (const cid of s.chunkIds ?? []) {
      if (!chunkToSource.has(cid)) chunkToSource.set(cid, s);
    }
  }

  const byId = new Map<string, CiteInfo>();
  const list: CiteInfo[] = [];

  let m: RegExpExecArray | null;
  CITE_RE.lastIndex = 0;
  while ((m = CITE_RE.exec(raw)) !== null) {
    const id = m[1];
    if (!looksLikeCiteId(id)) continue;
    if (byId.has(id)) continue;
    const info: CiteInfo = {
      id,
      index: list.length + 1,
      source: chunkToSource.get(id) ?? null,
    };
    byId.set(id, info);
    list.push(info);
  }

  const bySourceParentId = new Map<string, CiteInfo[]>();
  for (const info of list) {
    if (!info.source) continue;
    const pid = info.source.parentId;
    const arr = bySourceParentId.get(pid);
    if (arr) arr.push(info);
    else bySourceParentId.set(pid, [info]);
  }

  return { byId, list, bySourceParentId };
}

export { looksLikeCiteId };
