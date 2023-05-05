import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorTabsComponent } from './predictor-tabs.component';

describe('PredictorTabsComponent', () => {
  let component: PredictorTabsComponent;
  let fixture: ComponentFixture<PredictorTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PredictorTabsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
