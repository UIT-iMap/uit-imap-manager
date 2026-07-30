import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import {
  Search,
  Trash2,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTab } from "../../contexts/tabContext";
import { useData } from "../../contexts/dataContext";
import { useUser } from "../../contexts/userContext";
import type { TableRule, DataId } from "../../lib/types";
import EditCellDialog from "../ui/EditCellDialog";

function formatCellValue(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(" ");
  if (typeof value === "object") return JSON.stringify(value);
  // if (typeof value === "boolean") return value ? "true" : "No";
  return String(value);
}

export default function Table() {
  const { tab } = useTab();
  const data = useData();
  const { user } = useUser();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [editing, setEditing] = useState<{
    attribute: string;
    rowIdx: number;
  } | null>(null);

  const isDataTab = tab !== "model" && tab !== "floorPreview";
  const slice = isDataTab ? data[tab as DataId] : null;

  const rules: TableRule[] = useMemo(() => {
    return (slice?.tableRules ?? []).filter((r: TableRule) => r.isShow !== false);
  }, [slice]);

  const rows: any[] = slice?.data ?? [];

  const columnHelper = createColumnHelper<any>();
  const columns = useMemo(() => {
    return rules.map((rule) =>
      columnHelper.accessor((row) => row[rule.name], {
        id: rule.name,
        enableSorting: rule.allowSort !== false,
        header: () => (
          <span className="inline-flex items-center gap-0.5">
            {rule.label ?? rule.name}
            {rule.isMandatory !== false && (
              <span className="text-rose-400">*</span>
            )}
          </span>
        ),
        cell: (info) => (
          <span
            className="block truncate"
            title={formatCellValue(info.getValue())}
          >
            {formatCellValue(info.getValue())}
          </span>
        ),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue).toLowerCase();
      return rules.some((rule) =>
        formatCellValue(row.original[rule.name]).toLowerCase().includes(needle),
      );
    },
  });

  if (tab === "model" || tab === "floorPreview") return <></>;

  const handleRemove = (rowIdx: number) => {
    if (!slice?.removeRow) return;
    if (confirm("Remove this row?")) slice.removeRow(rowIdx);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-2">
        <div className="relative w-64 max-w-full">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-sky-400"
          />
        </div>
        <span className="text-xs text-slate-400">
          {table.getFilteredRowModel().rows.length} row(s)
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr>
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={`truncate border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold tracking-wide text-slate-600 ${
                    header.column.getCanSort()
                      ? "cursor-pointer select-none hover:text-slate-900"
                      : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {header.column.getCanSort() &&
                      (header.column.getIsSorted() === "asc" ? (
                        <ChevronUp size={12} />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronsUpDown size={12} className="opacity-30" />
                      ))}
                  </span>
                </th>
              ))}
              <th className="w-24 border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold tracking-wide text-slate-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const originalIdx = rows.indexOf(row.original);
              return (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 hover:bg-sky-50/40"
                >
                  {row.getVisibleCells().map((cell) => {
                    const rule = rules.find((r) => r.name === cell.column.id);
                    const isEditable = rule?.editable !== false;
                    return (
                      <td
                        key={cell.id}
                        onDoubleClick={() => {
                          if (!isEditable) return;
                          setEditing({
                            attribute: cell.column.id,
                            rowIdx: originalIdx,
                          });
                        }}
                        className={`select-none truncate px-3 py-2 text-slate-700 ${
                          isEditable ? "cursor-pointer" : "cursor-not-allowed"
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleRemove(originalIdx)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-500 transition-all hover:bg-rose-50 hover:scale-95 active:scale-90"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={rules.length + 1}
                  className="px-3 py-10 text-center text-sm text-slate-400"
                >
                  Not found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {slice && (
        <EditCellDialog
          dataId={tab as any}
          attribute={editing?.attribute ?? null}
          rowIdx={editing?.rowIdx ?? null}
          onClose={() => setEditing(null)}
        />
      )}
      {/* user is read here to keep the "by" attribution consistent with edits made from this table */}
      <span className="hidden">{user?.name}</span>
    </div>
  );
}
