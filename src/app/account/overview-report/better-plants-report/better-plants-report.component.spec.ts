import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterPlantsReportComponent } from './better-plants-report.component';

describe('BetterPlantsReportComponent', () => {
  let component: BetterPlantsReportComponent;
  let fixture: ComponentFixture<BetterPlantsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BetterPlantsReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BetterPlantsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
