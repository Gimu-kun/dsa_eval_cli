import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface MockExam {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  duration: number;
  questionCount: number;
}

@Component({
  selector: 'app-test-exams',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-exams.html'
})
export class TestExamsComponent {
  private readonly router = inject(Router);

  protected readonly exams = signal<MockExam[]>([
    {
      id: 'EXAM_8429adc952594a7b8f',
      title: 'Đề kiểm tra thường kỳ lần 1',
      difficulty: 'EASY',
      duration: 30,
      questionCount: 2
    },
    {
      id: 'EXAM_bf99df383a544306b6',
      title: 'Đề kiểm tra thường kỳ lần 2',
      difficulty: 'MEDIUM',
      duration: 30,
      questionCount: 2
    },
    {
      id: 'EXAM_754d0f85412f46fdb7',
      title: 'Đề kiểm tra giữa kỳ',
      difficulty: 'MEDIUM',
      duration: 60,
      questionCount: 4
    },
    {
      id: 'EXAM_ca71c6ec622143a8be',
      title: 'Đề kiểm tra cuối kỳ',
      difficulty: 'HARD',
      duration: 90,
      questionCount: 6
    }
  ]);

  protected getDifficultyClass(diff: 'EASY' | 'MEDIUM' | 'HARD'): string {
    switch (diff) {
      case 'EASY': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HARD': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  protected onStartExam(examId: string): void {
    this.router.navigate(['/test/solve', examId]);
  }
}
