const { assert } = require('../qa-contract.cjs');

function createFixture() {
    const stamp = '2026-01-01T00:00:00.000Z';
    const entry = guid => ({ guid, createdDate: stamp, modifiedDate: stamp });
    const account = { ...entry('qaac00001'), name: 'QA Update Account', country: 'US', state: 'TN', city: 'Oak Ridge', address: '', size: 0,
        unitsOfMeasure: 'Imperial', energyUnit: 'MMBtu', electricityUnit: 'kWh', volumeLiquidUnit: 'gal', volumeGasUnit: 'SCF', massUnit: 'lb',
        fiscalYear: 'calendarYear', fiscalYearMonth: 0, fiscalYearCalendarEnd: true, energyIsSource: true, archiveOption: 'never', isSharedBackupFile: false,
        assessmentReportVersion: 'AR6', displayEmissions: false, notes: 'Synthetic installer/update fixture',
        dataStalenessSettings: { enabled: true, thresholdMonths: 18 },
        sustainabilityQuestions: { energyReductionGoal: true, energyReductionPercent: 25, energyReductionBaselineYear: 2024, energyReductionTargetYear: 2030, energyIsAbsolute: false,
            greenhouseReductionGoal: false, greenhouseReductionPercent: 0, greenhouseReductionBaselineYear: 2024, greenhouseReductionTargetYear: 2030, greenhouseIsAbsolute: true,
            waterReductionGoal: false, waterReductionPercent: 0, waterReductionBaselineYear: 2024, waterReductionTargetYear: 2030, waterIsAbsolute: false } };
    const facility = { ...account, ...entry('qafa00001'), accountId: account.guid, name: 'QA Facility', facilityOrder: 1, classification: 'Manufacturing', color: '#215e80' };
    for (const field of ['archiveOption', 'isSharedBackupFile', 'displayEmissions', 'assessmentReportVersion']) delete facility[field];
    const owner = { accountId: account.guid, facilityId: facility.guid };
    const group = { ...entry('qagr00001'), ...owner, name: 'QA Energy', groupType: 'Energy', visible: true };
    const meter = { ...entry('qame00001'), ...owner, groupId: group.guid, name: 'QA Electricity', meterNumber: 'QA-1', accountNumber: 1,
        source: 'Electricity', phase: 'Gas', startingUnit: 'kWh', energyUnit: 'kWh', demandUnit: 'kW', siteToSource: 3,
        supplier: 'Synthetic', scope: 3, agreementType: 1, includeInEnergy: true, retainRECs: false, directConnection: false,
        locationGHGMultiplier: 1, marketGHGMultiplier: 1, recsMultiplier: 0, greenPurchaseFraction: 0.5, charges: [], meterReadingDataApplication: 'fullMonth' };
    const predictor = { ...entry('qapr00001'), ...owner, name: 'QA Production', unit: 'widgets', predictorType: 'Standard', production: true, productionInAnalysis: true, weatherDataType: 'HDD' };
    const meterData = [], predictorDataV2 = [];
    for (let index = 0; index < 24; index++) {
        const month = index % 12 + 1, year = 2024 + Math.floor(index / 12);
        meterData.push({ ...entry(`qamd${String(index).padStart(5, '0')}`), ...owner, meterId: meter.guid, month, year, day: 1, migratedDates: true,
            totalEnergyUse: month === 2 ? 0 : 1000 + index * 10, totalCost: month === 2 ? 0 : 120 + index, checked: false, charges: [], isEstimated: false, isBillConnected: false });
        predictorDataV2.push({ ...entry(`qapd${String(index).padStart(5, '0')}`), ...owner, predictorId: predictor.guid, month, year, amount: month === 2 ? 0 : 100 + index,
            weatherDataWarning: false, weatherOverride: false, migratedDates: true, notes: 'Synthetic observation' });
    }
    const analysis = { ...entry('qaan00001'), ...owner, name: 'QA Facility Analysis', analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2024, hasBanking: false, isAnalysisVisited: false, checked: false,
        groups: [{ idbGroupId: group.guid, analysisType: 'absoluteEnergyConsumption', predictorVariables: [{ id: predictor.guid, name: predictor.name, production: true, productionInAnalysis: true, unit: predictor.unit }],
            specifiedMonthlyPercentBaseload: false, monthlyPercentBaseload: [], dataAdjustments: [], isGeneratedModel: false, models: [], baselineAdjustmentsV2: [], maxModelVariables: 4, applyBanking: false }] };
    const accountAnalysis = { ...entry('qaaa00001'), accountId: account.guid, name: 'QA Account Analysis', analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2024,
        facilityAnalysisItems: [{ facilityId: facility.guid, analysisItemId: analysis.guid }], facilityItemsInitialized: true, hasBanking: false, isAnalysisVisited: false, checked: false };
    return { dataVersion: 1, origin: 'VERIFI', backupFileType: 'Account', timeStamp: stamp, dataBackupId: 'qabk00001', account, facilities: [facility], groups: [group], meters: [meter], meterData,
        predictors: [predictor], predictorDataV2, facilityAnalysisItems: [analysis], accountAnalysisItems: [accountAnalysis],
        accountReports: [], predictorData: [], customEmissionsItems: [], customFuels: [], customGWPs: [], facilityReports: [], facilityEnergyUseGroups: [], facilityEnergyUseEquipment: [] };
}

const FIELDS = {
    accounts: ['guid', 'name', 'country', 'state', 'city', 'address', 'notes', 'unitsOfMeasure', 'energyUnit', 'electricityUnit', 'volumeLiquidUnit', 'volumeGasUnit', 'massUnit', 'fiscalYear', 'fiscalYearMonth', 'fiscalYearCalendarEnd', 'energyIsSource', 'archiveOption', 'isSharedBackupFile', 'dataBackupFilePath', 'dataBackupId', 'sustainabilityQuestions', 'dataStalenessSettings'],
    facilities: ['guid', 'accountId', 'name', 'country', 'state', 'city', 'classification', 'facilityOrder', 'color', 'unitsOfMeasure', 'energyUnit', 'electricityUnit', 'volumeLiquidUnit', 'volumeGasUnit', 'massUnit', 'fiscalYear', 'fiscalYearMonth', 'energyIsSource', 'sustainabilityQuestions', 'dataStalenessSettings'],
    utilityMeterGroups: ['guid', 'accountId', 'facilityId', 'name', 'groupType'],
    utilityMeter: ['guid', 'accountId', 'facilityId', 'groupId', 'name', 'meterNumber', 'accountNumber', 'source', 'startingUnit', 'energyUnit', 'siteToSource', 'demandUnit', 'includeInEnergy', 'retainRECs', 'directConnection', 'charges'],
    utilityMeterData: ['guid', 'accountId', 'facilityId', 'meterId', 'month', 'year', 'day', 'totalEnergyUse', 'totalCost', 'charges', 'isEstimated', 'isBillConnected'],
    predictors: ['guid', 'accountId', 'facilityId', 'name', 'unit', 'predictorType', 'production'],
    predictorData: ['guid', 'accountId', 'facilityId', 'predictorId', 'month', 'year', 'amount', 'notes'],
    analysisItems: ['guid', 'accountId', 'facilityId', 'name', 'analysisCategory', 'baselineYear', 'groups'],
    accountAnalysisItems: ['guid', 'accountId', 'name', 'analysisCategory', 'baselineYear', 'facilityAnalysisItems', 'facilityItemsInitialized', 'energyUnit', 'waterUnit', 'energyIsSource']
};

async function snapshot(page) {
    return page.evaluate(async fields => {
        if (!(await indexedDB.databases()).some(db => db.name === 'verifi')) throw new Error('VERIFI has not opened its database.');
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('verifi');
            request.onupgradeneeded = () => { request.transaction.abort(); reject(new Error('Cannot create or upgrade storage during inspection.')); };
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result, names = Object.keys(fields), result = {};
                let transaction;
                try { transaction = db.transaction(names, 'readonly'); } catch (error) { db.close(); reject(error); return; }
                for (const name of names) {
                    const read = transaction.objectStore(name).getAll();
                    read.onsuccess = () => { result[name] = read.result.map(row => Object.fromEntries(fields[name].filter(key => row[key] !== undefined).map(key => [key, row[key]]))).sort((a, b) => a.guid.localeCompare(b.guid)); };
                }
                transaction.oncomplete = () => { db.close(); resolve(result); };
                transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Inspection transaction aborted.')); };
            };
        });
    }, FIELDS);
}

function assertRelationships(data) {
    assert(data.accounts.length === 1 && data.accounts[0].name === 'QA Update Account', 'Expected exactly the disposable fixture account.');
    const account = data.accounts[0];
    for (const name of Object.keys(FIELDS).filter(name => name !== 'accounts')) for (const row of data[name]) assert(row.accountId === account.guid, `Lost account relationship: ${name}`);
    const contains = (store, guid) => data[store].some(row => row.guid === guid);
    for (const row of [...data.utilityMeter, ...data.utilityMeterGroups, ...data.predictors, ...data.analysisItems]) assert(contains('facilities', row.facilityId), 'Lost facility relationship.');
    for (const row of data.utilityMeter) assert(contains('utilityMeterGroups', row.groupId), 'Lost meter group relationship.');
    for (const row of data.utilityMeterData) assert(contains('utilityMeter', row.meterId), 'Lost meter-reading relationship.');
    for (const row of data.predictorData) assert(contains('predictors', row.predictorId), 'Lost predictor-reading relationship.');
    for (const row of data.analysisItems) for (const group of row.groups) {
        assert(contains('utilityMeterGroups', group.idbGroupId), 'Lost analysis group relationship.');
        for (const variable of group.predictorVariables) assert(contains('predictors', variable.id), 'Lost analysis predictor relationship.');
    }
    for (const row of data.accountAnalysisItems) for (const item of row.facilityAnalysisItems) assert(contains('facilities', item.facilityId) && contains('analysisItems', item.analysisItemId), 'Lost account-analysis relationship.');
    assert(data.facilities.length === 1 && data.utilityMeter.length === 1 && data.predictors.length === 1 && data.utilityMeterData.length === 24 && data.predictorData.length === 24 && data.analysisItems.length === 1 && data.accountAnalysisItems.length === 1, 'Incomplete fixture data.');
    return data;
}

function assertSeededValues(data) {
    assertRelationships(data);
    assert(data.accounts[0].energyUnit === 'MMBtu' && data.utilityMeter[0].startingUnit === 'kWh' && data.predictors[0].unit === 'widgets', 'Fixture units were not imported.');
    for (const row of data.utilityMeterData) {
        const index = (row.year - 2024) * 12 + row.month - 1;
        assert(index >= 0 && index < 24 && row.totalEnergyUse === (row.month === 2 ? 0 : 1000 + index * 10) && row.totalCost === (row.month === 2 ? 0 : 120 + index), 'Fixture meter values were not imported.');
    }
    for (const row of data.predictorData) {
        const index = (row.year - 2024) * 12 + row.month - 1;
        assert(index >= 0 && index < 24 && row.amount === (row.month === 2 ? 0 : 100 + index), 'Fixture predictor values were not imported.');
    }
    return data;
}
module.exports = { createFixture, FIELDS, snapshot, assertRelationships, assertSeededValues };
