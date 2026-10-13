import { firstValueFrom } from 'rxjs';
import { PredictorCommandHandler } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { MeterGroupCommandHandler } from '@data/account-workspace/handlers/meter-group-command-handler.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { dbConfig } from './_dbConfig';
import { IndexedDbTransactionService } from './indexed-db-transaction.service';
import { accountAFixture, accountBFixture, twoAccountPersistenceSeed } from './testing/indexed-db-test-fixtures';
import { IndexedDbTestHarness } from './testing/indexed-db-test-harness';

describe('native multi-store IndexedDB transactions in Chromium', () => {
  let harness: IndexedDbTestHarness;
  let transactionService: IndexedDbTransactionService;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('native-transactions');
    await harness.seed(twoAccountPersistenceSeed);
    transactionService = new IndexedDbTransactionService(indexedDB, {
      [harness.databaseName]: {
        ...dbConfig,
        name: harness.databaseName
      }
    });
  });

  afterEach(async () => {
    await harness.destroy();
  });

  it('supports read-only access across declared stores', async () => {
    const result = await transactionService.runTransaction(
      ['accounts', 'facilities'],
      'readonly',
      async transaction => {
        return {
          account: await transaction.get('accounts', accountAFixture.account.id as number),
          facilities: await transaction.getAllByIndex(
            'facilities',
            'accountId',
            accountAFixture.account.guid as string
          )
        };
      }
    );

    expect(result).toEqual({
      account: accountAFixture.account,
      facilities: [accountAFixture.facility]
    });
  });

  it('rejects indexed deletion from a read-only transaction with the native error', async () => {
    await expect(transactionService.runTransaction(
      ['facilities'],
      'readonly',
      transaction => transaction.deleteAllByIndex(
        'facilities',
        'accountId',
        accountAFixture.account.guid as string
      )
    )).rejects.toMatchObject({ name: 'ReadOnlyError' });

    expect(await harness.getAll('facilities')).toEqual([
      accountAFixture.facility,
      accountBFixture.facility
    ]);
  });

  it('commits writes to every participating store before resolving', async () => {
    const updatedAccount = { ...accountAFixture.account, name: 'Updated Account A' };

    await transactionService.runTransaction(
      ['accounts', 'facilities'],
      'readwrite',
      async transaction => {
        await transaction.put('accounts', updatedAccount);
        await transaction.deleteByKey('facilities', accountAFixture.facility.id as number);
      }
    );

    expect(await harness.getAll('accounts')).toEqual([updatedAccount, accountBFixture.account]);
    expect(await harness.getAll('facilities')).toEqual([accountBFixture.facility]);
    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([updatedAccount, accountBFixture.account]);
    expect(await harness.getAll('facilities')).toEqual([accountBFixture.facility]);
  });

  it('commits a grid-factor rename with its account and facility references in one transaction', async () => {
    const renamedSubregion = 'Renamed Custom Region';
    const updatedGridFactor = {
      ...accountAFixture.customEmissions,
      subregion: renamedSubregion
    };
    const updatedAccount = {
      ...accountAFixture.account,
      eGridSubregion: renamedSubregion
    };
    const updatedFacility = {
      ...accountAFixture.facility,
      eGridSubregion: renamedSubregion
    };

    await transactionService.runTransaction(
      ['customEmissionsItems', 'accounts', 'facilities'],
      'readwrite',
      async transaction => {
        await transaction.put('customEmissionsItems', updatedGridFactor);
        await transaction.put('accounts', updatedAccount);
        await transaction.put('facilities', updatedFacility);
      }
    );

    await harness.reopen();
    expect(await harness.getAll('customEmissionsItems')).toContainEqual(updatedGridFactor);
    expect(await harness.getAll('accounts')).toContainEqual(updatedAccount);
    expect(await harness.getAll('facilities')).toContainEqual(updatedFacility);
  });

  it('commits weather station membership, readings, and analysis references together', async () => {
    const newPredictor = {
      guid: 'weather-new', accountId: accountAFixture.account.guid,
      facilityId: accountAFixture.facility.guid, predictorType: 'Weather', weatherStationId: 'station-a'
    };
    const newReading = {
      guid: 'weather-reading-new', accountId: accountAFixture.account.guid,
      facilityId: accountAFixture.facility.guid, predictorId: 'weather-new', year: 2026, month: 1, amount: 10
    };
    const updatedAnalysis = { ...accountAFixture.facilityAnalysis, name: 'Weather membership updated' };

    await transactionService.runTransaction(
      ['predictor', 'predictorData', 'analysisItems'],
      'readwrite',
      async transaction => {
        await transaction.deleteByKey('predictorData', accountAFixture.predictorData.id as number);
        await transaction.deleteByKey('predictor', accountAFixture.predictor.id as number);
        await transaction.add('predictor', newPredictor);
        await transaction.add('predictorData', newReading);
        await transaction.put('analysisItems', updatedAnalysis);
      }
    );

    await harness.reopen();
    expect(await harness.getAll('predictor')).toContainEqual(expect.objectContaining({ guid: 'weather-new' }));
    expect(await harness.getAll('predictor')).not.toContainEqual(expect.objectContaining({ guid: accountAFixture.predictor.guid }));
    expect(await harness.getAll('predictorData')).toContainEqual(expect.objectContaining({ predictorId: 'weather-new' }));
    expect(await harness.getAll('analysisItems')).toContainEqual(updatedAnalysis);
  });

  it('rolls back a weather station membership change when a later write fails', async () => {
    await expect(transactionService.runTransaction(
      ['predictor', 'predictorData', 'analysisItems'],
      'readwrite',
      async transaction => {
        await transaction.deleteByKey('predictorData', accountAFixture.predictorData.id as number);
        await transaction.deleteByKey('predictor', accountAFixture.predictor.id as number);
        await transaction.put('analysisItems', { ...accountAFixture.facilityAnalysis, name: 'Must roll back' });
        await transaction.add('predictor', accountBFixture.predictor);
      }
    )).rejects.toBeDefined();

    await harness.reopen();
    expect(await harness.getAll('predictor')).toContainEqual(accountAFixture.predictor);
    expect(await harness.getAll('predictorData')).toContainEqual(accountAFixture.predictorData);
    expect(await harness.getAll('analysisItems')).toContainEqual(accountAFixture.facilityAnalysis);
  });

  it('rolls back compound standard predictor create, update, and delete commands', async () => {
    const handler = new PredictorCommandHandler({} as any, {} as any, transactionService);
    const accountGuid = accountAFixture.account.guid as string;
    const currentPredictor = {
      ...accountAFixture.predictor,
      predictorType: 'Standard'
    } as any;
    const invalidAnalysis = {
      ...accountAFixture.facilityAnalysis,
      unsupportedValue: () => 'cannot be cloned'
    } as any;
    const createdPredictor = {
      ...currentPredictor,
      id: undefined,
      guid: 'standard-create-rollback'
    };

    await expect(handler.createStandardPredictor({
      predictor: createdPredictor,
      facilityAnalyses: [invalidAnalysis]
    }, accountGuid)).rejects.toBeDefined();
    expect(await harness.getAll('predictor')).not.toContainEqual(
      expect.objectContaining({ guid: createdPredictor.guid })
    );

    await expect(handler.updateStandardPredictor({
      predictor: { ...currentPredictor, name: 'Must roll back' },
      facilityAnalyses: [invalidAnalysis]
    }, accountGuid)).rejects.toBeDefined();
    expect(await harness.getAll('predictor')).toContainEqual(accountAFixture.predictor);

    await expect(handler.deleteStandardPredictor({
      predictor: currentPredictor,
      predictorData: [accountAFixture.predictorData as any],
      facilityAnalyses: [invalidAnalysis]
    }, accountGuid)).rejects.toBeDefined();
    await harness.reopen();
    expect(await harness.getAll('predictor')).toContainEqual(accountAFixture.predictor);
    expect(await harness.getAll('predictorData')).toContainEqual(accountAFixture.predictorData);
    expect(await harness.getAll('analysisItems')).toContainEqual(accountAFixture.facilityAnalysis);
  });

  it('rolls back compound meter deletion when a later reading deletion fails', async () => {
    const handler = new MeterCommandHandler({} as any, {} as any, {} as any, transactionService);
    const meter = accountAFixture.meter as any;
    const meterData = accountAFixture.meterData as any;

    await expect(handler.deleteMeterWithData({
      meter,
      meterData: [meterData, { ...meterData, guid: 'invalid-key', id: BigInt(1) as any }]
    }, accountAFixture.account.guid as string)).rejects.toBeDefined();

    await harness.reopen();
    expect(await harness.getAll('utilityMeter')).toContainEqual(accountAFixture.meter);
    expect(await harness.getAll('utilityMeterData')).toContainEqual(accountAFixture.meterData);
  });

  it('atomically deletes a facility analysis and clears active and account-analysis references', async () => {
    const accountGuid = accountAFixture.account.guid as string;
    const facilityGuid = accountAFixture.facility.guid as string;
    const analysisGuid = accountAFixture.facilityAnalysis.guid as string;
    await transactionService.runTransaction(['facilities', 'accountAnalysisItems'], 'readwrite', async transaction => {
      await transaction.put('facilities', { ...accountAFixture.facility, selectedEnergyAnalysisId: analysisGuid });
      await transaction.put('accountAnalysisItems', {
        ...accountAFixture.accountAnalysis,
        facilityAnalysisItems: [{ facilityId: facilityGuid, analysisItemId: analysisGuid }]
      });
    });
    const handler = new AnalysisCommandHandler({} as any, {} as any, {} as any, transactionService);

    const result = await handler.deleteFacilityAnalysisAtomic({ accountGuid, facilityGuid, analysisGuid });

    expect(result).toMatchObject({ clearedAccountAnalysisCount: 1, clearedActiveSelection: true });
    await harness.reopen();
    expect(await harness.getAll('analysisItems')).not.toContainEqual(expect.objectContaining({ guid: analysisGuid }));
    expect(await harness.getAll('facilities')).toContainEqual(expect.objectContaining({ guid: facilityGuid, selectedEnergyAnalysisId: undefined }));
    expect(await harness.getAll('accountAnalysisItems')).toContainEqual(expect.objectContaining({
      guid: accountAFixture.accountAnalysis.guid,
      facilityAnalysisItems: [{ facilityId: facilityGuid, analysisItemId: undefined }]
    }));
  });

  it('atomically backfills and updates hidden account-analysis pairs for a single-facility account', async () => {
    const accountGuid = accountAFixture.account.guid as string;
    const facilityGuid = accountAFixture.facility.guid as string;
    const analysisGuid = accountAFixture.facilityAnalysis.guid as string;
    const account = {
      ...accountAFixture.account,
      isSingleFacilityCompany: true,
      energyUnit: 'MMBtu',
      volumeLiquidUnit: 'gal',
      energyIsSource: true,
      selectedEnergyAnalysisId: undefined,
      sustainabilityQuestions: {
        energyReductionBaselineYear: 2022,
        waterReductionBaselineYear: 2022
      }
    };
    const facility = {
      ...accountAFixture.facility,
      selectedEnergyAnalysisId: analysisGuid
    };
    const facilityAnalysis = {
      ...accountAFixture.facilityAnalysis,
      analysisCategory: 'energy',
      energyIsSource: true,
      energyUnit: 'MMBtu',
      waterUnit: 'gal',
      baselineYear: 2022,
      hasBanking: false,
      groups: [],
      modifiedDate: new Date('2026-10-13T00:00:00Z')
    };
    await transactionService.runTransaction(
      ['accounts', 'facilities', 'analysisItems'],
      'readwrite',
      async transaction => {
        await transaction.put('accounts', account);
        await transaction.put('facilities', facility);
        await transaction.put('analysisItems', facilityAnalysis);
      }
    );
    const handler = new AnalysisCommandHandler({} as any, {} as any, {} as any, transactionService);

    const synchronized = await handler.reconcileSingleFacilityAnalysisPairs(accountGuid);

    expect(synchronized.accountAnalyses).toHaveLength(1);
    const pair = synchronized.accountAnalyses[0];
    expect(pair).toMatchObject({
      accountId: accountGuid,
      name: facilityAnalysis.name,
      facilityAnalysisItems: [{ facilityId: facilityGuid, analysisItemId: analysisGuid }]
    });
    expect(synchronized.account?.selectedEnergyAnalysisId).toBe(pair.guid);
    await harness.reopen();
    expect(await harness.getAll('accountAnalysisItems')).toContainEqual(expect.objectContaining({
      guid: pair.guid,
      facilityAnalysisItems: [{ facilityId: facilityGuid, analysisItemId: analysisGuid }]
    }));

    await handler.updateFacilityAnalysisWithSingleSitePair({
      ...facilityAnalysis,
      name: 'Updated facility analysis',
      baselineYear: 2023
    } as any, accountGuid);

    await harness.reopen();
    expect(await harness.getAll('accountAnalysisItems')).toContainEqual(expect.objectContaining({
      guid: pair.guid,
      name: 'Updated facility analysis',
      baselineYear: 2023
    }));

    const copied = await handler.addFacilityAnalysisWithSingleSitePair({
      ...facilityAnalysis,
      id: undefined,
      guid: 'facility-analysis-copy',
      name: 'Copied facility analysis'
    } as any, accountGuid);

    expect(copied.analysis.id).toEqual(expect.any(Number));
    expect(copied.accountAnalyses).toContainEqual(expect.objectContaining({
      name: 'Copied facility analysis',
      facilityAnalysisItems: [{ facilityId: facilityGuid, analysisItemId: 'facility-analysis-copy' }]
    }));
    await harness.reopen();
    expect(await harness.getAll('analysisItems')).toContainEqual(expect.objectContaining({
      guid: 'facility-analysis-copy'
    }));
  });

  it('leaves the database unchanged when a report or banking workflow blocks analysis deletion', async () => {
    const accountGuid = accountAFixture.account.guid as string;
    const facilityGuid = accountAFixture.facility.guid as string;
    const analysisGuid = accountAFixture.facilityAnalysis.guid as string;
    const handler = new AnalysisCommandHandler({} as any, {} as any, {} as any, transactionService);
    await transactionService.runTransaction(['facilityReports'], 'readwrite', transaction => transaction.put('facilityReports', {
      ...accountAFixture.facilityReport,
      analysisItemId: analysisGuid
    }));

    await expect(handler.deleteFacilityAnalysisAtomic({ accountGuid, facilityGuid, analysisGuid }))
      .rejects.toThrow('linked facility report');
    expect(await harness.getAll('analysisItems')).toContainEqual(accountAFixture.facilityAnalysis);

    await transactionService.runTransaction(['facilityReports', 'analysisItems'], 'readwrite', async transaction => {
      await transaction.put('facilityReports', { ...accountAFixture.facilityReport, analysisItemId: undefined });
      await transaction.add('analysisItems', {
        guid: 'banking-consumer-a', accountId: accountGuid, facilityId: facilityGuid,
        name: 'Banking consumer', bankedAnalysisItemId: analysisGuid
      });
    });
    await expect(handler.deleteFacilityAnalysisAtomic({ accountGuid, facilityGuid, analysisGuid }))
      .rejects.toThrow('banking workflow');
    await harness.reopen();
    expect(await harness.getAll('analysisItems')).toContainEqual(accountAFixture.facilityAnalysis);
  });

  it('atomically deletes an account analysis and clears only its account active selection', async () => {
    const accountGuid = accountAFixture.account.guid as string;
    const analysisGuid = accountAFixture.accountAnalysis.guid as string;
    await transactionService.runTransaction(['accounts'], 'readwrite', transaction => transaction.put('accounts', {
      ...accountAFixture.account,
      selectedEnergyAnalysisId: analysisGuid
    }));
    const handler = new AnalysisCommandHandler({} as any, {} as any, {} as any, transactionService);

    const result = await handler.deleteAccountAnalysisAtomic({ accountGuid, analysisGuid });

    expect(result.clearedActiveSelection).toBe(true);
    await harness.reopen();
    expect(await harness.getAll('accountAnalysisItems')).not.toContainEqual(expect.objectContaining({ guid: analysisGuid }));
    expect(await harness.getAll('accounts')).toContainEqual(expect.objectContaining({
      guid: accountGuid,
      selectedEnergyAnalysisId: undefined
    }));
    expect(await harness.getAll('accounts')).toContainEqual(accountBFixture.account);
  });

  it('atomically creates facility analyses and links them to an account analysis', async () => {
    const accountGuid = accountAFixture.account.guid as string;
    const facilityGuid = accountAFixture.facility.guid as string;
    const analysisGuid = accountAFixture.accountAnalysis.guid as string;
    await transactionService.runTransaction(['accountAnalysisItems'], 'readwrite', transaction => transaction.put(
      'accountAnalysisItems',
      {
        ...accountAFixture.accountAnalysis,
        analysisCategory: 'energy',
        facilityAnalysisItems: [{ facilityId: facilityGuid, analysisItemId: undefined }]
      }
    ));
    const handler = new AnalysisCommandHandler({} as any, {} as any, {} as any, transactionService);
    const generated = {
      guid: 'bulk-analysis-a', accountId: accountGuid, facilityId: facilityGuid,
      analysisCategory: 'energy', name: 'Bulk analysis', groups: []
    } as any;

    const result = await handler.createBulkFacilityAnalysesForAccount({
      accountGuid, accountAnalysisGuid: analysisGuid, analyses: [generated]
    });

    expect(result.analyses[0].id).toEqual(expect.any(Number));
    await harness.reopen();
    expect(await harness.getAll('analysisItems')).toContainEqual(expect.objectContaining({ guid: 'bulk-analysis-a' }));
    expect(await harness.getAll('accountAnalysisItems')).toContainEqual(expect.objectContaining({
      guid: analysisGuid,
      facilityAnalysisItems: [{ facilityId: facilityGuid, analysisItemId: 'bulk-analysis-a' }]
    }));
  });

  it('rolls back every bulk-created analysis when a later generated record fails', async () => {
    const accountGuid = accountAFixture.account.guid as string;
    const facilityGuid = accountAFixture.facility.guid as string;
    const secondFacilityGuid = 'facility-a-second';
    const analysisGuid = accountAFixture.accountAnalysis.guid as string;
    await transactionService.runTransaction(['facilities', 'accountAnalysisItems'], 'readwrite', async transaction => {
      await transaction.add('facilities', {
        ...accountAFixture.facility,
        id: 901,
        guid: secondFacilityGuid
      });
      await transaction.put('accountAnalysisItems', {
        ...accountAFixture.accountAnalysis,
        analysisCategory: 'energy',
        facilityAnalysisItems: [
          { facilityId: facilityGuid, analysisItemId: undefined },
          { facilityId: secondFacilityGuid, analysisItemId: undefined }
        ]
      });
    });
    const handler = new AnalysisCommandHandler({} as any, {} as any, {} as any, transactionService);
    const valid = {
      guid: 'bulk-analysis-first', accountId: accountGuid, facilityId: facilityGuid,
      analysisCategory: 'energy', name: 'First', groups: []
    } as any;
    const invalid = {
      guid: 'bulk-analysis-second', accountId: accountGuid, facilityId: secondFacilityGuid,
      analysisCategory: 'energy', name: 'Second', groups: [], invalidCloneValue: () => undefined
    } as any;

    await expect(handler.createBulkFacilityAnalysesForAccount({
      accountGuid, accountAnalysisGuid: analysisGuid, analyses: [valid, invalid]
    })).rejects.toBeDefined();

    await harness.reopen();
    expect(await harness.getAll('analysisItems')).not.toContainEqual(expect.objectContaining({ guid: 'bulk-analysis-first' }));
    expect(await harness.getAll('accountAnalysisItems')).toContainEqual(expect.objectContaining({
      guid: analysisGuid,
      facilityAnalysisItems: [
        { facilityId: facilityGuid, analysisItemId: undefined },
        { facilityId: secondFacilityGuid, analysisItemId: undefined }
      ]
    }));
  });

  it('atomically creates and links one facility analysis, replacing only the selected facility link', async () => {
    const accountGuid = accountAFixture.account.guid as string;
    const facilityGuid = accountAFixture.facility.guid as string;
    const accountAnalysisGuid = accountAFixture.accountAnalysis.guid as string;
    await transactionService.runTransaction(['facilities', 'accountAnalysisItems'], 'readwrite', async transaction => {
      await transaction.put('facilities', {
        ...accountAFixture.facility,
        sustainabilityQuestions: { energyReductionBaselineYear: 2020, waterReductionBaselineYear: 2021 }
      });
      await transaction.put('accountAnalysisItems', {
        ...accountAFixture.accountAnalysis,
        analysisCategory: 'energy', energyIsSource: true, baselineYear: 2022,
        facilityAnalysisItems: [{ facilityId: facilityGuid, analysisItemId: accountAFixture.facilityAnalysis.guid }]
      });
    });
    const handler = new AnalysisCommandHandler({} as any, {} as any, {} as any, transactionService);

    const result = await handler.createLinkedFacilityAnalysisForAccount({
      accountGuid,
      accountAnalysisGuid,
      facilityGuid,
      analysis: {
        guid: 'linked-analysis-a', accountId: accountGuid, facilityId: facilityGuid,
        analysisCategory: 'energy', energyIsSource: true, baselineYear: 2022,
        name: 'Linked analysis', groups: []
      } as any
    });

    expect(result.analysis.id).toEqual(expect.any(Number));
    await harness.reopen();
    expect(await harness.getAll('analysisItems')).toContainEqual(expect.objectContaining({ guid: 'linked-analysis-a' }));
    expect(await harness.getAll('accountAnalysisItems')).toContainEqual(expect.objectContaining({
      guid: accountAnalysisGuid,
      facilityAnalysisItems: [{ facilityId: facilityGuid, analysisItemId: 'linked-analysis-a' }]
    }));
  });

  it('rolls back the account link when the linked analysis cannot be stored', async () => {
    const accountGuid = accountAFixture.account.guid as string;
    const facilityGuid = accountAFixture.facility.guid as string;
    const accountAnalysisGuid = accountAFixture.accountAnalysis.guid as string;
    const originalLinks = [{ facilityId: facilityGuid, analysisItemId: accountAFixture.facilityAnalysis.guid }];
    await transactionService.runTransaction(['facilities', 'accountAnalysisItems'], 'readwrite', async transaction => {
      await transaction.put('facilities', {
        ...accountAFixture.facility,
        sustainabilityQuestions: { energyReductionBaselineYear: 2020, waterReductionBaselineYear: 2021 }
      });
      await transaction.put('accountAnalysisItems', {
        ...accountAFixture.accountAnalysis,
        analysisCategory: 'energy', energyIsSource: true, baselineYear: 2022,
        facilityAnalysisItems: originalLinks
      });
    });
    const handler = new AnalysisCommandHandler({} as any, {} as any, {} as any, transactionService);

    await expect(handler.createLinkedFacilityAnalysisForAccount({
      accountGuid,
      accountAnalysisGuid,
      facilityGuid,
      analysis: {
        guid: 'linked-analysis-invalid', accountId: accountGuid, facilityId: facilityGuid,
        analysisCategory: 'energy', energyIsSource: true, baselineYear: 2022,
        name: 'Invalid analysis', groups: [], invalidCloneValue: () => undefined
      } as any
    })).rejects.toBeDefined();

    await harness.reopen();
    expect(await harness.getAll('analysisItems')).not.toContainEqual(expect.objectContaining({ guid: 'linked-analysis-invalid' }));
    expect(await harness.getAll('accountAnalysisItems')).toContainEqual(expect.objectContaining({
      guid: accountAnalysisGuid,
      facilityAnalysisItems: originalLinks
    }));
  });

  it('rejects linked and cross-account account-analysis deletion without changing records', async () => {
    const accountGuid = accountAFixture.account.guid as string;
    const analysisGuid = accountAFixture.accountAnalysis.guid as string;
    const handler = new AnalysisCommandHandler({} as any, {} as any, {} as any, transactionService);
    await transactionService.runTransaction(['accountReports'], 'readwrite', transaction => transaction.put('accountReports', {
      ...accountAFixture.accountReport,
      reportType: 'analysis',
      analysisReportSetup: { analysisItemId: analysisGuid }
    }));

    await expect(handler.deleteAccountAnalysisAtomic({ accountGuid, analysisGuid }))
      .rejects.toThrow('linked account report');
    await expect(handler.deleteAccountAnalysisAtomic({
      accountGuid: accountBFixture.account.guid as string,
      analysisGuid
    })).rejects.toThrow('missing or does not belong');

    await harness.reopen();
    expect(await harness.getAll('accountAnalysisItems')).toContainEqual(accountAFixture.accountAnalysis);
  });

  it('rolls back meter-group creation when a related analysis write fails', async () => {
    const invalidAnalysis = {
      ...accountAFixture.facilityAnalysis,
      id: BigInt(1) as any,
      analysisCategory: 'energy',
      groups: []
    };
    const workspace = {
      facilityAnalyses: () => [invalidAnalysis],
      accountReports: () => [],
      predictors: () => []
    };
    const handler = new MeterGroupCommandHandler(
      {} as any,
      {} as any,
      workspace as any,
      {} as any,
      transactionService
    );
    const group = {
      guid: 'group-create-rollback',
      accountId: accountAFixture.account.guid,
      facilityId: accountAFixture.facility.guid,
      groupType: 'Energy'
    } as any;

    await expect(handler.createMeterGroup(group, accountAFixture.account.guid as string)).rejects.toBeDefined();

    await harness.reopen();
    expect(await harness.getAll('utilityMeterGroups')).not.toContainEqual(
      expect.objectContaining({ guid: group.guid })
    );
    expect(await harness.getAll('analysisItems')).toContainEqual(accountAFixture.facilityAnalysis);
  });

  it('commits or rolls back every output in a weather station month together', async () => {
    const first = {
      ...accountAFixture.predictorData, guid: 'station-month-hdd',
      predictorId: 'weather-hdd', year: 2026, month: 4, amount: 12
    };
    delete first.id;
    const second = {
      ...accountAFixture.predictorData, guid: 'station-month-humidity',
      predictorId: 'weather-humidity', year: 2026, month: 4, amount: 55
    };
    delete second.id;
    await transactionService.runTransaction(['predictorData'], 'readwrite', async transaction => {
      await transaction.add('predictorData', first);
      await transaction.add('predictorData', second);
    });
    const committed = (await harness.getAll('predictorData')).filter((item: any) => item.year === 2026 && item.month === 4);
    expect(committed).toHaveLength(2);

    await expect(transactionService.runTransaction(['predictorData'], 'readwrite', async transaction => {
      await transaction.put('predictorData', { ...committed[0], amount: 99 });
      await transaction.deleteByKey('predictorData', committed[1].id as number);
      await transaction.add('predictorData', { ...first, id: committed[0].id });
    })).rejects.toBeDefined();

    await harness.reopen();
    const afterRollback = (await harness.getAll('predictorData')).filter((item: any) => item.year === 2026 && item.month === 4);
    expect(afterRollback).toEqual(committed);
  });

  it('rolls back all grid-factor rename records when a later write fails', async () => {
    const updatedGridFactor = { ...accountAFixture.customEmissions, subregion: 'Must Roll Back' };
    const updatedAccount = { ...accountAFixture.account, eGridSubregion: 'Must Roll Back' };
    const updatedFacility = { ...accountAFixture.facility, eGridSubregion: 'Must Roll Back' };

    await expect(transactionService.runTransaction(
      ['customEmissionsItems', 'accounts', 'facilities'],
      'readwrite',
      async transaction => {
        await transaction.put('customEmissionsItems', updatedGridFactor);
        await transaction.put('accounts', updatedAccount);
        await transaction.put('facilities', updatedFacility);
        await transaction.add('facilities', accountBFixture.facility);
      }
    )).rejects.toBeDefined();

    await harness.reopen();
    expect(await harness.getAll('customEmissionsItems')).toContainEqual(accountAFixture.customEmissions);
    expect(await harness.getAll('accounts')).toContainEqual(accountAFixture.account);
    expect(await harness.getAll('facilities')).toContainEqual(accountAFixture.facility);
  });

  it('rolls back earlier writes when a later request fails', async () => {
    const updatedAccount = { ...accountAFixture.account, name: 'Must Roll Back' };

    await expect(transactionService.runTransaction(
      ['accounts', 'facilities'],
      'readwrite',
      async transaction => {
        await transaction.put('accounts', updatedAccount);
        await transaction.add('facilities', accountBFixture.facility);
      }
    )).rejects.toBeDefined();

    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([
      accountAFixture.account,
      accountBFixture.account
    ]);
    expect(await harness.getAll('facilities')).toEqual([
      accountAFixture.facility,
      accountBFixture.facility
    ]);
  });

  it('aborts when an operation accesses an undeclared store', async () => {
    await expect(transactionService.runTransaction(
      ['accounts'],
      'readwrite',
      async transaction => {
        await transaction.put('accounts', { ...accountAFixture.account, name: 'Must Roll Back' });
        await transaction.getAll('facilities');
      }
    )).rejects.toThrow('is not part of the active transaction');

    expect(await firstValueFrom(harness.dbService.getByKey('accounts', 1)))
      .toEqual(accountAFixture.account);
  });
});
