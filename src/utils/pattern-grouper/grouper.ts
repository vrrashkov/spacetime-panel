import type { NavigationConfig } from "@/config/navigation";
import type { GroupableItem, PatternGroup } from "./types";
import { getPatternIcon } from "./icons";

export class PatternGrouper {
  constructor(private config: NavigationConfig) {}

  groupByPatterns<T extends GroupableItem>(items: T[]): PatternGroup[] {
    if (!this.config.enablePatternGrouping || this.config.patternDepth === 0) {
      return [];
    }

    const patterns = this.extractPatterns(items);
    let groups = this.createGroups(patterns, items);

    groups = this.filterAndLimitGroups(groups);
    return this.sortGroups(groups);
  }

  getUngroupedItems<T extends GroupableItem>(
    items: T[],
    groups: PatternGroup[]
  ): T[] {
    if (!this.config.showUngroupedInBase) return [];

    const groupedItemIds = new Set(
      groups.flatMap((group) => group.items.map((item) => item.id))
    );

    return items.filter((item) => !groupedItemIds.has(item.id));
  }

  private extractPatterns(
    items: GroupableItem[]
  ): Map<string, GroupableItem[]> {
    const patternMap = new Map<string, GroupableItem[]>();

    items.forEach((item) => {
      this.getItemPatterns(item.name).forEach((pattern) => {
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, []);
        }
        patternMap.get(pattern)!.push(item);
      });
    });

    return patternMap;
  }

  private getItemPatterns(name: string): string[] {
    const parts = name.split(this.config.patternSeparator);
    const patterns: string[] = [];

    for (
      let depth = 1;
      depth <= Math.min(this.config.patternDepth, parts.length - 1);
      depth++
    ) {
      patterns.push(parts.slice(0, depth).join(this.config.patternSeparator));
    }

    return patterns;
  }

  private createGroups(
    patternMap: Map<string, GroupableItem[]>,
    allItems: GroupableItem[]
  ): PatternGroup[] {
    const groups: PatternGroup[] = [];
    const processedPatterns = new Set<string>();

    const sortedPatterns = Array.from(patternMap.entries()).sort(([a], [b]) => {
      const depthA = a.split(this.config.patternSeparator).length;
      const depthB = b.split(this.config.patternSeparator).length;
      return depthB - depthA;
    });

    sortedPatterns.forEach(([pattern, items]) => {
      if (
        items.length < this.config.minGroupSize ||
        processedPatterns.has(pattern)
      ) {
        return;
      }

      const availableItems = items.filter(
        (item) =>
          !groups.some((group) =>
            group.items.some((groupItem) => groupItem.id === item.id)
          )
      );

      if (availableItems.length >= this.config.minGroupSize) {
        groups.push({
          pattern,
          displayName: this.formatPatternDisplayName(pattern),
          items: availableItems,
          depth: pattern.split(this.config.patternSeparator).length,
          icon: this.config.usePatternIcons
            ? getPatternIcon(pattern)
            : undefined,
        });

        processedPatterns.add(pattern);
      }
    });

    return groups;
  }

  private filterAndLimitGroups(groups: PatternGroup[]): PatternGroup[] {
    let filtered = groups.filter(
      (group) => group.items.length >= this.config.minGroupSize
    );

    if (this.config.collapseSingleGroups) {
      filtered = filtered.filter((group) => group.items.length > 1);
    }

    if (filtered.length > this.config.maxGroups) {
      filtered = filtered
        .sort((a, b) => b.items.length - a.items.length)
        .slice(0, this.config.maxGroups);
    }

    return filtered;
  }

  private sortGroups(groups: PatternGroup[]): PatternGroup[] {
    switch (this.config.groupSortBy) {
      case "size":
        return groups.sort((a, b) => b.items.length - a.items.length);
      case "depth":
        return groups.sort((a, b) => {
          if (a.depth !== b.depth) return a.depth - b.depth;
          return a.displayName.localeCompare(b.displayName);
        });
      default:
        return groups.sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        );
    }
  }

  private formatPatternDisplayName(pattern: string): string {
    return pattern
      .split(this.config.patternSeparator)
      .filter((part) => part.trim())
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}
