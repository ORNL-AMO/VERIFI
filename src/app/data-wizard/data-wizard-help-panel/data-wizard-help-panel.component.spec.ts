import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataWizardHelpPanelComponent } from './data-wizard-help-panel.component';

describe('DataWizardHelpPanelComponent', () => {
  let component: DataWizardHelpPanelComponent;
  let fixture: ComponentFixture<DataWizardHelpPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataWizardHelpPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataWizardHelpPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
