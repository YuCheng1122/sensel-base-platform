import type { OverviewSource } from "./contracts";
/** Only advertised scopes exist. `all` has no special meaning unless the provider advertises it. */
export function selectOverviewSource(
  sources: OverviewSource[],
  requested?: string,
): string | undefined {
  return sources.some((source) => source.id === requested)
    ? requested
    : sources[0]?.id;
}
