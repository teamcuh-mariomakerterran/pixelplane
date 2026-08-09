export type GuideCategory =
  | "pixel-art"
  | "pipeline"
  | "systems"
  | "procgen"
  | "multiplayer"
  | "general";

export type GuideMeta = {
  id: string;
  title: string;
  category: GuideCategory;
  format: string;
  file: string;
  source: string;
  summary: string;
  chars?: number;
};

export type GuidesManifest = {
  version: number;
  name: string;
  description: string;
  count: number;
  guides: GuideMeta[];
};

export const GUIDE_CATEGORIES: { id: GuideCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pixel-art", label: "Pixel art" },
  { id: "pipeline", label: "Pipeline" },
  { id: "systems", label: "Systems" },
  { id: "procgen", label: "Procgen" },
  { id: "multiplayer", label: "Multiplayer" },
  { id: "general", label: "General" },
];

let cache: GuidesManifest | null = null;

export async function loadGuidesManifest(): Promise<GuidesManifest> {
  if (cache) return cache;
  const res = await fetch("/guides/manifest.json");
  if (!res.ok) throw new Error("Guides manifest missing");
  cache = (await res.json()) as GuidesManifest;
  return cache;
}

export async function loadGuideMarkdown(file: string): Promise<string> {
  const res = await fetch(`/guides/${file}`);
  if (!res.ok) throw new Error(`Guide not found: ${file}`);
  return res.text();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Tiny markdown to safe HTML for guide reader */
export function mdToSafeHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inTable = false;
  let inList = false;
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    out.push("<p>" + inline(para.join(" ")) + "</p>");
    para = [];
  };
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      out.push("</tbody></table>");
      inTable = false;
    }
  };

  const inline = (s: string) => {
    let t = escapeHtml(s);
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    return t;
  };

  for (const raw of lines) {
    const trimmed = raw.trimEnd().trim();
    if (!trimmed) {
      flushPara();
      closeList();
      continue;
    }

    if (trimmed.startsWith("|")) {
      flushPara();
      closeList();
      if (trimmed.includes("---")) {
        continue;
      }
      const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
      if (!inTable) {
        out.push('<table class="g-table"><thead><tr>');
        for (const c of cells) out.push("<th>" + inline(c) + "</th>");
        out.push("</tr></thead><tbody>");
        inTable = true;
        continue;
      }
      out.push("<tr>");
      for (const c of cells) out.push("<td>" + inline(c) + "</td>");
      out.push("</tr>");
      continue;
    }
    closeTable();

    if (trimmed.startsWith("### ")) {
      flushPara();
      closeList();
      out.push("<h3>" + inline(trimmed.slice(4)) + "</h3>");
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushPara();
      closeList();
      out.push("<h2>" + inline(trimmed.slice(3)) + "</h2>");
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushPara();
      closeList();
      out.push("<h1>" + inline(trimmed.slice(2)) + "</h1>");
      continue;
    }
    if (/^[-*] /.test(trimmed)) {
      flushPara();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push("<li>" + inline(trimmed.slice(2)) + "</li>");
      continue;
    }

    closeList();
    para.push(trimmed);
  }
  flushPara();
  closeList();
  closeTable();
  return out.join("\n");
}
