import { remapStatusWarningDismissals, StatusWarningDismissalGuidMaps } from './status-warning-dismissal-remap';

describe('status warning dismissal backup remapping', () => {
  const maps: StatusWarningDismissalGuidMaps = {
    account: { oldId: 'account-old', newId: 'account-new' },
    facilities: [{ oldId: 'facility-old', newId: 'facility-new' }],
    meters: [{ oldId: 'meter-old', newId: 'meter-new' }],
    meterGroups: [{ oldId: 'group-old', newId: 'group-new' }],
    predictors: [{ oldId: 'predictor-old', newId: 'predictor-new' }],
    facilityAnalyses: [{ oldId: 'analysis-old', newId: 'analysis-new' }],
    accountAnalyses: [{ oldId: 'account-analysis-old', newId: 'account-analysis-new' }],
    facilityReports: [{ oldId: 'facility-report-old', newId: 'facility-report-new' }],
    accountReports: [{ oldId: 'account-report-old', newId: 'account-report-new' }]
  };

  it('remaps every supported status entity and compound analysis-group IDs', () => {
    const kindsAndGuids = [
      ['account', 'account-old', 'account-new'],
      ['facility', 'facility-old', 'facility-new'],
      ['meter', 'meter-old', 'meter-new'],
      ['predictor', 'predictor-old', 'predictor-new'],
      ['facility-analysis', 'analysis-old', 'analysis-new'],
      ['account-analysis', 'account-analysis-old', 'account-analysis-new'],
      ['facility-report', 'facility-report-old', 'facility-report-new'],
      ['account-report', 'account-report-old', 'account-report-new'],
      ['analysis-group', 'analysis-old:group-old', 'analysis-new:group-new']
    ];
    const dismissals = kindsAndGuids.map(([kind, oldGuid]) => ({
      findingId: `rule.code:${kind}:${oldGuid}`,
      evidenceSignature: 'signature',
      discardedAt: '2026-09-18T12:00:00.000Z'
    }));

    expect(remapStatusWarningDismissals(dismissals, maps).map(item => item.findingId)).toEqual(
      kindsAndGuids.map(([kind, , newGuid]) => `rule.code:${kind}:${newGuid}`)
    );
  });

  it('drops malformed, unsupported, and stale entity references', () => {
    const dismissals = [
      { findingId: 'malformed', evidenceSignature: 'a', discardedAt: '2026-09-18T12:00:00.000Z' },
      { findingId: 'rule.code:unknown:entity-old', evidenceSignature: 'b', discardedAt: '2026-09-18T12:00:00.000Z' },
      { findingId: 'rule.code:meter:missing-meter', evidenceSignature: 'c', discardedAt: '2026-09-18T12:00:00.000Z' }
    ];

    expect(remapStatusWarningDismissals(dismissals, maps)).toEqual([]);
  });
});
