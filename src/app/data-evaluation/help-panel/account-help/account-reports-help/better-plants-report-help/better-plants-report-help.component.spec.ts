import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterPlantsReportHelpComponent } from './better-plants-report-help.component';

describe('BetterPlantsReportHelpComponent', () => {
  let component: BetterPlantsReportHelpComponent;
  let fixture: ComponentFixture<BetterPlantsReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BetterPlantsReportHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BetterPlantsReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
