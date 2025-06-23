import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/components/ui/use-toast";
import { DynamicFormField } from "./dynamic-form-field";
import {
  Play,
  CheckCircle,
  AlertCircle,
  Copy,
  RotateCcw,
  BookOpen,
  Zap,
  Clock,
  Code2,
  FileText,
  Settings,
  TrendingUp,
  Activity,
  Timer,
  Loader2,
  Eye,
  EyeOff,
  Download,
  BarChart3,
  Hash,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { safeStringify } from "@/utils/serialization";
import { ExampleGenerator } from "@/utils/introspection/example-generator";
import { useSpacetimeDB } from "@/hooks/use-spacetime-db";
import { FieldMetadata, ReducerMetadata } from "@/types/spacetime";

interface DynamicReducerTestingProps {
  reducers: ReducerMetadata[];
}

interface CallHistoryItem {
  id: string;
  args: any;
  timestamp: Date;
  success: boolean;
  error?: string;
  result?: string;
  duration?: number;
  retryCount?: number;
}

interface CallMetrics {
  totalCalls: number;
  successRate: number;
  avgDuration: number;
  recentErrors: string[];
}

const ReducerIcon = ({ reducer }: { reducer: ReducerMetadata }) => {
  const Icon = reducer.icon;
  return (
    <div
      className={`p-3 rounded-xl bg-gradient-to-br ${
        reducer.isDestructive
          ? "from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20"
          : "from-blue-100 to-indigo-200 dark:from-blue-900/20 dark:to-indigo-800/20"
      }`}
    >
      <Icon
        className={`h-8 w-8 ${
          reducer.isDestructive
            ? "text-red-600 dark:text-red-400"
            : "text-blue-600 dark:text-blue-400"
        }`}
      />
    </div>
  );
};

const MetricsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "red" | "amber";
  trend?: "up" | "down" | "stable";
}) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 text-blue-600 dark:text-blue-400",
    green:
      "from-emerald-500 to-emerald-600 text-emerald-600 dark:text-emerald-400",
    red: "from-red-500 to-red-600 text-red-600 dark:text-red-400",
    amber: "from-amber-500 to-amber-600 text-amber-600 dark:text-amber-400",
  };

  const classes = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${
          classes.split(" ")[0]
        } ${classes.split(" ")[1]} opacity-5`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {subtitle}
              </p>
            )}
          </div>
          <div
            className={`p-2 rounded-lg bg-gradient-to-br ${
              classes.split(" ")[0]
            } ${classes.split(" ")[1]} bg-opacity-10`}
          >
            <Icon
              className={`h-5 w-5 ${classes.split(" ").slice(2).join(" ")}`}
            />
          </div>
        </div>
        {trend && (
          <div
            className={`mt-2 flex items-center text-xs ${
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            <span>Trend {trend}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const CallHistoryTimeline = ({
  history,
  onClear,
}: {
  history: CallHistoryItem[];
  onClear: () => void;
}) => {
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (filter === "success") return item.success;
      if (filter === "error") return !item.success;
      return true;
    });
  }, [history, filter]);

  const copyItem = async (item: CallHistoryItem) => {
    try {
      await navigator.clipboard.writeText(safeStringify(item));
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold">Call History</h3>
          <Badge variant="outline">{history.length}</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center border rounded-lg">
            {["all", "success", "error"].map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(f as any)}
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                {f === "all" ? "All" : f === "success" ? "Success" : "Errors"}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear All
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          <AnimatePresence>
            {filteredHistory.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border ${
                  item.success
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {item.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {item.success ? "Successful Call" : "Failed Call"}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {item.timestamp.toLocaleString()}
                      </p>
                      {item.duration && (
                        <p className="text-xs text-gray-500">
                          Duration: {item.duration}ms
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyItem(item)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowDetails(showDetails === item.id ? null : item.id)
                      }
                    >
                      {showDetails === item.id ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {showDetails === item.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                    >
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Arguments:
                          </p>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                            {safeStringify(item.args)}
                          </pre>
                        </div>
                        {item.error && (
                          <div>
                            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                              Error:
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20 p-2 rounded">
                              {item.error}
                            </p>
                          </div>
                        )}
                        {item.result && (
                          <div>
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                              Result:
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/20 p-2 rounded">
                              {item.result}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};

const ParameterValidation = ({
  fields,
  formData,
}: {
  fields: FieldMetadata[];
  formData: Record<string, any>;
}) => {
  const validationResults = useMemo(() => {
    return fields.map((field) => {
      const value = formData[field.name];
      const errors: string[] = [];

      // Required field validation
      if (
        !field.isOptional &&
        (value === undefined || value === null || value === "")
      ) {
        errors.push("This field is required");
      }

      // Type-specific validation
      if (value !== undefined && value !== null && value !== "") {
        if (
          field.validation?.min !== undefined &&
          Number(value) < field.validation.min
        ) {
          errors.push(`Value must be at least ${field.validation.min}`);
        }
        if (
          field.validation?.max !== undefined &&
          Number(value) > field.validation.max
        ) {
          errors.push(`Value must be at most ${field.validation.max}`);
        }
        if (field.validation?.pattern && typeof value === "string") {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors.push("Value does not match required pattern");
          }
        }
      }

      return {
        field: field.name,
        displayName: field.displayName,
        errors,
        isValid: errors.length === 0,
      };
    });
  }, [fields, formData]);

  const totalErrors = validationResults.reduce(
    (acc, result) => acc + result.errors.length,
    0
  );
  const validFields = validationResults.filter(
    (result) => result.isValid
  ).length;
  const completionPercentage =
    fields.length > 0 ? (validFields / fields.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Parameter Validation</h3>
        <Badge variant={totalErrors === 0 ? "default" : "destructive"}>
          {totalErrors === 0
            ? "Valid"
            : `${totalErrors} Error${totalErrors !== 1 ? "s" : ""}`}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Completion</span>
          <span>
            {validFields}/{fields.length} fields valid
          </span>
        </div>
        <Progress value={completionPercentage} className="h-2" />
      </div>

      <div className="space-y-2">
        {validationResults.map((result) => (
          <div
            key={result.field}
            className={`flex items-center justify-between p-3 rounded-lg ${
              result.isValid
                ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              {result.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className="text-sm font-medium">{result.displayName}</span>
            </div>
            {result.errors.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="destructive" className="text-xs">
                      {result.errors.length} error
                      {result.errors.length !== 1 ? "s" : ""}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {result.errors.map((error, index) => (
                        <p key={index} className="text-xs">
                          • {error}
                        </p>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const DynamicReducerTesting: React.FC<DynamicReducerTestingProps> = ({
  reducers,
}) => {
  const { callReducer, isConnected, connectionStatus, identity } =
    useSpacetimeDB();
  const { toast } = useToast();

  const reducer = reducers[0];

  const [formData, setFormData] = useState<Record<string, any>>(
    reducer?.exampleArgs || {}
  );
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoRetry, setAutoRetry] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);

  // Metrics calculation
  const metrics = useMemo((): CallMetrics => {
    const totalCalls = callHistory.length;
    const successfulCalls = callHistory.filter((call) => call.success).length;
    const successRate =
      totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    const durations = callHistory
      .filter((call) => call.duration)
      .map((call) => call.duration!);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const recentErrors = callHistory
      .filter((call) => !call.success && call.error)
      .slice(-5)
      .map((call) => call.error!);

    return {
      totalCalls,
      successRate,
      avgDuration,
      recentErrors,
    };
  }, [callHistory]);

  // Auto-clear results
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => setResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  const addToHistory = useCallback((item: Omit<CallHistoryItem, "id">) => {
    const historyItem: CallHistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random()}`,
    };

    setCallHistory((prev) => [historyItem, ...prev.slice(0, 49)]);
  }, []);

  const constructEnumValue = (field: FieldMetadata, value: any): any => {
    if (!field.enumValues?.includes(String(value))) {
      return field.enumValues?.[0] || value;
    }

    if (field._enumConstructor) {
      try {
        const EnumConstructor = field._enumConstructor;
        if (EnumConstructor[String(value)] !== undefined) {
          return typeof EnumConstructor[String(value)] === "function"
            ? EnumConstructor[String(value)]()
            : EnumConstructor[String(value)];
        }
      } catch (error) {
        console.warn("Failed to use enum constructor:", error);
      }
    }

    return String(value);
  };

  const handleCallReducer = async () => {
    if (!reducer) return;

    setError(null);
    setResult(null);
    setIsLoading(true);

    const startTime = Date.now();
    let retryCount = 0;

    const attemptCall = async (): Promise<void> => {
      try {
        const args: any = {};

        reducer.fields.forEach((field) => {
          let value = formData[field.name];

          if (value === undefined || value === "") {
            if (!field.isOptional) {
              value = reducer.exampleArgs?.[field.name];
            } else {
              return;
            }
          }

          if (value !== undefined && value !== null) {
            // Type conversion logic
            if (field.type === "string") {
              args[field.name] = String(value);
            } else if (field.type === "boolean") {
              args[field.name] = Boolean(value);
            } else if (["u64", "i64"].includes(field.type)) {
              args[field.name] = BigInt(Number(value));
            } else if (
              ["u8", "u16", "u32", "i8", "i16", "i32"].includes(field.type)
            ) {
              args[field.name] = Number(value);
            } else if (["f32", "f64"].includes(field.type)) {
              args[field.name] = parseFloat(String(value));
            } else if (field.type === "enum" || field.enumValues) {
              args[field.name] = constructEnumValue(field, value);
            } else {
              args[field.name] = value;
            }
          }
        });

        await callReducer(reducer.name as any, args);

        const duration = Date.now() - startTime;
        const successMessage = `Successfully called ${reducer.displayName}`;

        setResult(successMessage);
        addToHistory({
          args: { ...args },
          timestamp: new Date(),
          success: true,
          result: successMessage,
          duration,
          retryCount,
        });

        toast({
          title: "Success",
          description: successMessage,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";

        if (autoRetry && retryCount < maxRetries) {
          retryCount++;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          );
          return attemptCall();
        }

        setError(errorMessage);
        addToHistory({
          args: { ...formData },
          timestamp: new Date(),
          success: false,
          error: errorMessage,
          duration: Date.now() - startTime,
          retryCount,
        });

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    try {
      await attemptCall();
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadExample = useCallback(() => {
    if (reducer?.fields) {
      const freshExampleData = ExampleGenerator.generateExampleArgs(
        reducer.fields
      );
      setFormData(freshExampleData);
      setResult(null);
      setError(null);
    }
  }, [reducer]);

  const handleReset = useCallback(() => {
    setFormData({});
    setResult(null);
    setError(null);
  }, []);

  const exportHistory = () => {
    const exportData = {
      reducer: reducer.name,
      timestamp: new Date().toISOString(),
      metrics,
      history: callHistory,
    };

    const blob = new Blob([safeStringify(exportData)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reducer-${reducer.name}-history.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!reducer) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No Reducer Found</p>
          <p className="text-sm text-muted-foreground">
            This reducer could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <ReducerIcon reducer={reducer} />
                <div>
                  <CardTitle className="text-2xl">
                    {reducer.displayName}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {reducer.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Badge variant="outline" className="text-sm">
                  {reducer.category}
                </Badge>
                {reducer.isDestructive && (
                  <Badge variant="destructive" className="text-sm">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Destructive
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Metrics Dashboard */}
      {callHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <MetricsCard
            title="Total Calls"
            value={metrics.totalCalls}
            icon={Hash}
            color="blue"
          />
          <MetricsCard
            title="Success Rate"
            value={`${metrics.successRate.toFixed(1)}%`}
            icon={CheckCircle}
            color={
              metrics.successRate > 80
                ? "green"
                : metrics.successRate > 50
                ? "amber"
                : "red"
            }
          />
          <MetricsCard
            title="Avg Duration"
            value={`${metrics.avgDuration.toFixed(0)}ms`}
            icon={Timer}
            color="blue"
          />
          <MetricsCard
            title="Recent Errors"
            value={metrics.recentErrors.length}
            subtitle="Last 5 calls"
            icon={AlertCircle}
            color={metrics.recentErrors.length === 0 ? "green" : "red"}
          />
        </motion.div>
      )}

      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="test" className="flex items-center space-x-2">
            <Play className="h-4 w-4" />
            <span>Test</span>
          </TabsTrigger>
          <TabsTrigger
            value="validation"
            className="flex items-center space-x-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Validation</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>History</span>
            {callHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {callHistory.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Docs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-6 mt-6">
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <div>
                  <CardTitle>Parameters</CardTitle>
                  <CardDescription>
                    {reducer.fields.length === 0
                      ? "This reducer takes no parameters"
                      : `Configure the ${reducer.fields.length} parameter${
                          reducer.fields.length !== 1 ? "s" : ""
                        }`}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full sm:w-auto"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Advanced
                  </Button>
                  {reducer.fields.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadExample}
                        className="w-full sm:w-auto"
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Example
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="w-full sm:w-auto"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 min-h-0">
              {/* Advanced Settings */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                  >
                    <h3 className="text-sm font-semibold mb-3">
                      Advanced Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="autoRetry"
                          checked={autoRetry}
                          onChange={(e) => setAutoRetry(e.target.checked)}
                          className="rounded"
                        />
                        <label
                          htmlFor="autoRetry"
                          className="text-sm font-medium"
                        >
                          Auto Retry on Failure
                        </label>
                      </div>
                      {autoRetry && (
                        <div className="flex items-center space-x-2">
                          <label className="text-sm">Max Retries:</label>
                          <Input
                            type="number"
                            value={maxRetries}
                            onChange={(e) =>
                              setMaxRetries(parseInt(e.target.value) || 3)
                            }
                            min="1"
                            max="10"
                            className="w-20"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Parameters Form */}
              {reducer.fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">
                    No Parameters Required
                  </p>
                  <p className="text-sm">
                    This reducer can be called directly without any arguments.
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-[300px] sm:h-[400px] w-full">
                    <div className="grid gap-4 pr-4">
                      {reducer.fields.map((field) => (
                        <DynamicFormField
                          key={field.name}
                          field={field}
                          value={formData[field.name]}
                          onChange={(value) =>
                            handleFieldChange(field.name, value)
                          }
                          disabled={!isConnected || isLoading}
                          showExample={true}
                        />
                      ))}
                    </div>
                    <ScrollBar orientation="vertical" />
                  </ScrollArea>
                </div>
              )}

              {/* Call Button and Status - Fixed positioning */}
              <div className="space-y-4 flex-shrink-0 pt-4 border-t">
                <Button
                  onClick={handleCallReducer}
                  disabled={!isConnected || isLoading}
                  size="lg"
                  className={cn(
                    "w-full h-12 text-lg font-semibold",
                    reducer.isDestructive
                      ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Calling Reducer...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Call {reducer.displayName}
                    </>
                  )}
                </Button>

                {/* Connection Warning */}
                {!isConnected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Not Connected
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Status: {connectionStatus}. Please establish a
                          connection first.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Success Message */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                              Success!
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300 break-words">
                              {result}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResult(null)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                              Error
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300 break-words">
                              {error}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(error)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setError(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="validation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Parameter Validation</CardTitle>
              <CardDescription>
                Real-time validation of your input parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ParameterValidation
                fields={reducer.fields}
                formData={formData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Call History</CardTitle>
                  <CardDescription>
                    Track and analyze your reducer calls
                  </CardDescription>
                </div>
                {callHistory.length > 0 && (
                  <Button variant="outline" size="sm" onClick={exportHistory}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {callHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No Calls Yet</p>
                  <p className="text-sm">
                    Call history will appear here after you test the reducer.
                  </p>
                </div>
              ) : (
                <CallHistoryTimeline
                  history={callHistory}
                  onClear={() => setCallHistory([])}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Documentation</span>
              </CardTitle>
              <CardDescription>
                Technical details and parameter information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Name
                        </p>
                        <p className="font-mono text-sm break-all">
                          {reducer.name}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Category
                        </p>
                        <p className="text-sm">{reducer.category}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Parameters
                        </p>
                        <p className="text-sm">{reducer.fields.length}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Type
                        </p>
                        <Badge
                          variant={
                            reducer.isDestructive ? "destructive" : "default"
                          }
                        >
                          {reducer.isDestructive ? "Destructive" : "Safe"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Parameters Documentation */}
                  {reducer.fields.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Parameters</h3>
                      <div className="space-y-4">
                        {reducer.fields.map((field) => (
                          <motion.div
                            key={field.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 border rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <code className="text-sm font-semibold bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                                  {field.name}
                                </code>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {field.displayName}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{field.type}</Badge>
                                {field.isOptional && (
                                  <Badge variant="secondary">Optional</Badge>
                                )}
                                {field.isArray && (
                                  <Badge variant="secondary">Array</Badge>
                                )}
                              </div>
                            </div>

                            {field.enumValues && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Allowed Values:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {field.enumValues.map((value) => (
                                    <Badge
                                      key={value}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {value}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {field.validation &&
                              Object.keys(field.validation).length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Validation Rules:
                                  </p>
                                  <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                                    {field.validation.required && (
                                      <p>• Required field</p>
                                    )}
                                    {field.validation.min !== undefined && (
                                      <p>
                                        • Minimum value: {field.validation.min}
                                      </p>
                                    )}
                                    {field.validation.max !== undefined && (
                                      <p>
                                        • Maximum value: {field.validation.max}
                                      </p>
                                    )}
                                    {field.validation.pattern && (
                                      <p>
                                        • Must match pattern:{" "}
                                        <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                                          {field.validation.pattern}
                                        </code>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Example Usage */}
                  {reducer.exampleArgs &&
                    Object.keys(reducer.exampleArgs).length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          Example Usage
                        </h3>
                        <div className="p-4 bg-gray-900 dark:bg-gray-950 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-300">
                              Example Arguments
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  safeStringify(reducer.exampleArgs)
                                )
                              }
                              className="text-gray-300 hover:text-white"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <ScrollArea className="h-[200px]">
                            <pre className="text-sm text-gray-300 overflow-auto">
                              <code>{safeStringify(reducer.exampleArgs)}</code>
                            </pre>
                          </ScrollArea>
                        </div>
                      </div>
                    )}

                  {/* Performance Tips */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Performance Tips
                    </h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          💡 Tip: Use the validation tab to ensure your
                          parameters are correct before calling
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          ⚡ Performance: Enable auto-retry for better
                          reliability in unstable network conditions
                        </p>
                      </div>
                      {reducer.isDestructive && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">
                            ⚠️ Warning: This is a destructive operation.
                            Double-check your parameters before calling.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DynamicReducerTesting;
