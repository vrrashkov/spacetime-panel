import React, { useEffect, useState, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppSelector } from "@/store/hooks";
import {
  Database,
  Code,
  Settings,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCcw,
  ChevronRight,
  Menu,
  X,
  Zap,
  Activity,
  Search,
  Filter,
  LucideIcon,
  LogOut,
  User,
  Shield,
} from "lucide-react";

import { ConnectionManager } from "./connection-manager";
import { DebugPanel } from "./debug-panel";

const DynamicTableViewer = React.lazy(() => import("./enhanced-table-viewer"));
const DynamicReducerTesting = React.lazy(
  () => import("./dynamic-reducer-testing")
);

import { spacetimeIntrospector } from "@/utils/introspection/spacetime-introspector";
import { PatternGrouper } from "@/utils/pattern-grouper/grouper";
import type { GroupableItem } from "@/utils/pattern-grouper/types";
import { navigationConfig } from "@/config/navigation";
import type { EventCallbacks } from "@/hooks/spacetime/use-event-callbacks";
import { useSpacetimeDB } from "@/hooks/use-spacetime-db";
import { ReducerMetadata, TableMetadata } from "@/types/spacetime";
import { EventLogger } from "./EventLogger";
import { ThemeToggle } from "../ThemeToggle";
import { useToast } from "@/components/ui/use-toast";

interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  sessionToken: string | null;
  nickname: string | null;
  userInfo: any;
}

interface SpacetimeUIProps {
  customEventCallbacks?: EventCallbacks;
  enabledTabs?: string[];
  className?: string;
  onLogout: () => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<any>;
  enabled: boolean;
  category: string;
}

const LoadingSpinner = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center justify-center py-12"
  >
    <div className="text-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Loading Component
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please wait while we prepare your content...
        </p>
      </div>
    </div>
  </motion.div>
);

const ConnectionStatusIndicator = ({ status }: { status: string }) => {
  const statusConfig = {
    connected: {
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-emerald-100 dark:bg-emerald-900",
      label: "Connected",
    },
    connecting: {
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-900",
      label: "Connecting",
    },
    error: {
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-100 dark:bg-red-900",
      label: "Error",
    },
    disconnected: {
      icon: WifiOff,
      color: "text-gray-500",
      bgColor: "bg-gray-100 dark:bg-gray-900",
      label: "Disconnected",
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] ||
    statusConfig.disconnected;
  const Icon = config.icon;

  return (
    <motion.div
      animate={status === "connecting" ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${config.bgColor}`}
    >
      <Icon className={`h-4 w-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    </motion.div>
  );
};

const SidebarNavigation = ({
  groupedTabs,
  activeTab,
  onTabChange,
  onClose,
  onLogout,
}: {
  groupedTabs: [string, any[]][];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onClose: () => void;
  onLogout: () => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(groupedTabs.map(([category]) => category))
  );

  useEffect(() => {
    setExpandedCategories(new Set(groupedTabs.map(([category]) => category)));
  }, [groupedTabs]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedTabs;

    return groupedTabs
      .map(([category, tabs]) => [
        category,
        tabs.filter(
          (tab) =>
            tab.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            category.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      ])
      .filter(([, tabs]) => tabs.length > 0);
  }, [groupedTabs, searchTerm]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-10rem)]">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Navigation
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tabs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-2">
          <AnimatePresence>
            {filteredGroups.map(
              ([category, tabs]: any, categoryIndex: number) => {
                const isExpanded =
                  expandedCategories.has(category as string) || !!searchTerm;

                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: categoryIndex * 0.05 }}
                    className="space-y-1"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategory(category as string)}
                      className="w-full justify-between p-2 h-auto"
                    >
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {category}
                      </span>
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </motion.div>
                    </Button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-1 ml-2"
                        >
                          {tabs.map((tab: any, tabIndex: number) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                              <motion.button
                                key={tab.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: tabIndex * 0.02 }}
                                onClick={() => {
                                  onTabChange(tab.id);
                                  onClose();
                                }}
                                className={`w-full flex items-center space-x-3 px-3 py-2.5 text-left rounded-lg transition-all duration-200 group ${
                                  isActive
                                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                <Icon
                                  className={`h-4 w-4 flex-shrink-0 ${
                                    isActive
                                      ? "text-white"
                                      : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                                  }`}
                                />
                                <span className="text-sm font-medium truncate">
                                  {tab.label}
                                </span>
                                {isActive && (
                                  <motion.div
                                    layoutId="activeTab"
                                    className="ml-auto"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              }
            )}
          </AnimatePresence>
        </nav>
      </ScrollArea>
    </div>
  );
};

export const SpacetimeUI: React.FC<SpacetimeUIProps> = ({
  customEventCallbacks = {},
  enabledTabs,
  className = "",
  onLogout,
}) => {
  const { registerEventCallbacks, connection, isConnected } = useSpacetimeDB();
  const { connectionStatus, identity } = useAppSelector(
    (state) => state.spacetime
  );

  const [discoveredTables, setDiscoveredTables] = useState<TableMetadata[]>([]);
  const [discoveredReducers, setDiscoveredReducers] = useState<
    ReducerMetadata[]
  >([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (connection) {
      setIsDiscovering(true);
      setDiscoveryError(null);

      try {
        const tables = spacetimeIntrospector.discoverTables();
        const reducers = spacetimeIntrospector.discoverReducers();

        setDiscoveredTables(tables);
        setDiscoveredReducers(reducers);

        setEventLog((prev) => [
          ...prev.slice(-99),
          {
            timestamp: new Date(),
            type: "Discovery",
            message: `Discovered ${tables.length} tables and ${reducers.length} reducers`,
            severity: "success",
            source: "system",
          },
        ]);
      } catch (error) {
        setDiscoveryError(
          error instanceof Error ? error.message : "Discovery failed"
        );
        setEventLog((prev) => [
          ...prev.slice(-99),
          {
            timestamp: new Date(),
            type: "Discovery Error",
            message: "Failed to discover schema",
            severity: "error",
            source: "system",
          },
        ]);
      } finally {
        setIsDiscovering(false);
      }
    }
  }, [connection]);

  useEffect(() => {
    const defaultCallbacks: EventCallbacks = {
      ...customEventCallbacks,
    };
    registerEventCallbacks(defaultCallbacks);
  }, [registerEventCallbacks, customEventCallbacks]);

  const patternGrouper = new PatternGrouper(navigationConfig);

  const tabConfig = useMemo(() => {
    const baseTabs = [
      {
        id: "connection",
        label: "Connection",
        icon: Wifi,
        component: ConnectionManager,
        enabled: true,
        category: "Core",
      },
      {
        id: "events",
        label: "Events",
        icon: Zap,
        component: () => (
          <EventLogger
            events={eventLog}
            onClearEvents={() => setEventLog([])}
          />
        ),
        enabled: true,
        category: "Core",
      },
      {
        id: "debug",
        label: "Debug",
        icon: Settings,
        component: DebugPanel,
        enabled: true,
        category: "Core",
      },
    ];

    const tableItems: GroupableItem[] = discoveredTables.map((table) => ({
      id: `table-${table.name}`,
      name: table.name,
      label: table.displayName,
      category: "Tables",
      icon: table.icon,
      enabled: true,
      component: () => (
        <Suspense fallback={<LoadingSpinner />}>
          <DynamicTableViewer tableMetadata={table} />
        </Suspense>
      ),
    }));

    const reducerItems: GroupableItem[] = discoveredReducers.map(
      (reducer: ReducerMetadata) => ({
        id: `reducer-${reducer.name}`,
        name: reducer.name,
        label: reducer.displayName,
        category: "Reducers",
        icon: reducer.icon,
        enabled: true,
        component: () => (
          <Suspense fallback={<LoadingSpinner />}>
            <DynamicReducerTesting reducers={[reducer]} />
          </Suspense>
        ),
      })
    );

    const tablePatternGroups = patternGrouper.groupByPatterns(tableItems);
    const ungroupedTables = patternGrouper.getUngroupedItems(
      tableItems,
      tablePatternGroups
    );

    const reducerPatternGroups = patternGrouper.groupByPatterns(reducerItems);
    const ungroupedReducers = patternGrouper.getUngroupedItems(
      reducerItems,
      reducerPatternGroups
    );

    const tableTabs: TabItem[] = [
      ...tablePatternGroups
        .map((group) => {
          return group.items.map(
            (item): TabItem => ({
              id: item.id,
              label: item.label,
              icon: item.icon,
              component: item.component,
              enabled: item.enabled,
              category: `Tables - ${group.displayName}`,
            })
          );
        })
        .flat(),
      ...ungroupedTables.map(
        (item): TabItem => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          component: item.component,
          enabled: item.enabled,
          category: "Tables",
        })
      ),
    ];

    const reducerTabs: TabItem[] = [
      ...reducerPatternGroups
        .map((group) =>
          group.items.map(
            (item): TabItem => ({
              id: item.id,
              label: item.label,
              icon: item.icon,
              component: item.component,
              enabled: item.enabled,
              category: `Reducers - ${group.displayName}`,
            })
          )
        )
        .flat(),
      ...ungroupedReducers.map(
        (item): TabItem => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          component: item.component,
          enabled: item.enabled,
          category: "Reducers",
        })
      ),
    ];

    const allTabs: TabItem[] = [...baseTabs, ...tableTabs, ...reducerTabs];

    return enabledTabs
      ? allTabs.filter((tab) => enabledTabs.includes(tab.id) && tab.enabled)
      : allTabs.filter((tab) => tab.enabled);
  }, [
    discoveredTables,
    discoveredReducers,
    eventLog,
    enabledTabs,
    patternGrouper,
  ]);

  const groupedTabs = useMemo(() => {
    const groups = tabConfig.reduce((acc, tab) => {
      const category = tab.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(tab);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(groups).sort(([a], [b]) => {
      const categoryOrder = ["Core", "Tables", "Reducers"];

      const aParent = a.split(" - ")[0];
      const bParent = b.split(" - ")[0];

      const aParentIndex = categoryOrder.indexOf(aParent);
      const bParentIndex = categoryOrder.indexOf(bParent);

      if (aParentIndex !== -1 && bParentIndex !== -1) {
        if (aParentIndex !== bParentIndex) {
          return aParentIndex - bParentIndex;
        }

        const aIsBase = a === aParent;
        const bIsBase = b === bParent;

        if (aIsBase && !bIsBase) return -1;
        if (!aIsBase && bIsBase) return 1;

        return a.localeCompare(b);
      }

      if (aParentIndex !== -1 && bParentIndex === -1) return -1;
      if (aParentIndex === -1 && bParentIndex !== -1) return 1;

      return a.localeCompare(b);
    });
  }, [tabConfig]);

  useEffect(() => {
    if (tabConfig.length > 0 && !activeTab) {
      setActiveTab(tabConfig[0].id);
    }
  }, [tabConfig, activeTab]);

  const ActiveComponent = tabConfig.find(
    (tab) => tab.id === activeTab
  )?.component;

  const retryDiscovery = () => {};

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 ${className}`}
    >
      <div className="container mx-auto p-4 lg:p-6 max-w-7xl flex flex-col">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex-shrink-0"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4 w-full lg:w-auto">
              {/* Mobile menu button */}
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden flex-shrink-0"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-4 w-4" />
              </Button>

              <div className="min-w-0 flex-1">
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent"
                >
                  Spacetime Panel Dashboard
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm lg:text-lg text-gray-600 dark:text-gray-400 mt-1"
                >
                  Real-time database management interface
                </motion.p>
              </div>
            </div>

            {/* Status indicators and controls */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-3 w-full lg:w-auto"
            >
              {/* Discovery status */}
              <AnimatePresence>
                {isDiscovering && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Badge
                      variant="secondary"
                      className="flex items-center space-x-2"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Discovering Schema</span>
                    </Badge>
                  </motion.div>
                )}

                {discoveryError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center space-x-2"
                  >
                    <Badge
                      variant="destructive"
                      className="flex items-center space-x-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      <span>Discovery Failed</span>
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={retryDiscovery}
                    >
                      <RefreshCcw className="h-3 w-3" />
                    </Button>
                  </motion.div>
                )}

                {!isDiscovering &&
                  !discoveryError &&
                  (discoveredTables.length > 0 ||
                    discoveredReducers.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Badge
                        variant="default"
                        className="flex items-center space-x-2"
                      >
                        <CheckCircle className="h-3 w-3" />
                        <span>
                          {discoveredTables.length} Tables,{" "}
                          {discoveredReducers.length} Reducers
                        </span>
                      </Badge>
                    </motion.div>
                  )}
              </AnimatePresence>

              {/* Connection status */}
              <ConnectionStatusIndicator status={connectionStatus} />

              {/* Theme toggle */}
              <ThemeToggle />
            </motion.div>
          </div>
        </motion.div>

        {/* Main content area */}
        {tabConfig.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <Card className="text-center py-16">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mb-4">
                  <Database className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">
                  Welcome to Spacetime Panel Dashboard
                </CardTitle>
                <CardDescription className="text-lg mt-2">
                  Connect to your SpacetimeDB instance to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    This dashboard will automatically discover your tables and
                    reducers once connected.
                  </p>
                  {connectionStatus === "disconnected" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Button
                        onClick={() => setActiveTab("connection")}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                      >
                        <Wifi className="h-4 w-4 mr-2" />
                        Connect Now
                      </Button>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="flex gap-6 relative flex-1 min-h-0">
            {/* Sidebar */}
            <AnimatePresence>
              <div
                className={`
                   fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out
                   lg:relative lg:inset-y-auto lg:left-auto lg:transform-none lg:shadow-none lg:bg-transparent lg:flex-shrink-0
                   ${
                     sidebarOpen
                       ? "translate-x-0"
                       : "-translate-x-full lg:translate-x-0"
                   }
                 `}
              >
                {/* Mobile overlay */}
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                  />
                )}

                <div className="relative h-full lg:h-auto">
                  <Card className="h-full lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] border-0 lg:border shadow-none lg:shadow-sm flex flex-col">
                    <SidebarNavigation
                      groupedTabs={groupedTabs}
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      onClose={() => setSidebarOpen(false)}
                      onLogout={onLogout}
                    />
                  </Card>
                </div>
              </div>
            </AnimatePresence>

            {/* Main content */}
            <motion.div layout className="flex-1 min-w-0 overflow-hidden">
              <AnimatePresence mode="wait">
                {ActiveComponent && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    <Suspense fallback={<LoadingSpinner />}>
                      <ActiveComponent />
                    </Suspense>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpacetimeUI;
