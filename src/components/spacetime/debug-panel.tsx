import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/store/hooks";
import {
  Database,
  Code,
  Settings,
  Eye,
  EyeOff,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle,
  Activity,
  Zap,
  Server,
  HardDrive,
  Monitor,
  Search,
  Clock,
  CheckCircle,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { safeStringify } from "@/utils/serialization";
import { useSpacetimeDB } from "@/hooks/use-spacetime-db";

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "stable";
  color?: "blue" | "green" | "purple" | "amber" | "red";
}) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    purple: "from-purple-500 to-purple-600",
    amber: "from-amber-500 to-amber-600",
    red: "from-red-500 to-red-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-5`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]} bg-opacity-10`}
            >
              <Icon
                className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`}
              />
            </div>
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
          </div>
          {trend && (
            <div
              className={`flex items-center ${
                trend === "up"
                  ? "text-green-600"
                  : trend === "down"
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const SystemHealth = ({
  connection,
  memoryUsage,
  renderCount,
}: {
  connection: any;
  memoryUsage: number;
  renderCount: number;
}) => {
  const healthChecks = [
    {
      name: "WebSocket Connection",
      status: connection ? "healthy" : "error",
      description: connection
        ? "Active connection established"
        : "No connection available",
    },
    {
      name: "Authentication",
      status: localStorage.getItem("spacetimedb_token") ? "healthy" : "warning",
      description: localStorage.getItem("spacetimedb_token")
        ? "Token present and valid"
        : "Anonymous session",
    },
    {
      name: "Memory Usage",
      status:
        memoryUsage < 100 ? "healthy" : memoryUsage < 200 ? "warning" : "error",
      description: `${memoryUsage}MB JavaScript heap`,
    },
    {
      name: "Performance",
      status: renderCount < 1000 ? "healthy" : "warning",
      description: `${renderCount} component renders`,
    },
  ];

  return (
    <div className="space-y-3">
      {healthChecks.map((check, index) => (
        <motion.div
          key={check.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full ${
                check.status === "healthy"
                  ? "bg-green-500"
                  : check.status === "warning"
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {check.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {check.description}
              </p>
            </div>
          </div>
          <Badge
            variant={
              check.status === "healthy"
                ? "default"
                : check.status === "warning"
                ? "secondary"
                : "destructive"
            }
            className="text-xs"
          >
            {check.status}
          </Badge>
        </motion.div>
      ))}
    </div>
  );
};

export const DebugPanel: React.FC = () => {
  const spacetimeState = useAppSelector((state) => state.spacetime);
  const {
    connection,
    connectionStatus,
    discoveredTables,
    discoveredReducers,
    isConnected,
    isConnecting,
    error,
  } = useSpacetimeDB();

  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [metrics, setMetrics] = useState({
    memoryUsage: 0,
    renderCount: 0,
    lastUpdate: Date.now(),
  });

  // Update metrics
  useEffect(() => {
    const updateMetrics = () => {
      const memory = (performance as any).memory;
      setMetrics((prev) => ({
        memoryUsage: memory
          ? Math.round(memory.usedJSHeapSize / 1024 / 1024)
          : 0,
        renderCount: prev.renderCount + 1,
        lastUpdate: Date.now(),
      }));
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = async (obj: any, label?: string) => {
    try {
      await navigator.clipboard.writeText(safeStringify(obj));
      setCopied(label || "data");
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const downloadDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      metrics,
      connectionStatus,
      isConnected,
      tableCount: discoveredTables.length,
      reducerCount: discoveredReducers.length,
      spacetimeState,
    };

    const blob = new Blob([safeStringify(debugData)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spacetime-debug-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredState = searchTerm
    ? Object.entries(spacetimeState)
        .filter(
          ([key, value]) =>
            key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            safeStringify(value)
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
        )
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
    : spacetimeState;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 bg-opacity-10">
                <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Debug Panel</CardTitle>
                <CardDescription>
                  System diagnostics and debugging information
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">v2.1</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSensitiveData(!showSensitiveData)}
              >
                {showSensitiveData ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadDebugData}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger
                value="overview"
                className="flex items-center space-x-2"
              >
                <Monitor className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="metrics"
                className="flex items-center space-x-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Metrics</span>
              </TabsTrigger>
              <TabsTrigger
                value="state"
                className="flex items-center space-x-2"
              >
                <Database className="h-4 w-4" />
                <span>State</span>
              </TabsTrigger>
              <TabsTrigger
                value="health"
                className="flex items-center space-x-2"
              >
                <Activity className="h-4 w-4" />
                <span>Health</span>
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>System</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Connection"
                  value={connectionStatus}
                  subtitle={isConnected ? "Active" : "Inactive"}
                  icon={isConnected ? CheckCircle : AlertTriangle}
                  color={isConnected ? "green" : "red"}
                />
                <MetricCard
                  title="Tables"
                  value={discoveredTables.length}
                  subtitle="Discovered schemas"
                  icon={Database}
                  color="blue"
                />
                <MetricCard
                  title="Reducers"
                  value={discoveredReducers.length}
                  subtitle="Available actions"
                  icon={Code}
                  color="purple"
                />
                <MetricCard
                  title="Memory"
                  value={`${metrics.memoryUsage}MB`}
                  subtitle="JavaScript heap"
                  icon={HardDrive}
                  color="amber"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Active Error
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {error}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="metrics" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MetricCard
                  title="Render Count"
                  value={metrics.renderCount}
                  subtitle="Component renders"
                  icon={Activity}
                  color="green"
                />
                <MetricCard
                  title="Last Update"
                  value={new Date(metrics.lastUpdate).toLocaleTimeString()}
                  subtitle={`${Math.round(
                    (Date.now() - metrics.lastUpdate) / 1000
                  )}s ago`}
                  icon={Clock}
                  color="blue"
                />
                <MetricCard
                  title="State Size"
                  value={`${Math.round(
                    safeStringify(spacetimeState).length / 1024
                  )}KB`}
                  subtitle="Redux state"
                  icon={Database}
                  color="purple"
                />
              </div>
            </TabsContent>

            <TabsContent value="state" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Redux State Explorer</h3>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search state..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(filteredState, "Redux state")
                    }
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied === "Redux state" ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[500px] w-full border rounded-lg">
                <div className="p-4">
                  <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto whitespace-pre-wrap break-words">
                    {safeStringify(filteredState)}
                  </pre>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="health" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  System Health Checks
                </h3>
                <SystemHealth
                  connection={connection}
                  memoryUsage={metrics.memoryUsage}
                  renderCount={metrics.renderCount}
                />
              </div>
            </TabsContent>

            <TabsContent value="system" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Environment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        URL
                      </span>
                      <span className="text-sm font-mono break-all">
                        {window.location.origin}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-mono">
                        {window.screen.width}x{window.screen.height}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Viewport
                      </span>
                      <span className="text-sm font-mono">
                        {window.innerWidth}x{window.innerHeight}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Storage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        LocalStorage Items
                      </span>
                      <span className="text-sm font-mono">
                        {Object.keys(localStorage).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        SessionStorage Items
                      </span>
                      <span className="text-sm font-mono">
                        {Object.keys(sessionStorage).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        SpacetimeDB Token
                      </span>
                      <Badge
                        variant={
                          localStorage.getItem("spacetimedb_token")
                            ? "default"
                            : "secondary"
                        }
                      >
                        {localStorage.getItem("spacetimedb_token")
                          ? "Present"
                          : "None"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {showSensitiveData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                    Sensitive Data
                  </h3>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Full Identity
                        </p>
                        <p className="text-xs font-mono text-amber-700 dark:text-amber-300 break-all mt-1">
                          {spacetimeState.identity || "None"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(spacetimeState.identity, "identity")
                        }
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copy Identity
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
