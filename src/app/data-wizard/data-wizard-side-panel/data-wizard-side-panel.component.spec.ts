import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataWizardSidePanelComponent } from './data-wizard-side-panel.component';

describe('DataWizardSidePanelComponent', () => {
  let component: DataWizardSidePanelComponent;
  let fixture: ComponentFixture<DataWizardSidePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataWizardSidePanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataWizardSidePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
