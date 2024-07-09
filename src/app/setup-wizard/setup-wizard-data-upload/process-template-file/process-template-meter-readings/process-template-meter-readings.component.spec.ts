import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessTemplateMeterReadingsComponent } from './process-template-meter-readings.component';

describe('ProcessTemplateMeterReadingsComponent', () => {
  let component: ProcessTemplateMeterReadingsComponent;
  let fixture: ComponentFixture<ProcessTemplateMeterReadingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessTemplateMeterReadingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProcessTemplateMeterReadingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
