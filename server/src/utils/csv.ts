/**
 * Small dependency-free CSV parser/writer. Handles quoted fields
 * (commas/newlines/quotes inside quotes) which covers real invoice/product
 * data reasonably well without pulling in an extra package.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  // last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // drop fully-empty trailing rows (common from trailing newlines)
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

/** Parses CSV text with a header row into an array of plain objects,
 * using the header row's values as keys. */
export function parseCsvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;
  const cleanHeader = header.map((h) => h.trim());
  return dataRows.map((row) => {
    const obj: Record<string, string> = {};
    cleanHeader.forEach((key, idx) => {
      obj[key] = (row[idx] ?? "").trim();
    });
    return obj;
  });
}

function escapeCsvField(value: unknown): string {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Builds CSV text from an array of objects, given an explicit column order. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(escapeCsvField).join(",");
  const body = rows
    .map((row) => columns.map((col) => escapeCsvField(row[col])).join(","))
    .join("\n");
  return rows.length > 0 ? `${header}\n${body}\n` : `${header}\n`;
}
