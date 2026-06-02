import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QuestionBankComponent } from './components/question-bank/question-bank';
import { EvaluationGradingComponent } from './components/evaluation-grading/evaluation-grading';
import { ExamMatrixComponent } from './components/exam-matrix/exam-matrix';
import { StudentAnalyticsComponent } from './components/student-analytics/student-analytics';

@Component({
  selector: 'app-admin-questions',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink,
    QuestionBankComponent,
    EvaluationGradingComponent,
    ExamMatrixComponent,
    StudentAnalyticsComponent
  ],
  templateUrl: './admin-questions.html'
})
export class AdminQuestionsComponent {
  protected readonly activeTab = signal<string>('questions'); // 'questions', 'evaluation', 'matrix', 'analytics'

  protected changeTab(tab: string): void {
    this.activeTab.set(tab);
  }
}
