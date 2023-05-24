import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorEntriesComponent } from './predictor-entries.component';

describe('PredictorEntriesComponent', () => {
  let component: PredictorEntriesComponent;
  let fixture: ComponentFixture<PredictorEntriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PredictorEntriesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorEntriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
