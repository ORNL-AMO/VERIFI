import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisFooterComponent } from './account-analysis-footer.component';

describe('AccountAnalysisFooterComponent', () => {
  let component: AccountAnalysisFooterComponent;
  let fixture: ComponentFixture<AccountAnalysisFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisFooterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountAnalysisFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
