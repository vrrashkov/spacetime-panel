import React from "react";
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
import { Progress } from "@/components/ui/progress";
import { useAppSelector } from "@/store/hooks";
import {
  Wifi,
  WifiOff,
  LogIn,
  LogOut,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Server,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpacetimeDB } from "@/hooks/use-spacetime-db";
import { spacetimeConfig } from "@/config/spacetime";

const ConnectionIndicator = ({ status }: { status: string }) => {
  const indicators = {
    connected: {
      icon: Wifi,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      pulse: false,
    },
    connecting: {
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/50",
      borderColor: "border-amber-200 dark:border-amber-800",
      pulse: true,
    },
    error: {
      icon: WifiOff,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/50",
      borderColor: "border-red-200 dark:border-red-800",
      pulse: false,
    },
    disconnected: {
      icon: WifiOff,
      color: "text-gray-500",
      bgColor: "bg-gray-50 dark:bg-gray-950/50",
      borderColor: "border-gray-200 dark:border-gray-800",
      pulse: false,
    },
  };

  const config =
    indicators[status as keyof typeof indicators] || indicators.disconnected;
  const Icon = config.icon;

  return (
    <motion.div
      className={cn(
        "relative p-3 rounded-full border-2",
        config.bgColor,
        config.borderColor
      )}
      animate={config.pulse ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Icon className={cn("h-6 w-6", config.color)} />
      {config.pulse && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full border-2",
            config.borderColor
          )}
          animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

const ConnectionMetrics = ({ identity }: { identity: string | null }) => {
  const metrics = [
    {
      label: "Protocol",
      value: "WebSocket",
      icon: Server,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Authentication",
      value: localStorage.getItem("spacetimedb_token")
        ? "Authenticated"
        : "Anonymous",
      icon: Shield,
      color: localStorage.getItem("spacetimedb_token")
        ? "text-green-600 dark:text-green-400"
        : "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Auto-reconnect",
      value: "Enabled",
      icon: RefreshCw,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Max Retries",
      value: spacetimeConfig.maxRetries.toString(),
      icon: Zap,
      color: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700"
        >
          <metric.icon className={cn("h-5 w-5", metric.color)} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {metric.label}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {metric.value}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export const ConnectionManager: React.FC = () => {
  const { connectionStatus, identity } = useAppSelector(
    (state) => state.spacetime
  );
  const { connect, disconnect, isConnecting, error, clearError } =
    useSpacetimeDB();

  const statusConfig = {
    connected: {
      title: "Connected",
      description: "Successfully connected to SpacetimeDB",
      color: "text-emerald-700 dark:text-emerald-300",
    },
    connecting: {
      title: "Connecting...",
      description: "Establishing connection to SpacetimeDB",
      color: "text-amber-700 dark:text-amber-300",
    },
    error: {
      title: "Connection Error",
      description: error || "Failed to connect to SpacetimeDB",
      color: "text-red-700 dark:text-red-300",
    },
    disconnected: {
      title: "Disconnected",
      description: "Not connected to SpacetimeDB",
      color: "text-gray-700 dark:text-gray-300",
    },
  };

  const currentStatus =
    statusConfig[connectionStatus as keyof typeof statusConfig] ||
    statusConfig.disconnected;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ConnectionIndicator status={connectionStatus} />
              <div>
                <CardTitle className={currentStatus.color}>
                  {currentStatus.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  {currentStatus.description}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge
                variant={
                  connectionStatus === "connected" ? "default" : "secondary"
                }
                className="text-xs"
              >
                {connectionStatus.toUpperCase()}
              </Badge>
              {identity && (
                <Badge variant="outline" className="font-mono text-xs">
                  {identity.slice(0, 8)}...
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Connection Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {connectionStatus === "connected" ? (
              <Button
                variant="outline"
                onClick={disconnect}
                className="flex-1 sm:flex-none"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => connect()}
                  disabled={isConnecting}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {isConnecting ? "Connecting..." : "Connect"}
                </Button>
                {error && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearError();
                      connect();
                    }}
                    className="flex-1 sm:flex-none"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Connection Error
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1 break-words">
                    {error}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Server Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Server Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Server URI
                </p>
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1 break-all">
                  {spacetimeConfig.uri}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Module Name
                </p>
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                  {spacetimeConfig.moduleName}
                </p>
              </div>
            </div>
          </div>

          {/* Connection Metrics */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Connection Details
            </h3>
            <ConnectionMetrics identity={identity} />
          </div>

          {/* Identity Information */}
          {identity && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Client Identity
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Your unique identifier in the SpacetimeDB network
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border">
                <p className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all">
                  {identity}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
