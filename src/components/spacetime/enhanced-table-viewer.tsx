import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/store/hooks";
import { selectTableData } from "@/store/spacetime-slice";
import {
  Download,
  Search,
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  CheckCircle,
  Expand,
  Table as TableIcon,
  Grid,
  BarChart3,
  Columns,
  Filter,
  Calendar,
  Clock,
  List,
} from "lucide-react";
import { deserializeFromRedux } from "@/utils/serialization";
import { TableMetadata } from "@/types/spacetime";

interface EnhancedTableViewerProps {
  tableMetadata: TableMetadata;
}

interface ExpandableCellProps {
  value: any;
  field: any;
  isVerticalView?: boolean;
}

type ViewMode = "table" | "grid";

const TableStats = ({ data }: { data: any[] }) => {
  const stats = useMemo(() => {
    if (!data?.length) return null;

    const totalRows = data.length;
    const columns = Object.keys(data[0] || {});
    const nullValues = columns.reduce((acc, col) => {
      acc[col] = data.filter((row) => row[col] == null).length;
      return acc;
    }, {} as Record<string, number>);

    return { totalRows, columns, nullValues };
  }, [data]);

  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border"
    >
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {stats.totalRows.toLocaleString()}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total Rows
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {stats.columns.length}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Columns</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {Math.round(
            (Object.values(stats.nullValues).reduce((a, b) => a + b, 0) /
              (stats.totalRows * stats.columns.length)) *
              100
          )}
          %
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Data Completeness
        </div>
      </div>
    </motion.div>
  );
};

const ColumnVisibilityControl = ({
  table,
  tableMetadata,
}: {
  table: any;
  tableMetadata: TableMetadata;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {tableMetadata.fields.map((field) => {
          const column = table.getColumn(field.name);
          const isVisible = column?.getIsVisible() ?? true;

          return (
            <DropdownMenuItem
              key={field.name}
              className="flex items-center justify-between cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                column?.toggleVisibility(!isVisible);
              }}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => {
                    e.stopPropagation();
                    column?.toggleVisibility(e.target.checked);
                  }}
                  className="rounded"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm">{field.displayName}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {field.type}
              </Badge>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ViewModeToggle = ({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) => {
  const modes = [
    { id: "table" as const, icon: TableIcon, label: "Table" },
    { id: "grid" as const, icon: Grid, label: "Grid" },
  ];

  return (
    <div className="flex items-center border rounded-lg bg-gray-50 dark:bg-gray-800 p-1">
      {modes.map(({ id, icon: Icon, label }) => (
        <Button
          key={id}
          variant={mode === id ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(id)}
          className="h-8 px-3"
        >
          <Icon className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
};

const ExpandableCell: React.FC<ExpandableCellProps> = ({
  value,
  field,
  isVerticalView = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatTimestamp = (
    timestampValue: any
  ): { formatted: string; iso: string; isValid: boolean } => {
    try {
      let date: Date;

      // Handle ISO string (from our serialization)
      if (typeof timestampValue === "string") {
        date = new Date(timestampValue);
      }
      // Handle raw timestamp object (fallback)
      else if (timestampValue?.__timestamp_micros_since_unix_epoch__) {
        const micros = Number(
          timestampValue.__timestamp_micros_since_unix_epoch__
        );
        const milliseconds = Math.floor(micros / 1000);
        date = new Date(milliseconds);
      }
      // Handle direct number
      else if (typeof timestampValue === "number") {
        const milliseconds = Math.floor(timestampValue / 1000);
        date = new Date(milliseconds);
      } else {
        return {
          formatted: "Invalid Date",
          iso: "Invalid Date",
          isValid: false,
        };
      }

      if (isNaN(date.getTime())) {
        return {
          formatted: "Invalid Date",
          iso: "Invalid Date",
          isValid: false,
        };
      }

      return {
        formatted: date.toLocaleDateString() + " " + date.toLocaleTimeString(),
        iso: date.toISOString(),
        isValid: true,
      };
    } catch {
      return { formatted: "Invalid Date", iso: "Invalid Date", isValid: false };
    }
  };
  const getValueTypeInfo = (
    val: any
  ): { type: string; className: string; prefix?: string } => {
    if (val === null || val === undefined) {
      return {
        type: "null",
        className: "text-gray-500 dark:text-gray-400 italic",
        prefix: "",
      };
    }

    if (
      val &&
      typeof val === "object" &&
      val.__timestamp_micros_since_unix_epoch__ !== undefined
    ) {
      return {
        type: "timestamp",
        className:
          "text-blue-700 dark:text-blue-300 font-mono bg-blue-50/50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border-l-2 border-blue-300 dark:border-blue-600",
        prefix: "",
      };
    }

    if (val && typeof val === "object" && val.tag !== undefined) {
      return {
        type: "enum",
        className:
          "text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border-l-2 border-purple-300 dark:border-purple-600",
        prefix: "",
      };
    }

    if (typeof val === "boolean") {
      return {
        type: "boolean",
        className: val
          ? "text-green-700 dark:text-green-300 bg-green-50/50 dark:bg-green-950/50 px-1.5 py-0.5 rounded border-l-2 border-green-300 dark:border-green-600"
          : "text-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-950/50 px-1.5 py-0.5 rounded border-l-2 border-red-300 dark:border-red-600",
        prefix: "",
      };
    }

    if (typeof val === "number") {
      return {
        type: "number",
        className:
          "text-cyan-700 dark:text-cyan-300 font-mono bg-cyan-50/50 dark:bg-cyan-950/50 px-1.5 py-0.5 rounded border-l-2 border-cyan-300 dark:border-cyan-600",
        prefix: "",
      };
    }

    if (typeof val === "bigint") {
      return {
        type: "bigint",
        className:
          "text-indigo-700 dark:text-indigo-300 font-mono bg-indigo-50/50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border-l-2 border-indigo-300 dark:border-indigo-600",
        prefix: "",
      };
    }

    if (typeof val === "string") {
      return {
        type: "string",
        className:
          "text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border-l-2 border-slate-300 dark:border-slate-600",
        prefix: "",
      };
    }

    if (Array.isArray(val)) {
      return {
        type: "array",
        className:
          "text-yellow-700 dark:text-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/50 px-1.5 py-0.5 rounded border-l-2 border-yellow-300 dark:border-yellow-600",
        prefix: "",
      };
    }

    if (typeof val === "object" && val !== null) {
      return {
        type: "object",
        className:
          "text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border-l-2 border-amber-300 dark:border-amber-600",
        prefix: "",
      };
    }

    return {
      type: "unknown",
      className:
        "text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded border-l-2 border-gray-300 dark:border-gray-600",
      prefix: "",
    };
  };

  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return "null";

    if (
      val &&
      typeof val === "object" &&
      val.__timestamp_micros_since_unix_epoch__ !== undefined
    ) {
      const timestampResult = formatTimestamp(val);
      return timestampResult.formatted;
    }

    if (val && typeof val === "object" && val.tag !== undefined) {
      return val.tag;
    }

    if (val instanceof Date) {
      return val.toLocaleDateString() + " " + val.toLocaleTimeString();
    }

    if (typeof val === "bigint") {
      return val.toString();
    }

    if (typeof val === "boolean") {
      return val ? "true" : "false";
    }

    if (Array.isArray(val)) {
      return `[${val.map((item) => formatValue(item)).join(", ")}]`;
    }

    if (typeof val === "object" && val !== null) {
      const stringValue = val.toString();
      if (stringValue !== "[object Object]") {
        return stringValue;
      }

      try {
        const keys = Object.keys(val);
        if (keys.length <= 3) {
          return `{${keys
            .map((k) => `${k}: ${formatValue(val[k])}`)
            .join(", ")}}`;
        } else {
          return `{${keys.length} properties}`;
        }
      } catch {
        return "[Complex Object]";
      }
    }

    return String(val);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const fullValue = formatValue(value);
  const maxLength = isVerticalView ? 40 : 30;
  const truncatedValue =
    fullValue.length > maxLength
      ? fullValue.slice(0, maxLength - 3) + "..."
      : fullValue;
  const needsExpansion = fullValue.length > maxLength;
  const typeInfo = getValueTypeInfo(value);

  const getTooltipContent = () => {
    if (
      value &&
      typeof value === "object" &&
      value.__timestamp_micros_since_unix_epoch__ !== undefined
    ) {
      const timestampResult = formatTimestamp(value);
      if (!timestampResult.isValid) {
        return (
          <div className="space-y-1">
            <p className="text-red-400">Invalid timestamp</p>
            <p className="text-xs opacity-75">
              Micros: {value.__timestamp_micros_since_unix_epoch__}
            </p>
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <p className="font-medium">{timestampResult.formatted}</p>
          <p className="text-xs opacity-75">ISO: {timestampResult.iso}</p>
          <p className="text-xs opacity-75">
            Micros: {value.__timestamp_micros_since_unix_epoch__}
          </p>
        </div>
      );
    }
    return <p className="max-w-xs break-all">{fullValue}</p>;
  };

  if (!needsExpansion) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`inline-flex items-center text-sm cursor-default break-words ${typeInfo.className}`}
            >
              <span className="text-xs mr-1 opacity-60">{typeInfo.prefix}</span>
              {fullValue}
            </span>
          </TooltipTrigger>
          <TooltipContent>{getTooltipContent()}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-start space-x-1 min-w-0">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`inline-flex items-center text-sm cursor-help break-words min-w-0 flex-1 ${typeInfo.className}`}
            >
              <span className="text-xs mr-1 opacity-60 flex-shrink-0">
                {typeInfo.prefix}
              </span>
              <span className="truncate">{truncatedValue}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{getTooltipContent()}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 flex-shrink-0 opacity-50 hover:opacity-100"
          >
            <Expand className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Full Value - {field.displayName}</DialogTitle>
            <DialogDescription>
              Complete content for field: {field.name} ({typeInfo.type})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {value &&
              typeof value === "object" &&
              value.__timestamp_micros_since_unix_epoch__ !== undefined && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <h4 className="font-medium text-blue-900 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Timestamp Details
                  </h4>
                  <div className="text-sm space-y-1">
                    {(() => {
                      const timestampResult = formatTimestamp(value);
                      if (!timestampResult.isValid) {
                        return (
                          <>
                            <p className="text-red-600">
                              <strong>Status:</strong> Invalid timestamp
                            </p>
                            <p>
                              <strong>Raw Microseconds:</strong>{" "}
                              {value.__timestamp_micros_since_unix_epoch__}
                            </p>
                          </>
                        );
                      }
                      return (
                        <>
                          <p>
                            <strong>Formatted:</strong>{" "}
                            {timestampResult.formatted}
                          </p>
                          <p>
                            <strong>ISO String:</strong> {timestampResult.iso}
                          </p>
                          <p>
                            <strong>Microseconds:</strong>{" "}
                            {value.__timestamp_micros_since_unix_epoch__}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

            <div className="relative">
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {fullValue}
                </pre>
              </ScrollArea>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(fullValue)}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const EnhancedTableViewer: React.FC<EnhancedTableViewerProps> = ({
  tableMetadata,
}) => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showStats, setShowStats] = useState(false);

  const serializedData = useAppSelector(selectTableData(tableMetadata.name));

  const tableData = useMemo(() => {
    if (!serializedData?.length) return [];

    try {
      return serializedData;
    } catch (error) {
      console.error(`Deserialization error for ${tableMetadata.name}:`, error);
      return [];
    }
  }, [serializedData, tableMetadata.name]);

  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => {
    const baseColumns: ColumnDef<any, any>[] = [
      {
        id: "select",
        header: ({ table }: any) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="rounded"
          />
        ),
        cell: ({ row }: any) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded"
          />
        ),
        size: 50,
        enableHiding: false,
      },
    ];

    const fieldColumns = tableMetadata.fields.map((field) =>
      columnHelper.accessor(field.name, {
        header: ({ column }: any) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 p-0 font-medium"
            >
              <span>{field.displayName}</span>
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-3 w-3" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-3 w-3" />
              ) : (
                <ArrowUpDown className="ml-2 h-3 w-3" />
              )}
            </Button>
            {field.name === tableMetadata.primaryKey && (
              <Badge variant="outline" className="text-xs">
                PK
              </Badge>
            )}
          </div>
        ),
        cell: ({ getValue }: any) => (
          <ExpandableCell
            value={getValue()}
            field={field}
            isVerticalView={viewMode === "grid"}
          />
        ),
        size: 200,
        enableHiding: true,
      })
    );

    return [...baseColumns, ...fieldColumns];
  }, [tableMetadata.fields, tableMetadata.primaryKey, columnHelper, viewMode]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: { globalFilter, rowSelection },
    globalFilterFn: "includesString",
    enableColumnResizing: true,
    columnResizeMode: "onChange",
  });

  const exportData = () => {
    const csvContent = [
      tableMetadata.fields.map((f) => f.displayName).join(","),
      ...table.getFilteredRowModel().rows.map((row) =>
        tableMetadata.fields
          .map((field) => {
            const value = row.getValue(field.name);
            return `"${String(value || "").replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableMetadata.name}-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const maxLength = viewMode === "grid" ? 20 : 20;
  const renderGridView = () => {
    return (
      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[600px] w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {table.getRowModel().rows.map((row) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 ${
                    row.getIsSelected()
                      ? "ring-2 ring-primary bg-primary/5 border-primary/20"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="checkbox"
                      checked={row.getIsSelected()}
                      onChange={row.getToggleSelectedHandler()}
                      className="rounded"
                    />
                    <Badge variant="outline" className="text-xs font-mono">
                      {String(row.getValue(tableMetadata.primaryKey)).slice(
                        0,
                        maxLength - 3
                      ) + "..."}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {tableMetadata.fields
                      .filter((field) =>
                        table.getColumn(field.name)?.getIsVisible()
                      )
                      .map((field) => (
                        <div key={field.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              {field.displayName}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                          </div>
                          <div className="bg-muted/20 rounded px-2 py-1 min-h-[28px] flex items-center">
                            <ExpandableCell
                              value={row.getValue(field.name)}
                              field={field}
                              isVerticalView={true}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                  <tableMetadata.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {tableMetadata.displayName}
                  </CardTitle>
                  <CardDescription>{tableMetadata.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {table.getFilteredRowModel().rows.length} rows
                </Badge>
                <Badge variant="secondary">{tableMetadata.category}</Badge>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Stats Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <TableStats data={tableData} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={`Search ${tableMetadata.displayName.toLowerCase()}...`}
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              <ViewModeToggle mode={viewMode} onChange={setViewMode} />
              <ColumnVisibilityControl
                table={table}
                tableMetadata={tableMetadata}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStats(!showStats)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Stats
              </Button>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Content */}
      <motion.div layout className="space-y-4">
        {table.getFilteredRowModel().rows.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <tableMetadata.icon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Data Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {globalFilter
                  ? `No results found for "${globalFilter}"`
                  : `This ${tableMetadata.displayName.toLowerCase()} table is empty`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Render based on view mode */}
            {viewMode === "table" && (
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="min-w-full overflow-auto">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                          {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                              {headerGroup.headers.map((header) => (
                                <th
                                  key={header.id}
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                  style={{
                                    width: header.getSize(),
                                    minWidth:
                                      header.id === "select" ? "50px" : "120px",
                                  }}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </th>
                              ))}
                            </tr>
                          ))}
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          <AnimatePresence>
                            {table.getRowModel().rows.map((row, index) => (
                              <motion.tr
                                key={row.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.02 }}
                                className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                  row.getIsSelected()
                                    ? "bg-blue-50 dark:bg-blue-950"
                                    : ""
                                }`}
                              >
                                {row.getVisibleCells().map((cell) => (
                                  <td
                                    key={cell.id}
                                    className="px-4 py-3 text-sm"
                                  >
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </td>
                                ))}
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>

                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {viewMode === "grid" && renderGridView()}
          </>
        )}

        {/* Pagination */}
        {table.getPageCount() > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {Object.keys(rowSelection).length} of{" "}
                  {table.getFilteredRowModel().rows.length} row(s) selected
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Rows per page</span>
                    <select
                      value={table.getState().pagination.pageSize}
                      onChange={(e) =>
                        table.setPageSize(Number(e.target.value))
                      }
                      className="border rounded px-3 py-1 text-sm"
                    >
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <option key={pageSize} value={pageSize}>
                          {pageSize}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-sm">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        table.setPageIndex(table.getPageCount() - 1)
                      }
                      disabled={!table.getCanNextPage()}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Schema Information */}
      <Card>
        <CardHeader>
          <CardTitle>Schema Information</CardTitle>
          <CardDescription>
            Field definitions and types for {tableMetadata.displayName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full">
            <div className="grid gap-3 pr-4">
              {tableMetadata.fields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{field.displayName}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {field.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{field.type}</Badge>
                    {field.isOptional && (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                    {field.isArray && <Badge variant="secondary">Array</Badge>}
                    {field.name === tableMetadata.primaryKey && (
                      <Badge variant="default">Primary Key</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedTableViewer;
