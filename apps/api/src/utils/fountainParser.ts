export interface ParsedScene {
    index: number;
    slug: string;
    body: string;
}

export function parseScene(rawText: string): ParsedScene[] {
    const lines = rawText.split(/\r?\n/);
    const scenes: ParsedScene[] = [];
    let current: ParsedScene | null = null;

    const slugRegex = /^(INT\.|EXT\.)/i;

    for (const line of lines) {
        if (slugRegex.test(line.trim())){
            if (current) scenes.push(current);

            current = { index: scenes.length, slug: line.trim(), body: "" };
        } else if(current) {
            current.body += line + "\n";
        }
    }

    if(current) scenes.push(current)

    return scenes;
}



