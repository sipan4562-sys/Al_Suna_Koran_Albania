/**
 * Teilt Markdown an Leerzeilen außerhalb von Codeblöcken in Blöcke. Beim
 * Streamen ändert sich so nur der letzte Block – alle vorherigen bleiben
 * memoisiert und werden nicht erneut geparst.
 */
export function splitMarkdownBlocks(markdown: string): string[] {
  const lines = markdown.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;

  const pushCurrent = () => {
    if (current.some((line) => line.trim() !== "")) blocks.push(current.join("\n"));
    current = [];
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) {
        fence = marker[0].repeat(marker.length);
      } else if (marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null;
      }
      current.push(line);
      continue;
    }
    if (fence === null && line.trim() === "") {
      // Tabellen und Listen bleiben zusammen, solange keine Leerzeile folgt.
      pushCurrent();
      continue;
    }
    current.push(line);
  }
  pushCurrent();
  return blocks;
}

/** Reinen Text aus React-Kindern ziehen (z. B. für den Kopieren-Button). */
export function nodeText(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in node) {
    return nodeText((node as { props?: { children?: unknown } }).props?.children);
  }
  return "";
}
