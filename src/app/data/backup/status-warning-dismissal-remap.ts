import { StatusWarningDismissal } from '@data/models/status-warning-dismissal';

export interface GuidPair {
  readonly oldId: string;
  readonly newId: string;
}

export interface StatusWarningDismissalGuidMaps {
  readonly account: GuidPair;
  readonly facilities: readonly GuidPair[];
  readonly meters: readonly GuidPair[];
  readonly meterGroups: readonly GuidPair[];
  readonly predictors: readonly GuidPair[];
  readonly facilityAnalyses: readonly GuidPair[];
  readonly accountAnalyses: readonly GuidPair[];
  readonly facilityReports: readonly GuidPair[];
  readonly accountReports: readonly GuidPair[];
}

export function remapStatusWarningDismissals(
  dismissals: unknown,
  maps: StatusWarningDismissalGuidMaps
): StatusWarningDismissal[] {
  if (!Array.isArray(dismissals)) return [];

  return dismissals.flatMap(dismissal => {
    if (!isStatusWarningDismissal(dismissal)) return [];
    const parsed = parseFindingId(dismissal.findingId);
    if (!parsed) return [];
    const guid = remapEntityGuid(parsed.kind, parsed.guid, maps);
    return guid ? [{
      findingId: `${parsed.code}:${parsed.kind}:${guid}`,
      evidenceSignature: dismissal.evidenceSignature,
      discardedAt: dismissal.discardedAt
    }] : [];
  });
}

function isStatusWarningDismissal(value: unknown): value is StatusWarningDismissal {
  if (!value || typeof value !== 'object') return false;
  const dismissal = value as Record<string, unknown>;
  return typeof dismissal['findingId'] === 'string'
    && typeof dismissal['evidenceSignature'] === 'string'
    && typeof dismissal['discardedAt'] === 'string';
}

function parseFindingId(findingId: string): { code: string; kind: string; guid: string } | undefined {
  const firstSeparator = findingId.indexOf(':');
  const secondSeparator = findingId.indexOf(':', firstSeparator + 1);
  if (firstSeparator <= 0 || secondSeparator <= firstSeparator + 1 || secondSeparator === findingId.length - 1) {
    return undefined;
  }
  return {
    code: findingId.slice(0, firstSeparator),
    kind: findingId.slice(firstSeparator + 1, secondSeparator),
    guid: findingId.slice(secondSeparator + 1)
  };
}

function remapEntityGuid(kind: string, guid: string, maps: StatusWarningDismissalGuidMaps): string | undefined {
  switch (kind) {
    case 'account': return guid === maps.account.oldId ? maps.account.newId : undefined;
    case 'facility': return mappedGuid(guid, maps.facilities);
    case 'meter': return mappedGuid(guid, maps.meters);
    case 'predictor': return mappedGuid(guid, maps.predictors);
    case 'facility-analysis': return mappedGuid(guid, maps.facilityAnalyses);
    case 'account-analysis': return mappedGuid(guid, maps.accountAnalyses);
    case 'facility-report': return mappedGuid(guid, maps.facilityReports);
    case 'account-report': return mappedGuid(guid, maps.accountReports);
    case 'analysis-group': return remapAnalysisGroupGuid(guid, maps);
    default: return undefined;
  }
}

function remapAnalysisGroupGuid(guid: string, maps: StatusWarningDismissalGuidMaps): string | undefined {
  const separator = guid.indexOf(':');
  if (separator <= 0 || separator === guid.length - 1) return undefined;
  const analysisGuid = mappedGuid(guid.slice(0, separator), maps.facilityAnalyses);
  const groupGuid = mappedGuid(guid.slice(separator + 1), maps.meterGroups);
  return analysisGuid && groupGuid ? `${analysisGuid}:${groupGuid}` : undefined;
}

function mappedGuid(guid: string, pairs: readonly GuidPair[]): string | undefined {
  return pairs.find(pair => pair.oldId === guid)?.newId;
}
