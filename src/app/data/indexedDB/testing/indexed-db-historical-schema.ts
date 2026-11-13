/** Frozen schema used to exercise upgrades from actual pre-visualization databases. */
export const VERSION_20_INDEXES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'accounts': {
    'name': 'name',
    'industry': 'industry',
    'naics': 'naics',
    'notes': 'notes',
    'guid': 'guid'
  },
  'facilities': {
    'accountId': 'accountId',
    'name': 'name',
    'country': 'country',
    'state': 'state',
    'address': 'address',
    'size': 'size',
    'units': 'units',
    'guid': 'guid'
  },
  'utilityMeter': {
    'facilityId': 'facilityId',
    'accountId': 'accountId',
    'groupId': 'groupId',
    'meterNumber': 'meterNumber',
    'accountNumber': 'accountNumber',
    'type': 'type',
    'phase': 'phase',
    'unit': 'unit',
    'heatCapacity': 'heatCapacity',
    'siteToSource': 'siteToSource',
    'name': 'name',
    'location': 'location',
    'supplier': 'supplier',
    'notes': 'notes',
    'guid': 'guid'
  },
  'utilityMeterData': {
    'meterId': 'meterId',
    'facilityId': 'facilityId',
    'accountId': 'accountId',
    'unit': 'unit',
    'totalEnergyUse': 'totalEnergyUse',
    'totalCost': 'totalCost',
    'checked': 'checked',
    'totalDemand': 'totalDemand',
    'guid': 'guid'
  },
  'utilityMeterGroups': {
    'facilityId': 'facilityId',
    'accountId': 'accountId',
    'groupType': 'groupType',
    'name': 'name',
    'description': 'description',
    'unit': 'unit',
    'dateModified': 'dateModified',
    'factionOfTotalEnergy': 'factionOfTotalEnergy',
    'guid': 'guid'
  },
  'predictors': {
    'facilityId': 'facilityId',
    'accountId': 'accountId',
    'name': 'name',
    'description': 'description',
    'unit': 'unit',
    'date': 'date',
    'amount': 'amount',
    'guid': 'guid'
  },
  'analysisItems': {
    'accountId': 'accountId',
    'facilityId': 'facilityId',
    'guid': 'guid'
  },
  'accountAnalysisItems': {
    'accountId': 'accountId',
    'guid': 'guid'
  },
  'customEmissionsItems': {
    'accountId': 'accountId',
    'guid': 'guid'
  },
  'accountReports': {
    'accountId': 'accountId',
    'guid': 'guid'
  },
  'electronBackups': {
    'guid': 'guid',
    'accountId': 'accountId'
  },
  'analyticsData': {
    'clientId': 'clientId',
    'modifiedDate': 'modifiedDate'
  },
  'customFuels': {
    'accountId': 'accountId',
    'guid': 'guid'
  },
  'customGWP': {
    'accountId': 'accountId',
    'guid': 'guid'
  },
  'predictor': {
    'accountId': 'accountId',
    'facilityId': 'facilityId',
    'guid': 'guid'
  },
  'predictorData': {
    'accountId': 'accountId',
    'facilityId': 'facilityId',
    'predictorId': 'predictorId',
    'guid': 'guid'
  },
  'facilityReports': {
    'accountId': 'accountId',
    'facilityId': 'facilityId',
    'guid': 'guid'
  },
  'application': {
    'guid': 'guid'
  },
  'facilityEnergyUseGroups': {
    'accountId': 'accountId',
    'facilityId': 'facilityId',
    'guid': 'guid'
  },
  'facilityEnergyUseEquipment': {
    'accountId': 'accountId',
    'facilityId': 'facilityId',
    'guid': 'guid',
    'energyUseGroupId': 'energyUseGroupId'
  }
};

export function historicalIndexes(version: 19 | 20, storeName: string): Record<string, string> {
  const indexes = { ...VERSION_20_INDEXES[storeName] };
  if (version === 19) {
    delete indexes.guid;
    if (storeName === 'electronBackups') delete indexes.accountId;
    if (storeName === 'facilityEnergyUseEquipment') delete indexes.energyUseGroupId;
    if (storeName === 'utilityMeter') indexes.location = 'notes';
  }
  return indexes;
}
