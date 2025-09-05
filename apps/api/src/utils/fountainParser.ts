export interface ParsedScene {
    index: number;
    slugRaw: string;
    intExt?: string;
    location?: string;
    timeOfDay?: string;
    body: string;
}

// allow composite times like "NIGHT / LATER" or "DAY/NIGHT"
const TIME_SINGLE = `DAY|NIGHT|DUSK|DAWN|MORNING|EVENING|SUNSET|SUNRISE|CONTINUOUS|LATER|MOMENTS LATER|AFTERNOON|NOON|MIDNIGHT`;
const TIME_COMPOSITE = `(?:${TIME_SINGLE})(?:\\s*\\/\\s*(?:${TIME_SINGLE}))*`; // NIGHT / LATER / ...
const DASH = `[-–—]`;
const INTEXT = `(?:INT\\.?|EXT\\.?|INT\\/?EXT\\.?|INT\\.?\\/?EXT\\.?)`;

const slugRegex = new RegExp(
  `^\\s*(${INTEXT})\\s+(.+?)(?:\\s*${DASH}\\s*(${TIME_COMPOSITE}))?\\s*$`,
  "i"
);

function cleanupLocation(loc: string) {
  let s = loc.trim().replace(/\s{2,}/g, " ");
  s = s.replace(new RegExp(`^${INTEXT}\\s+`, "i"), "");
  // strip trailing " - TIME[/TIME...]"
  s = s.replace(new RegExp(`\\s*${DASH}\\s*${TIME_COMPOSITE}$`, "i"), "");
  return s.trim();
}

function normalizeHyphens(s: string) {
    return s.replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
  }
  function stripLeadingArticle(s: string) {
    return s.replace(/^(THE|A|AN)\s+/i, "").trim();
  }

  export function parseScenes(rawText: string) {
    const lines = rawText.split(/\r?\n/);
    const out: any[] = [];
    let cur: any = null;
  
    for (const raw of lines) {
      const line = raw.trim();
      const m = slugRegex.exec(line.replace(/\t/g, " ").replace(/\s+/g, " "));
      if (m) {
        if (cur) out.push(cur);
        const intExt = m[1]?.replace(/\.$/, "").toUpperCase();
        const time = m[3]?.toUpperCase().replace(/\s*\/\s*/g, " / ");
        const loc = m[2] ? stripLeadingArticle(normalizeHyphens(cleanupLocation(m[2]))) : undefined;
        cur = { index: out.length, slugRaw: line, intExt, location: loc, timeOfDay: time, body: "" };
      } else if (cur) {
        cur.body += raw + "\n";
      }
    }
    if (cur) out.push(cur);
    return out;
  }



