import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

interface Props {
  exportPath: string;      // e.g. "/csv/products/export"
  importPath?: string;     // e.g. "/csv/products/import"
  downloadFilename: string;
  onImported?: () => void;
}

/** Triggers a browser download of the CSV returned by GET exportPath,
 * and (if importPath is given) lets the user pick a .csv file to POST
 * as raw text to importPath. Row-level import errors from the backend
 * are shown in full - nothing is silently dropped. */
export default function CsvToolbar({ exportPath, importPath, downloadFilename, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importErrors, setImportErrors] = useState<{ row: number; errors: string[] }[] | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    const res = await api.get(exportPath, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !importPath) return;
    setBusy(true);
    setImportErrors(null);
    setImportMessage(null);
    try {
      const text = await file.text();
      const res = await api.post(importPath, text, { headers: { "Content-Type": "text/csv" } });
      setImportMessage(`Imported ${res.data.importedCount} row(s) successfully.`);
      onImported?.();
    } catch (err: any) {
      if (err.response?.data?.rowErrors) {
        setImportErrors(err.response.data.rowErrors);
      } else {
        setImportMessage(getApiErrorMessage(err));
      }
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download size={15} /> Export CSV
        </button>
        {importPath && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <Upload size={15} /> {busy ? "Importing..." : "Import CSV"}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChosen} className="hidden" />
          </>
        )}
      </div>

      {importMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {importMessage}
        </p>
      )}
      {importErrors && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-h-40 overflow-y-auto">
          <p className="font-semibold mb-1">
            No rows were imported — fix these and try again:
          </p>
          <ul className="space-y-0.5">
            {importErrors.map((e) => (
              <li key={e.row}>Row {e.row}: {e.errors.join("; ")}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
