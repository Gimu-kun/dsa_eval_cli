import { Component } from '@angular/core';
import { EvaluationGradingComponent } from '../../admin-questions/components/evaluation-grading/evaluation-grading';

@Component({
  selector: 'app-evaluation-grading-page',
  standalone: true,
  imports: [EvaluationGradingComponent],
  template: `<app-evaluation-grading/>`
})
export class EvaluationGradingPageComponent {}
