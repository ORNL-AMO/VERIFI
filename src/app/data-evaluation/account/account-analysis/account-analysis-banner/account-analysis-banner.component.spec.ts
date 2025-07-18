import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisBannerComponent } from './account-analysis-banner.component';

describe('AccountAnalysisBannerComponent', () => {
  let component: AccountAnalysisBannerComponent;
  let fixture: ComponentFixture<AccountAnalysisBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisBannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountAnalysisBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
