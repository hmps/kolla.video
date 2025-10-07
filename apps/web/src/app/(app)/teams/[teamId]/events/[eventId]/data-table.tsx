"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onDeleteSelected: (selectedIds: number[]) => void;
  onRowClick?: (row: TData) => void;
  selectedId?: number | null;
}

function DataTableInner<TData extends { id: number }, TValue>({
  columns,
  data,
  onDeleteSelected,
  onRowClick,
  selectedId,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    columnResizeMode: "onChange",
    state: {
      rowSelection,
    },
  });

  const handleDelete = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map((row) => row.original.id);
    onDeleteSelected(selectedIds);
    setRowSelection({});
  };

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-4">
      {selectedCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedCount} clip{selectedCount > 1 ? "s" : ""} selected
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      )}
      <div className="rounded-md border max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={
                        header.column.columnDef.maxSize
                          ? `w-[${header.column.columnDef.size}px] max-w-[${header.column.columnDef.maxSize}px]`
                          : ""
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={`${onRowClick ? "cursor-pointer" : ""} ${row.original.id === selectedId ? "bg-accent" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.columnDef.maxSize
                          ? `w-[${cell.column.columnDef.size}px] max-w-[${cell.column.columnDef.maxSize}px]`
                          : ""
                      }
                      onClick={(e) => {
                        // Don't trigger row click when clicking checkbox
                        if (cell.column.id === "select") {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No clips yet. Upload some to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export const DataTable = memo(
  DataTableInner,
  (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
      prevProps.data === nextProps.data &&
      prevProps.columns === nextProps.columns &&
      prevProps.selectedId === nextProps.selectedId &&
      prevProps.onDeleteSelected === nextProps.onDeleteSelected &&
      prevProps.onRowClick === nextProps.onRowClick
    );
  },
) as typeof DataTableInner;
