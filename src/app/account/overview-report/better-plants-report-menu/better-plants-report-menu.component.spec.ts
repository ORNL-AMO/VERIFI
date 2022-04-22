import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterPlantsReportMenuComponent } from './better-plants-report-menu.component';

describe('BetterPlantsReportMenuComponent', () => {
  let component: BetterPlantsReportMenuComponent;
  let fixture: ComponentFixture<BetterPlantsReportMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BetterPlantsReportMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BetterPlantsReportMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
