import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ExamApiService } from '../../../services/exam-api.service';
import { AdminApiService } from '../../../services/admin-api.service';
import { TokenService } from '../../../services/token.service';
import { Exam } from '../../../models/dsa-models';

@Component({
  selector: 'app-exam-selection',
  imports: [CommonModule],
  templateUrl: './exam-selection.html'
})
export class ExamSelectionComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly examApi = inject(ExamApiService);
  private readonly adminApi = inject(AdminApiService);
  private readonly tokenService = inject(TokenService);

  protected readonly exams = signal<Exam[]>([]);
  protected readonly difficulties = signal<any[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly activeSession = signal<any | null>(null);

  private get userId(): string {
    return this.tokenService.currentUser()?.id || 'STU_DEFAULT';
  }

  ngOnInit(): void {
    this.adminApi.getDifficulties().subscribe({
      next: (res) => this.difficulties.set(res)
    });
    this.loadActiveSessionAndExams();
  }

  private mapExam(ex: any): Exam {
    if (!ex) return ex;
    const questionsList = ex.exam_questions || ex.examQuestions;
    return {
      ...ex,
      customQuestions: questionsList ? questionsList.map((eq: any) => ({
        question: eq.question,
        maxScore: eq.max_score || eq.maxScore || eq.max_score,
        suggestedTime: eq.suggested_time || eq.suggestedTime || eq.suggested_time,
        sequenceOrder: eq.sequence_order || eq.sequenceOrder || eq.sequence_order
      })).sort((a: any, b: any) => (a.sequenceOrder || 1) - (b.sequenceOrder || 1)) : []
    };
  }

  private loadActiveSessionAndExams(): void {
    this.loading.set(true);
    // 1. Fetch active session first
    this.examApi.fetchActiveSession(this.userId).subscribe({
      next: (session) => {
        if (session) {
          this.activeSession.set(session);
        } else {
          this.activeSession.set(null);
        }
        // 2. Fetch all exams and filter ACTIVE
        this.examApi.fetchExams().subscribe({
          next: (res) => {
            // Filter only ACTIVE exams and map
            const activeExams = res.filter((e: Exam) => e.status === 'ACTIVE').map((e: any) => this.mapExam(e));
            this.exams.set(activeExams);
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Lỗi tải danh sách đề thi:', err);
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Lỗi kiểm tra phiên làm bài hoạt động:', err);
        // Fallback to fetch exams anyway
        this.examApi.fetchExams().subscribe({
          next: (res) => {
            const activeExams = res.filter((e: Exam) => e.status === 'ACTIVE').map((e: any) => this.mapExam(e));
            this.exams.set(activeExams);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      }
    });
  }

  protected onStartExam(exam: Exam): void {
    if (!exam.id) return;
    this.examApi.startExamSession(this.userId, exam.id).subscribe({
      next: (session) => {
        if (session) {
          this.router.navigate(['/student/solve', exam.id]);
        }
      },
      error: (err) => {
        alert('Lỗi khởi tạo phiên làm bài: ' + (err.error?.message || err.message));
      }
    });
  }

  protected onContinueSession(session: any): void {
    this.router.navigate(['/student/solve', session.exam_id]);
  }

  protected onForfeitSession(session: any): void {
    if (confirm('Bạn có chắc chắn muốn BỎ CUỘC và HỦY BỎ phiên làm bài cũ? Dữ liệu cũ sẽ bị xóa và không thể khôi phục.')) {
      this.examApi.forfeitExamSession(session.id).subscribe({
        next: () => {
          this.activeSession.set(null);
          alert('Hủy phiên làm bài cũ thành công.');
          this.loadActiveSessionAndExams();
        },
        error: (err) => {
          alert('Lỗi hủy phiên làm bài: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  protected getDifficultyId(diffField: any): string {
    if (!diffField) return '';
    let val = '';
    if (typeof diffField === 'object') {
      val = diffField.acronym || diffField.id || '';
    } else {
      val = diffField;
    }
    const key = val.toUpperCase();
    if (key === 'E' || key === 'EASY') return 'EASY';
    if (key === 'M' || key === 'MEDIUM') return 'MEDIUM';
    if (key === 'H' || key === 'HARD') return 'HARD';
    return key;
  }

  protected getDifficultyClass(diffField: any): string {
    const id = this.getDifficultyId(diffField);
    switch (id) {
      case 'EASY': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HARD': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  protected getExamTitleById(examId: string): string {
    const found = this.exams().find(e => e.id === examId);
    return found ? found.title : 'Đề thi không xác định';
  }

  protected getDifficultyDisplayName(diffField: any): string {
    if (!diffField) return '';
    if (typeof diffField === 'object') {
      return diffField.display_name || diffField.displayName || diffField.id || '';
    }
    const found = this.difficulties().find(d => d.id === diffField || d.displayName === diffField || d.display_name === diffField);
    return found ? (found.display_name || found.displayName) : diffField;
  }
}
