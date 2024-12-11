import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SepReportGraphsComponent } from './sep-report-graphs.component';

describe('SepReportGraphsComponent', () => {
  let component: SepReportGraphsComponent;
  let fixture: ComponentFixture<SepReportGraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SepReportGraphsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SepReportGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
