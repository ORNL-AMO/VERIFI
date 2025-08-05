import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisInFacilityHelpComponent } from './account-analysis-in-facility-help.component';

describe('AccountAnalysisInFacilityHelpComponent', () => {
  let component: AccountAnalysisInFacilityHelpComponent;
  let fixture: ComponentFixture<AccountAnalysisInFacilityHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisInFacilityHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountAnalysisInFacilityHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
