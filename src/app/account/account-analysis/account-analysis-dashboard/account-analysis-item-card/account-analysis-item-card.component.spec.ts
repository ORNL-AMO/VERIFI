import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisItemCardComponent } from './account-analysis-item-card.component';

describe('AccountAnalysisItemCardComponent', () => {
  let component: AccountAnalysisItemCardComponent;
  let fixture: ComponentFixture<AccountAnalysisItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisItemCardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountAnalysisItemCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
