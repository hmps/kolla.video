"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PendingClip = {
  id: number;
  index: number;
  name: string | null;
  uploaderName: string | null;
  uploader?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  status: string;
  storageKey: string;
  hlsPrefix: string | null;
  createdAt: Date | string;
};

interface PendingClipsTableProps {
  data: PendingClip[];
  onApprove: (clipIds: number[]) => void;
  onReject: (clipId: number) => void;
  onRowClick: (clip: PendingClip) => void;
  selectedId?: number | null;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function PendingClipsTable({
  data,
  onApprove,
  onReject,
  onRowClick,
  selectedId,
  isApproving,
  isRejecting,
}: PendingClipsTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns: ColumnDef<PendingClip>[] = [
    {
      id: "select",
      size: 40,
      maxSize: 40,
      minSize: 40,
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Name",
      size: 200,
      cell: ({ row }) => {
        const clip = row.original;
        return (
          <div className="font-medium">
            {clip.name ?? `Clip #${clip.index}`}
            {clip.status === "processing" && (
              <span className="ml-2 text-xs text-amber-600">(Processing...)</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "uploader",
      header: "Uploaded by",
      size: 150,
      cell: ({ row }) => {
        const clip = row.original;
        const uploaderDisplay =
          clip.uploaderName ??
          (clip.uploader
            ? `${clip.uploader.firstName ?? ""} ${clip.uploader.lastName ?? ""}`.trim()
            : "Unknown");
        return <div className="text-muted-foreground">{uploaderDisplay}</div>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Uploaded",
      size: 150,
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground text-sm">
            {format(new Date(row.original.createdAt), "MMM d, h:mm a")}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      size: 180,
      cell: ({ row }) => {
        const clip = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onApprove([clip.id]);
              }}
              disabled={isApproving}
              className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReject(clip.id);
              }}
              disabled={isRejecting}
              className="h-7 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  const handleApproveSelected = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map((row) => row.original.id);
    onApprove(selectedIds);
    setRowSelection({});
  };

  const handleApproveAll = () => {
    const allIds = data.map((clip) => clip.id);
    onApprove(allIds);
    setRowSelection({});
  };

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedCount > 0
            ? `${selectedCount} clip${selectedCount > 1 ? "s" : ""} selected`
            : `${data.length} clip${data.length > 1 ? "s" : ""} pending approval`}
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Button
              size="sm"
              onClick={handleApproveSelected}
              disabled={isApproving}
              className="gap-1"
            >
              <CheckCircle className="h-4 w-4" />
              Approve Selected ({selectedCount})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleApproveAll}
            disabled={isApproving}
            className="gap-1"
          >
            <CheckCircle className="h-4 w-4" />
            Approve All
          </Button>
        </div>
      </div>
      <div className="rounded-md border max-h-[300px] overflow-y-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.column.columnDef.size
                        ? `${header.column.columnDef.size}px`
                        : "auto",
                      maxWidth: header.column.columnDef.maxSize
                        ? `${header.column.columnDef.maxSize}px`
                        : undefined,
                      minWidth: header.column.columnDef.minSize
                        ? `${header.column.columnDef.minSize}px`
                        : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick(row.original)}
                  className={`cursor-pointer ${row.original.id === selectedId ? "bg-accent" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        width: cell.column.columnDef.size
                          ? `${cell.column.columnDef.size}px`
                          : "auto",
                        maxWidth: cell.column.columnDef.maxSize
                          ? `${cell.column.columnDef.maxSize}px`
                          : undefined,
                        minWidth: cell.column.columnDef.minSize
                          ? `${cell.column.columnDef.minSize}px`
                          : undefined,
                      }}
                      onClick={(e) => {
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
                  No clips pending approval.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
