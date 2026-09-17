import { group, meter } from '../facility-meters.testing';
import {
  UNGROUPED_DROP_TARGET_ID,
  buildMeterGroupSections,
  canAssignSourceToGroup
} from './meter-grouping.models';

describe('meter grouping models', () => {
  it('matches energy and water sources to compatible group types', () => {
    expect(canAssignSourceToGroup('Electricity', group({ groupType: 'Energy' }))).toBe(true);
    expect(canAssignSourceToGroup('Water Intake', group({ groupType: 'Energy' }))).toBe(false);
    expect(canAssignSourceToGroup('Water Discharge', group({ groupType: 'Water' }))).toBe(true);
    expect(canAssignSourceToGroup('Natural Gas', group({ groupType: 'Water' }))).toBe(false);
    expect(canAssignSourceToGroup('Other', group({ groupType: 'Other' }))).toBe(true);
    expect(canAssignSourceToGroup('Electricity')).toBe(true);
  });

  it('keeps meters without a group in the ungrouped section', () => {
    const sections = buildMeterGroupSections(
      [meter({ guid: 'meter-a', groupId: undefined })],
      [],
      [group({ guid: 'group-a', groupType: 'Energy' })]
    );

    expect(sections.at(-1)).toMatchObject({
      id: UNGROUPED_DROP_TARGET_ID,
      label: 'Ungrouped',
      tone: 'ungrouped'
    });
    expect(sections.at(-1)?.meters.map(card => card.meter.guid)).toEqual(['meter-a']);
  });
});
