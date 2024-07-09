import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessTemplateMetersComponent } from './process-template-meters.component';

describe('ProcessTemplateMetersComponent', () => {
  let component: ProcessTemplateMetersComponent;
  let fixture: ComponentFixture<ProcessTemplateMetersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessTemplateMetersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProcessTemplateMetersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
