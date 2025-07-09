import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataEvaluationComponent } from './data-evaluation.component';

describe('DataEvaluationComponent', () => {
  let component: DataEvaluationComponent;
  let fixture: ComponentFixture<DataEvaluationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataEvaluationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataEvaluationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
