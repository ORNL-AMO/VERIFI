import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankedGroupAnalysisComponent } from './banked-group-analysis.component';

describe('BankedGroupAnalysisComponent', () => {
  let component: BankedGroupAnalysisComponent;
  let fixture: ComponentFixture<BankedGroupAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BankedGroupAnalysisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankedGroupAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
