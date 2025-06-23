import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Zap,
  Trash2,
  Filter,
  ChevronDown,
  ChevronRight,
  Users,
  Activity,
  Database,
  AlertCircle,
  CheckCircle,
  Search,
  Download,
  Pause,
  Play,
  Settings,
  Copy,
  MessageSquare,
  Code,
  Server,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { safeStringify } from "@/utils/serialization";

interface Event {
  timestamp: Date;
  type: string;
  message: string;
  data?: any;
  severity?: "info" | "warn" | "error" | "success";
  source?: "reducer" | "table" | "connection" | "system";
}

interface EventLoggerProps {
  events: Event[];
  onClearEvents?: () => void;
}

export const EventLogger: React.FC<EventLoggerProps> = ({
  events,
  onClearEvents,
}) => {
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && !isPaused && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollElement) {
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }, 100);
      }
    }
  }, [events, autoScroll, isPaused]);

  const eventTypes = ["all", ...Array.from(new Set(events.map((e) => e.type)))];
  const severityTypes = ["all", "info", "warn", "error", "success"];
  const sourceTypes = ["all", "reducer", "table", "connection", "system"];

  const filteredEvents = events.filter((event) => {
    const matchesType = filter === "all" || event.type === filter;
    const matchesSeverity =
      severityFilter === "all" || event.severity === severityFilter;
    const matchesSource =
      sourceFilter === "all" || event.source === sourceFilter;
    const matchesSearch =
      searchTerm === "" ||
      event.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.data &&
        safeStringify(event.data)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    return matchesType && matchesSeverity && matchesSource && matchesSearch;
  });

  const getEventIcon = (type: string, source?: string) => {
    if (source === "reducer") return <Code className="h-4 w-4" />;
    if (source === "table") return <Database className="h-4 w-4" />;
    if (source === "connection") return <Server className="h-4 w-4" />;

    switch (type) {
      case "User Insert":
      case "User Update":
        return <Users className="h-4 w-4" />;
      case "Room Join":
      case "Room Leave":
        return <Activity className="h-4 w-4" />;
      case "Block Opened":
        return <Database className="h-4 w-4" />;
      case "Reducer Success":
      case "Reducer Call":
        return <Code className="h-4 w-4" />;
      case "Reducer Error":
        return <AlertCircle className="h-4 w-4" />;
      case "Table Update":
        return <Database className="h-4 w-4" />;
      case "Connection":
        return <Server className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string, severity?: string) => {
    if (severity === "error")
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
    if (severity === "warn")
      return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800";
    if (severity === "success")
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800";

    switch (type) {
      case "User Insert":
      case "User Update":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800";
      case "Room Join":
      case "Room Leave":
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800";
      case "Block Opened":
      case "Table Update":
        return "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800";
      case "Reducer Success":
      case "Reducer Call":
        return "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800";
      case "Reducer Error":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
      case "Connection":
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
    }
  };

  const getEventId = (event: Event, index: number) => {
    return `${event.timestamp.getTime()}-${event.type}-${index}`;
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const copyEventData = async (event: Event, eventId: string) => {
    try {
      const eventData = {
        timestamp: event.timestamp.toISOString(),
        type: event.type,
        message: event.message,
        data: event.data,
        severity: event.severity,
        source: event.source,
      };
      await navigator.clipboard.writeText(safeStringify(eventData));
      setCopiedEventId(eventId);
      setTimeout(() => setCopiedEventId(null), 2000);
    } catch (error) {
      console.error("Failed to copy event data:", error);
    }
  };

  const exportEvents = () => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        totalEvents: events.length,
        filteredEvents: filteredEvents.length,
        events: filteredEvents.map((event) => ({
          timestamp: event.timestamp.toISOString(),
          type: event.type,
          message: event.message,
          data: event.data,
          severity: event.severity,
          source: event.source,
        })),
      };

      const blob = new Blob([safeStringify(exportData)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `events-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export events:", error);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <Card className="w-full">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Event Logger</CardTitle>
                <CardDescription>
                  Real-time events and system activity monitoring
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-sm">
                {filteredEvents.length} / {events.length}
              </Badge>
              {isPaused && (
                <Badge variant="destructive" className="text-xs">
                  Paused
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6 w-full">
          {/* Search and Basic Filters */}
          <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "all" ? "All Types" : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="whitespace-nowrap"
              >
                <Settings className="h-4 w-4 mr-2" />
                Advanced
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                    Severity Level
                  </label>
                  <Select
                    value={severityFilter}
                    onValueChange={setSeverityFilter}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {severityTypes.map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          {severity === "all"
                            ? "All Severities"
                            : severity.charAt(0).toUpperCase() +
                              severity.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                    Event Source
                  </label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceTypes.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source === "all"
                            ? "All Sources"
                            : source.charAt(0).toUpperCase() + source.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span>Auto-scroll to latest</span>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={exportEvents}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearEvents}
                disabled={events.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Events List */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px] w-full" ref={scrollAreaRef}>
                <div className="p-4 w-full">
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">
                        No Events Found
                      </p>
                      <p className="text-sm">
                        {searchTerm
                          ? `No events match your search "${searchTerm}"`
                          : "Events will appear here as they occur"}
                      </p>
                      {(searchTerm ||
                        filter !== "all" ||
                        severityFilter !== "all" ||
                        sourceFilter !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => {
                            setSearchTerm("");
                            setFilter("all");
                            setSeverityFilter("all");
                            setSourceFilter("all");
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 w-full">
                      <AnimatePresence>
                        {filteredEvents
                          .slice()
                          .reverse()
                          .map((event, reverseIndex) => {
                            const originalIndex =
                              filteredEvents.length - 1 - reverseIndex;
                            const eventId = getEventId(event, originalIndex);
                            const isExpanded = expandedEvents.has(eventId);
                            const isCopied = copiedEventId === eventId;

                            return (
                              <motion.div
                                key={eventId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: reverseIndex * 0.02 }}
                                className={`border rounded-lg overflow-hidden w-full transition-all duration-200 hover:shadow-md ${getEventColor(
                                  event.type,
                                  event.severity
                                )}`}
                              >
                                {/* Event Header */}
                                <div className="p-4 w-full">
                                  <div className="flex items-start justify-between w-full min-w-0">
                                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                                      <div className="p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm flex-shrink-0">
                                        {getEventIcon(event.type, event.source)}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="space-y-2">
                                          <div className="break-words text-sm font-medium text-gray-900 dark:text-gray-100 pr-4">
                                            {event.message}
                                          </div>

                                          <div className="flex flex-wrap gap-2">
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {event.type}
                                            </Badge>

                                            {event.severity && (
                                              <Badge
                                                variant={
                                                  event.severity === "error"
                                                    ? "destructive"
                                                    : event.severity ===
                                                      "success"
                                                    ? "default"
                                                    : "secondary"
                                                }
                                                className="text-xs"
                                              >
                                                {event.severity.toUpperCase()}
                                              </Badge>
                                            )}

                                            {event.source && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {event.source}
                                              </Badge>
                                            )}
                                          </div>

                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {event.timestamp.toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                copyEventData(event, eventId)
                                              }
                                              className="h-8 w-8 p-0"
                                            >
                                              {isCopied ? (
                                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                              ) : (
                                                <Copy className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {isCopied
                                              ? "Copied!"
                                              : "Copy event data"}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      {event.data && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  toggleEventExpansion(eventId)
                                                }
                                                className="h-8 w-8 p-0"
                                              >
                                                {isExpanded ? (
                                                  <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                  <ChevronRight className="h-4 w-4" />
                                                )}
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {isExpanded
                                                ? "Collapse details"
                                                : "Expand details"}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Data Section */}
                                <AnimatePresence>
                                  {isExpanded && event.data && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
                                    >
                                      <div className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Event Data
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              copyEventData(event, eventId)
                                            }
                                            className="h-7 px-2"
                                          >
                                            {isCopied ? (
                                              <>
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Copied
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="h-3 w-3 mr-1" />
                                                Copy
                                              </>
                                            )}
                                          </Button>
                                        </div>

                                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-h-[300px] overflow-auto">
                                          <ScrollArea className="h-full">
                                            <pre className="text-xs p-4 whitespace-pre-wrap break-all font-mono text-gray-800 dark:text-gray-200">
                                              {safeStringify(event.data)}
                                            </pre>
                                          </ScrollArea>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
