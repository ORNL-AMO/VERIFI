import type { AnalysisCategory } from '@data/models/analysis';
export type AnalysisNavItem = {
  readonly guid: string;
  readonly label: string;
  readonly icon: 'energy' | 'droplet' | 'analysis';
  readonly route: readonly string[];
  readonly expanded: boolean;
};

export type AnalysisNavGroup = {
  readonly id: 'active' | 'energy' | 'water';
  readonly label: string;
  readonly items: readonly AnalysisNavItem[];
};


export function buildAnalysisNavGroups(
  source: readonly { guid: string; name: string; analysisCategory: AnalysisCategory }[],
  selection: { selectedEnergyAnalysisId?: string; selectedWaterAnalysisId?: string },
  activeAnalysisGuid: string | undefined,
  route: (guid: string) => readonly string[],
  showCategory = true
): readonly AnalysisNavGroup[] {
  const analyses = source.map(analysis => ({
    guid: analysis.guid, label: analysis.name || 'Untitled analysis', category: analysis.analysisCategory,
    icon: !showCategory ? 'analysis' as const : analysis.analysisCategory === 'water' ? 'droplet' as const : 'energy' as const,
    route: route(analysis.guid), expanded: analysis.guid === activeAnalysisGuid
  }));
  const active = [
    analyses.find(item => item.category === 'energy' && item.guid === selection.selectedEnergyAnalysisId),
    analyses.find(item => item.category === 'water' && item.guid === selection.selectedWaterAnalysisId)
  ].filter((item): item is NonNullable<typeof item> => !!item);
  const activeGuids = new Set(active.map(item => item.guid));
  const sortByName = (first: AnalysisNavItem, second: AnalysisNavItem) => first.label.localeCompare(second.label) || first.guid.localeCompare(second.guid);
  const groups: AnalysisNavGroup[] = [
    { id: 'active', label: 'Active for Reporting', items: active },
    { id: 'energy', label: showCategory ? 'Energy' : 'Analyses', items: analyses.filter(item => item.category === 'energy' && !activeGuids.has(item.guid)).sort(sortByName) },
    { id: 'water', label: showCategory ? 'Water' : 'Analyses', items: analyses.filter(item => item.category === 'water' && !activeGuids.has(item.guid)).sort(sortByName) }
  ];
  return groups.filter(group => group.items.length > 0);
}
