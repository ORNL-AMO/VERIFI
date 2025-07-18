import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectBankedAnalysisComponent } from './select-banked-analysis.component';

describe('SelectBankedAnalysisComponent', () => {
  let component: SelectBankedAnalysisComponent;
  let fixture: ComponentFixture<SelectBankedAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectBankedAnalysisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectBankedAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
