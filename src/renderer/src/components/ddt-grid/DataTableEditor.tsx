import { useState, useMemo } from 'react';
import { Plus, Trash2, Download, Upload, Table2 } from 'lucide-react';

interface DataTableEditorProps {
  dataTable: Record<string, any>[];
  onChange: (newDataTable: Record<string, any>[]) => void;
}

export function DataTableEditor({ dataTable = [], onChange }: DataTableEditorProps) {
  const [newColumnName, setNewColumnName] = useState('');

  // Extract all distinct column keys
  const columns = useMemo(() => {
    const keys = new Set<string>();
    dataTable.forEach((row) => {
      Object.keys(row || {}).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [dataTable]);

  const handleAddColumn = () => {
    const col = newColumnName.trim();
    if (!col || columns.includes(col)) return;

    const updated = dataTable.length === 0
      ? [{ [col]: '' }]
      : dataTable.map((row) => ({ ...row, [col]: '' }));

    onChange(updated);
    setNewColumnName('');
  };

  const handleDeleteColumn = (colName: string) => {
    const updated = dataTable.map((row) => {
      const copy = { ...row };
      delete copy[colName];
      return copy;
    });
    onChange(updated);
  };

  const handleAddRow = () => {
    const emptyRow: Record<string, any> = {};
    columns.forEach((c) => (emptyRow[c] = ''));
    onChange([...dataTable, emptyRow]);
  };

  const handleDeleteRow = (index: number) => {
    const updated = dataTable.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleCellChange = (rowIndex: number, colName: string, value: string) => {
    const updated = dataTable.map((row, i) => {
      if (i === rowIndex) {
        return { ...row, [colName]: value };
      }
      return row;
    });
    onChange(updated);
  };

  const handleExportCsv = () => {
    if (columns.length === 0) return;
    const header = columns.join(',');
    const rows = dataTable.map((r) =>
      columns.map((c) => `"${String(r[c] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'test-data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) return;

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const newRows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = cells[idx] || '';
        });
        newRows.push(row);
      }

      onChange(newRows);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-[#090e1a] border border-slate-800">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Table2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">Data-Driven Testing Grid (DDT)</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {dataTable.length} data rows
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Add Column Input */}
          <div className="flex items-center space-x-1">
            <input
              type="text"
              placeholder="New column name..."
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              className="px-2.5 py-1 text-xs bg-[#0f172a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-36"
            />
            <button
              type="button"
              onClick={handleAddColumn}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Add Col
            </button>
          </div>

          <label
            title="Import CSV"
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCsv}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={columns.length === 0}
            title="Export CSV"
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium disabled:opacity-40 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center space-x-1 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      {columns.length === 0 && dataTable.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
          <p>No data columns yet.</p>
          <p className="text-[11px] text-slate-600">
            Type a column name above (e.g. <code>username</code>, <code>password</code>) and click &quot;Add Col&quot; or import a CSV.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-[#0e1628] border-b border-slate-800 text-slate-400">
                <th className="w-12 px-3 py-2 text-center font-mono text-[10px]">#</th>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 font-mono font-medium">
                    <div className="flex items-center justify-between space-x-2">
                      <span className="text-emerald-400 font-semibold">{col}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(col)}
                        title={`Delete column "${col}"`}
                        className="p-0.5 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-12 px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dataTable.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2 text-center font-mono text-[10px] text-slate-500">
                    {rowIdx + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="px-2 py-1">
                      <input
                        type="text"
                        value={row[col] !== undefined ? String(row[col]) : ''}
                        onChange={(e) => handleCellChange(rowIdx, col, e.target.value)}
                        className="w-full px-2 py-1 bg-transparent hover:bg-slate-800/50 focus:bg-[#0f172a] rounded border border-transparent focus:border-emerald-500/50 text-slate-200 text-xs font-mono outline-none"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(rowIdx)}
                      title="Delete row"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
