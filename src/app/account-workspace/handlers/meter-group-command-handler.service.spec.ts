import { vi } from 'vitest';
import { MeterGroupCommandHandler } from './meter-group-command-handler.service';
import { IdbUtilityMeterGroup } from '../../models/idbModels/utilityMeterGroup';

describe('MeterGroupCommandHandler', () => {
  function createHandler() {
    const analysisDb = {
      addGroup: vi.fn().mockResolvedValue(undefined),
      deleteGroup: vi.fn().mockResolvedValue(undefined),
      changeGroupType: vi.fn().mockResolvedValue(undefined),
    };
    const accountReportDb = {
      addGroup: vi.fn().mockResolvedValue(undefined),
      updateReportsRemoveGroup: vi.fn().mockResolvedValue(undefined),
    };
    const handler = new MeterGroupCommandHandler(analysisDb as any, accountReportDb as any);
    return { handler, analysisDb, accountReportDb };
  }

  it('addGroup calls AnalysisDbService.addGroup and AccountReportDbService.addGroup', async () => {
    const { handler, analysisDb, accountReportDb } = createHandler();
    const group = { guid: 'g-1', groupType: 'Energy' } as IdbUtilityMeterGroup;

    await handler.addGroup(group);

    expect(analysisDb.addGroup).toHaveBeenCalledWith('g-1', 'Energy');
    expect(accountReportDb.addGroup).toHaveBeenCalledWith(group);
  });

  it('deleteGroup calls AnalysisDbService.deleteGroup and updateReportsRemoveGroup', async () => {
    const { handler, analysisDb, accountReportDb } = createHandler();

    await handler.deleteGroup('g-2');

    expect(analysisDb.deleteGroup).toHaveBeenCalledWith('g-2');
    expect(accountReportDb.updateReportsRemoveGroup).toHaveBeenCalledWith('g-2');
  });

  it('changeGroupType delegates to AnalysisDbService.changeGroupType only', async () => {
    const { handler, analysisDb, accountReportDb } = createHandler();

    await handler.changeGroupType('g-3', 'Water', 'Energy');

    expect(analysisDb.changeGroupType).toHaveBeenCalledWith('g-3', 'Water', 'Energy');
    expect(accountReportDb.updateReportsRemoveGroup).not.toHaveBeenCalled();
  });
});
