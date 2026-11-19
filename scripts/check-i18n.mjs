// Verifies literal translation keys used in src/ exist in every messages/*.json, and that catalogs share keys.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalogs = Object.fromEntries(readdirSync(path.join(root, "messages")).map((f) => [f, JSON.parse(readFileSync(path.join(root, "messages", f), "utf8"))]));
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const has = (cat, key) => key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), cat) !== undefined;

const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = path.join(d, f); if (statSync(p).isDirectory()) { if (!p.includes("generated")) walk(p); } else if (/\.tsx?$/.test(f)) files.push(p); });
walk(path.join(root, "src"));

let missing = 0;
for (const file of files) {
  const src = readFileSync(file, "utf8");
  const ns = {}; // var -> Set of namespaces (same var name can be reused in different functions)
  const add = (v, n) => (ns[v] ??= new Set()).add(n);
  for (const m of src.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\((?:"([\w.]*)")?\)/g)) add(m[1], m[2] ?? "");
  for (const m of src.matchAll(/const \[([^\]]+)\] = await Promise\.all\(\[([^;]+?)\]\)/gs)) {
    const names = m[1].split(",").map((s) => s.trim().replace(/[{}]/g, "").split(":").pop().trim());
    const calls = [...m[2].matchAll(/(getTranslations\((?:"([\w.]*)")?\)|[\w.]+\([^()]*(?:\([^()]*\))?[^()]*\))/g)].map((c) => (c[1].startsWith("getTranslations") ? (c[2] ?? "") : null));
    names.forEach((n, i) => { if (calls[i] !== null && calls[i] !== undefined) add(n, calls[i]); });
  }
  for (const [v, set] of Object.entries(ns)) {
    for (const m of src.matchAll(new RegExp(`\\b${v}\\(\\s*"([^"]+)"`, "g"))) {
      const keys = [...set].map((n) => (n ? `${n}.${m[1]}` : m[1]));
      for (const [f, cat] of Object.entries(catalogs)) if (!keys.some((k) => has(cat, k))) { missing++; console.log(`${f}: missing ${keys.join(" | ")}  (${path.relative(root, file)})`); }
    }
  }
}
const [a, b] = Object.entries(catalogs);
const ka = new Set(flat(a[1])), kb = new Set(flat(b[1]));
for (const k of ka) if (!kb.has(k)) { missing++; console.log(`${b[0]}: missing ${k} (present in ${a[0]})`); }
for (const k of kb) if (!ka.has(k)) { missing++; console.log(`${a[0]}: missing ${k} (present in ${b[0]})`); }
if (missing) { console.error(`${missing} problem(s)`); process.exit(1); }
console.log(`i18n OK (${files.length} files, ${ka.size} keys)`);
