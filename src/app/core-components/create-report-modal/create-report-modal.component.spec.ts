import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateReportModalComponent } from './create-report-modal.component';

describe('CreateReportModalComponent', () => {
  let component: CreateReportModalComponent;
  let fixture: ComponentFixture<CreateReportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateReportModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateReportModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
