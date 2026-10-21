import { analysisCategories } from './analysis-category-presentation';

describe('analysis category presentation', () => {
  it('uses meter sources rather than treating every non-energy meter as water', () => {
    expect(analysisCategories([{ source: 'Electricity' }, { source: 'Other' }], [])).toEqual(['energy']);
    expect(analysisCategories([{ source: 'Water Intake' }, { source: 'Water Discharge' }], [])).toEqual(['water']);
    expect(analysisCategories([{ source: 'Natural Gas' }, { source: 'Water Intake' }], [])).toEqual(['energy', 'water']);
    expect(analysisCategories([], [])).toEqual([]);
  });

  it('retains saved categories even after their meters have been removed', () => {
    expect(analysisCategories([{ source: 'Electricity' }], [{ analysisCategory: 'water' }])).toEqual(['energy', 'water']);
    expect(analysisCategories([], [{ analysisCategory: 'water' }])).toEqual(['water']);
  });
});
