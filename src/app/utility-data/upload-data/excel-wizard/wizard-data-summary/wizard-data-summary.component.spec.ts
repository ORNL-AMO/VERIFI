import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WizardDataSummaryComponent } from './wizard-data-summary.component';

describe('WizardDataSummaryComponent', () => {
  let component: WizardDataSummaryComponent;
  let fixture: ComponentFixture<WizardDataSummaryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WizardDataSummaryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WizardDataSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
