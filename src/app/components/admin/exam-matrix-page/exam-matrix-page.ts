import { Component } from '@angular/core';
import { ExamMatrixComponent } from '../../admin-questions/components/exam-matrix/exam-matrix';

@Component({
  selector: 'app-exam-matrix-page',
  standalone: true,
  imports: [ExamMatrixComponent],
  template: `<app-exam-matrix/>`
})
export class ExamMatrixPageComponent {}
