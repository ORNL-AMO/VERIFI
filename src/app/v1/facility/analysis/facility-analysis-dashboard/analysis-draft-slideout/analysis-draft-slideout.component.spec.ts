import { AnalysisDraftSlideoutComponent } from './analysis-draft-slideout.component';

describe('AnalysisDraftSlideoutComponent', () => {
  it('emits only an available category', () => {
    const component = new AnalysisDraftSlideoutComponent();
    component.energyAvailable = false;
    component.waterAvailable = true;
    const categories: string[] = [];
    component.submitted.subscribe(category => categories.push(category));

    component.submit();
    component.setCategory('water');
    component.submit();

    expect(categories).toEqual(['water']);
  });
});
