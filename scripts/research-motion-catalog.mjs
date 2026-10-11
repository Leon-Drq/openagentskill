import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parse } from "parse5";

// Research only. Fetch public HTML; never execute source scripts or mirror media.
const root = "artifacts/motion-research";
await mkdir(root, { recursive: true });
const walk = (n, predicate) => [
  ...(predicate(n) ? [n] : []),
  ...(n.childNodes || []).flatMap((c) => walk(c, predicate)),
];
const attr = (n, name) => n.attrs?.find((a) => a.name === name)?.value || "";
const text = (n) =>
  n.nodeName === "#text" ? n.value : (n.childNodes || []).map(text).join(" ");
async function fetchPage(path) {
  const file = `${root}/${path.slice(1) || "index"}.html`;
  try {
    return await readFile(file, "utf8");
  } catch {}
  const response = await fetch(`https://prompt-motion.com${path}`, {
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  const html = await response.text();
  await writeFile(file, html);
  return html;
}
const index = parse(await fetchPage("/"));
const paths = [
  ...new Set(
    walk(index, (n) => n.tagName === "a")
      .map((n) => attr(n, "href"))
      .filter((h) => /^\/[\w-]+-[a-f\d]{6}$/.test(h)),
  ),
];
const entries = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < paths.length) {
      const path = paths[cursor++];
      const doc = parse(await fetchPage(path));
      const nodes = walk(doc, () => true);
      const title = text(nodes.find((n) => n.tagName === "h1") || {}).trim();
      const links = nodes
        .filter((n) => n.tagName === "a")
        .map((n) => ({ href: attr(n, "href"), text: text(n).trim() }));
      const tags = links.filter((l) => /\/(tag|category)|\?tag=/.test(l.href));
      const meta = nodes
        .filter((n) => n.tagName === "meta")
        .map((n) => ({
          name: attr(n, "name") || attr(n, "property"),
          content: attr(n, "content"),
        }));
      entries.push({
        id: path.slice(1),
        url: `https://prompt-motion.com${path}`,
        title,
        links,
        tags,
        meta,
        plainText: text(nodes.find((n) => n.tagName === "main") || doc)
          .replace(/\s+/g, " ")
          .trim(),
      });
      if (entries.length % 25 === 0)
        console.log(`Researched ${entries.length}/${paths.length}`);
    }
  }),
);
entries.sort((a, b) => paths.indexOf("/" + a.id) - paths.indexOf("/" + b.id));
await writeFile(
  `${root}/catalog.json`,
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      source: "https://prompt-motion.com/",
      entries,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    { total: entries.length, samples: entries.slice(0, 3) },
    null,
    2,
  ),
);
