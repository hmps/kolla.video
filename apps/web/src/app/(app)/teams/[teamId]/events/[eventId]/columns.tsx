"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export type Clip = {
  id: number;
  status: string;
  tags?: Array<{ id: number; tag: string }>;
};

export const columns: ColumnDef<Clip>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const index = row.index;
      return <div className="font-medium">Clip #{index + 1}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant={
            status === "ready"
              ? "default"
              : status === "failed"
                ? "destructive"
                : "secondary"
          }
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.getValue("tags") as
        | Array<{ id: number; tag: string }>
        | undefined;
      if (!tags || tags.length === 0) {
        return <span className="text-muted-foreground text-sm">No tags</span>;
      }
      return (
        <div className="flex gap-1">
          {tags.map((t) => (
            <Badge key={t.id} variant="outline">
              {t.tag}
            </Badge>
          ))}
        </div>
      );
    },
  },
];
