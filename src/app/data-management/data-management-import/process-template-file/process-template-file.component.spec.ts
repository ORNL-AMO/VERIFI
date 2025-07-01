import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessTemplateFileComponent } from './process-template-file.component';

describe('ProcessTemplateFileComponent', () => {
  let component: ProcessTemplateFileComponent;
  let fixture: ComponentFixture<ProcessTemplateFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessTemplateFileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProcessTemplateFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
