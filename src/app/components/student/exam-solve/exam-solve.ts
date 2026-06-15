import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExamApiService } from '../../../services/exam-api.service';
import { AdminApiService, TopicResponse } from '../../../services/admin-api.service';
import { TokenService } from '../../../services/token.service';
import { Exam, Question } from '../../../models/dsa-models';

interface StepItem {
  id: string;
  text: string;
}

@Component({
  selector: 'app-exam-solve',
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-solve.html',
  styles: [`
    .editor-textarea {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      line-height: 1.5rem;
      resize: none;
    }
    .editor-textarea::placeholder {
      color: #6a6a6a;
    }
  `]
})
export class ExamSolveComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examApi = inject(ExamApiService);
  private readonly adminApi = inject(AdminApiService);
  private readonly tokenService = inject(TokenService);

  // Session & Exam data
  protected sessionId: string = '';
  protected readonly exam = signal<Exam | undefined>(undefined);
  protected readonly activeQuestionIndex = signal<number>(0);
  protected readonly answersDraft = signal<{[questionId: string]: string}>({});
  protected readonly topics = signal<TopicResponse[]>([]);
  protected readonly difficulties = signal<any[]>([]);
  protected readonly bloomLevels = signal<any[]>([]);
  protected readonly questionTypes = signal<any[]>([]);

  // Workspace Inputs
  protected readonly submittedText = signal<string>(''); // For free text/code editor
  protected readonly inputMode = signal<'free' | 'structured'>('free'); // For APPLICATION question mode
  protected readonly steps = signal<StepItem[]>([{ id: '1', text: '' }]); // For procedural step mode

  // Timer fields
  protected readonly remainingSeconds = signal<number>(0);
  private timerInterval?: any;
  private isSyncingTime = false;

  // AST Validation
  protected readonly validatingSyntax = signal<boolean>(false);
  protected readonly astValidationResult = signal<{valid: boolean, message: string} | null>(null);

  // Auto-save
  private autoSaveTimeout?: any;

  protected readonly activeQuestion = computed(() => {
    const ex = this.exam();
    if (!ex || !ex.customQuestions) return undefined;
    return ex.customQuestions[this.activeQuestionIndex()]?.question;
  });

  protected readonly activeQuestionConfig = computed(() => {
    const ex = this.exam();
    if (!ex || !ex.customQuestions) return undefined;
    return ex.customQuestions[this.activeQuestionIndex()];
  });

  protected readonly topicName = computed(() => {
    const q = this.activeQuestion() as any;
    if (!q) return '';
    if (q.topic && typeof q.topic === 'object') {
      return q.topic.title || q.topic.name || 'Khác';
    }
    const topicId = q.topic_id || q.topic;
    return this.topics().find(t => t.id === topicId)?.title || 'Khác';
  });

  protected readonly lineNumbers = computed(() => {
    const text = this.submittedText();
    const lineCount = text.split('\n').length;
    return Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);
  });

  protected readonly formattedTime = computed(() => {
    const totalSec = this.remainingSeconds();
    if (totalSec <= 0) return '00:00:00';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  });

  protected readonly isTimeRunningOut = computed(() => {
    // Red pulsing timer if less than 5 minutes (300 seconds)
    return this.remainingSeconds() > 0 && this.remainingSeconds() < 300;
  });

  private get userId(): string {
    return this.tokenService.currentUser()?.id || 'STU_DEFAULT';
  }

  ngOnInit(): void {
    const examId = this.route.snapshot.paramMap.get('examId');
    if (!examId) {
      this.router.navigate(['/student/exams']);
      return;
    }

    // 1. Fetch lookups
    this.adminApi.getTopics().subscribe({
      next: (res) => this.topics.set(res)
    });
    this.adminApi.getDifficulties().subscribe({
      next: (res) => this.difficulties.set(res)
    });
    this.adminApi.getBloomLevels().subscribe({
      next: (res) => this.bloomLevels.set(res)
    });
    this.adminApi.getQuestionTypes().subscribe({
      next: (res) => this.questionTypes.set(res)
    });

    // 2. Fetch active session or create one
    this.examApi.fetchActiveSession(this.userId).subscribe({
      next: (session) => {
        if (session && session.exam_id === examId) {
          this.sessionId = session.id;
          this.loadSessionAnswersAndExams(session, examId);
        } else {
          // No active session or mismatch. Create a new one
          this.examApi.startExamSession(this.userId, examId).subscribe({
            next: (newSession) => {
              this.sessionId = newSession.id;
              this.loadSessionAnswersAndExams(newSession, examId);
            },
            error: (err) => {
              alert('Lỗi khởi tạo phiên làm bài: ' + (err.error?.message || err.message));
              this.router.navigate(['/student/exams']);
            }
          });
        }
      },
      error: (err) => {
        console.error('Lỗi tải phiên làm bài hoạt động:', err);
        this.router.navigate(['/student/exams']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
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

  private loadSessionAnswersAndExams(session: any, examId: string): void {
    let drafts: {[key: string]: string} = {};
    if (session.answers_json) {
      try {
        drafts = JSON.parse(session.answers_json);
      } catch (e) {
        console.error('Lỗi phân tích answers_json:', e);
      }
    }
    this.answersDraft.set(drafts);

    this.examApi.fetchExamById(examId).subscribe({
      next: (res) => {
        const mapped = this.mapExam(res);
        this.exam.set(mapped);
        if (mapped.customQuestions && mapped.customQuestions.length > 0) {
          const firstQ = mapped.customQuestions[0].question;
          this.loadQuestionDraft(firstQ);
        }
        this.startTimer();
      },
      error: (err) => {
        console.error('Lỗi tải chi tiết đề thi:', err);
        this.router.navigate(['/student/exams']);
      }
    });
  }

  private startTimer(): void {
    this.syncRemainingTime();
    this.timerInterval = setInterval(() => {
      if (!this.isSyncingTime) {
        this.isSyncingTime = true;
        this.examApi.fetchRemainingTime(this.sessionId).subscribe({
          next: (res) => {
            const rem = res.remaining_seconds != null ? res.remaining_seconds : res.remainingSeconds;
            this.remainingSeconds.set(rem);
            this.isSyncingTime = false;
            if (rem <= 0) {
              this.handleTimeUp();
            }
          },
          error: (err) => {
            console.error('Lỗi đồng bộ thời gian còn lại:', err);
            this.isSyncingTime = false;
          }
        });
      }
    }, 1000);
  }

  private syncRemainingTime(): void {
    if (!this.sessionId) return;
    this.examApi.fetchRemainingTime(this.sessionId).subscribe({
      next: (res) => {
        const rem = res.remaining_seconds != null ? res.remaining_seconds : res.remainingSeconds;
        this.remainingSeconds.set(rem);
        if (rem <= 0) {
          this.handleTimeUp();
        }
      }
    });
  }

  private handleTimeUp(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    alert('Hết giờ làm bài! Hệ thống đang tự động nộp bài làm của bạn.');
    this.autoSubmit();
  }

  protected selectQuestion(index: number): void {
    // Save draft of current active question first
    this.saveCurrentQuestionDraft();

    // Switch index
    this.activeQuestionIndex.set(index);

    // Load next question draft
    const nextQ = this.activeQuestion();
    if (nextQ) {
      this.loadQuestionDraft(nextQ);
    }
  }

  private saveCurrentQuestionDraft(): void {
    const currentQ = this.activeQuestion();
    if (!currentQ) return;

    const drafts = { ...this.answersDraft() };
    const typeId = this.getQuestionTypeId(currentQ.type);
    if (typeId === 'PROCEDURE' || (typeId === 'APPLICATION' && this.inputMode() === 'structured')) {
      drafts[currentQ.id] = JSON.stringify({
        mode: 'structured',
        steps: this.steps().map(s => s.text)
      });
    } else {
      drafts[currentQ.id] = JSON.stringify({
        mode: 'free',
        text: this.submittedText()
      });
    }
    this.answersDraft.set(drafts);
    this.saveDraftToBackend();
  }

  private loadQuestionDraft(q: any): void {
    if (!q) return;
    const draftStr = this.answersDraft()[q.id] || '';
    this.astValidationResult.set(null);

    const typeId = this.getQuestionTypeId(q.type);
    if (!draftStr) {
      this.submittedText.set('');
      this.steps.set([{ id: '1', text: '' }]);
      this.inputMode.set(typeId === 'APPLICATION' ? 'free' : 'free');
      return;
    }

    try {
      const data = JSON.parse(draftStr);
      if (data && typeof data === 'object') {
        if (data.mode === 'structured') {
          this.inputMode.set('structured');
          if (Array.isArray(data.steps)) {
            this.steps.set(data.steps.map((text: string, idx: number) => ({
              id: (idx + 1).toString(),
              text
            })));
          } else {
            this.steps.set([{ id: '1', text: '' }]);
          }
          this.submittedText.set('');
        } else {
          this.inputMode.set('free');
          this.submittedText.set(data.text || '');
          this.steps.set([{ id: '1', text: '' }]);
        }
      } else {
        this.inputMode.set('free');
        this.submittedText.set(draftStr);
        this.steps.set([{ id: '1', text: '' }]);
      }
    } catch {
      this.inputMode.set('free');
      this.submittedText.set(draftStr);
      this.steps.set([{ id: '1', text: '' }]);
    }
  }

  protected onTextChange(value: string): void {
    this.submittedText.set(value);
    
    // Save draft local immediately for responsive icon updates
    const currentQ = this.activeQuestion();
    if (currentQ) {
      const drafts = { ...this.answersDraft() };
      drafts[currentQ.id] = JSON.stringify({
        mode: 'free',
        text: value
      });
      this.answersDraft.set(drafts);
    }

    // Debounce backend save by 2s
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.autoSaveTimeout = setTimeout(() => {
      this.saveDraftToBackend();
    }, 2000);
  }

  protected onStepsChange(): void {
    const currentQ = this.activeQuestion();
    if (currentQ) {
      const drafts = { ...this.answersDraft() };
      drafts[currentQ.id] = JSON.stringify({
        mode: 'structured',
        steps: this.steps().map(s => s.text)
      });
      this.answersDraft.set(drafts);
    }

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.autoSaveTimeout = setTimeout(() => {
      this.saveDraftToBackend();
    }, 2000);
  }

  private saveDraftToBackend(): void {
    if (!this.sessionId) return;
    this.examApi.updateSessionAnswers(this.sessionId, this.answersDraft()).subscribe({
      error: (err) => console.error('Lỗi tự động lưu nháp lên backend:', err)
    });
  }

  // --- Step List Controls ---
  protected addStep(): void {
    const current = this.steps();
    const nextId = (current.length + 1).toString();
    this.steps.set([...current, { id: nextId, text: '' }]);
    this.onStepsChange();
  }

  protected deleteStep(index: number): void {
    const current = this.steps();
    if (current.length <= 1) return;
    const updated = current.filter((_, i) => i !== index);
    this.steps.set(updated);
    this.onStepsChange();
  }

  protected moveStep(index: number, direction: 'up' | 'down'): void {
    const current = [...this.steps()];
    if (direction === 'up' && index > 0) {
      const temp = current[index];
      current[index] = current[index - 1];
      current[index - 1] = temp;
    } else if (direction === 'down' && index < current.length - 1) {
      const temp = current[index];
      current[index] = current[index + 1];
      current[index + 1] = temp;
    }
    this.steps.set(current);
    this.onStepsChange();
  }

  protected toggleInputMode(mode: 'free' | 'structured'): void {
    this.inputMode.set(mode);
    this.astValidationResult.set(null);

    // Swap mode contents
    if (mode === 'structured') {
      this.steps.set([{ id: '1', text: '' }]);
      this.onStepsChange();
    } else {
      this.submittedText.set('');
      this.onTextChange('');
    }
  }

  protected handleEditorTab(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const newVal = val.substring(0, start) + '    ' + val.substring(end);
      this.onTextChange(newVal);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  }

  // --- AST Syntax Validation ---
  protected validateSyntax(): void {
    const code = this.submittedText();
    if (!code.trim()) return;

    this.validatingSyntax.set(true);
    this.astValidationResult.set(null);

    this.examApi.validatePseudoCode(code).subscribe({
      next: (res) => {
        this.validatingSyntax.set(false);
        this.astValidationResult.set({
          valid: res.valid,
          message: res.valid ? 'Cú pháp mã giả hợp lệ!' : res.message
        });
      },
      error: (err) => {
        this.validatingSyntax.set(false);
        this.astValidationResult.set({
          valid: false,
          message: 'Lỗi hệ thống khi kiểm tra cú pháp mã giả.'
        });
      }
    });
  }

  // --- Answer validation ---
  protected isQuestionAnswered(questionId: string): boolean {
    const draftStr = this.answersDraft()[questionId];
    if (!draftStr) return false;
    try {
      const data = JSON.parse(draftStr);
      if (data && typeof data === 'object') {
        if (data.mode === 'structured') {
          return Array.isArray(data.steps) && data.steps.some((s: string) => s.trim().length > 0);
        } else {
          return !!data.text && data.text.trim().length > 0;
        }
      }
      return draftStr.trim().length > 0;
    } catch {
      return draftStr.trim().length > 0;
    }
  }

  // --- Final submission ---
  protected onSubmit(): void {
    // 1. Save current question draft
    this.saveCurrentQuestionDraft();

    // 2. Identify unanswered questions
    const examVal = this.exam();
    if (!examVal || !examVal.customQuestions) return;

    const unansweredIndices: number[] = [];
    examVal.customQuestions.forEach((cq: any, idx: number) => {
      if (!this.isQuestionAnswered(cq.question.id)) {
        unansweredIndices.push(idx + 1);
      }
    });

    if (unansweredIndices.length > 0) {
      alert(`Bạn chưa hoàn thành các câu hỏi: ${unansweredIndices.map(i => 'Câu ' + i).join(', ')}. Vui lòng trả lời đầy đủ trước khi nộp bài.`);
      return;
    }

    if (confirm('Bạn có chắc chắn muốn nộp bài thi? Hành động này sẽ kết thúc phiên thi và không thể chỉnh sửa lại bài làm.')) {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = undefined;
      }
      this.examApi.submitExamSession(this.sessionId, this.answersDraft()).subscribe({
        next: () => {
          alert('Chúc mừng! Bạn đã hoàn thành và nộp bài thi thành công.');
          this.router.navigate(['/student/exams']);
        },
        error: (err) => {
          alert('Lỗi nộp bài thi: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  private autoSubmit(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    this.examApi.submitExamSession(this.sessionId, this.answersDraft()).subscribe({
      next: () => {
        alert('Hệ thống đã tự động nộp bài thi thành công.');
        this.router.navigate(['/student/exams']);
      },
      error: (err) => {
        alert('Lỗi tự động nộp bài thi: ' + (err.error?.message || err.message));
        this.router.navigate(['/student/exams']);
      }
    });
  }

  protected onForfeit(): void {
    if (confirm('Bạn có chắc chắn muốn BỎ CUỘC? Phiên làm bài này sẽ dừng lại ngay lập tức, bị hủy bỏ và dừng tính điểm.')) {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = undefined;
      }
      this.examApi.forfeitExamSession(this.sessionId).subscribe({
        next: () => {
          alert('Bạn đã bỏ cuộc và phiên làm bài đã được hủy bỏ thành công.');
          this.router.navigate(['/student/exams']);
        },
        error: (err) => {
          alert('Lỗi hủy phiên làm bài: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  // --- Display Label Helpers ---
  protected getQuestionTypeLabel(type: string): string {
    switch (type) {
      case 'DESCRIPTIVE': return 'Tự luận';
      case 'PROCEDURE': return 'Quy trình';
      case 'APPLICATION': return 'Ứng dụng';
      default: return type;
    }
  }

  protected getBloomLabel(bloom: string): string {
    switch (bloom) {
      case 'REMEMBERING': return 'R - Nhận biết';
      case 'UNDERSTANDING': return 'U - Thông hiểu';
      case 'APPLYING': return 'AP - Vận dụng';
      default: return bloom;
    }
  }

  protected getBloomClass(bloomField: any): string {
    const id = this.getBloomId(bloomField);
    switch (id) {
      case 'REMEMBERING': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'UNDERSTANDING': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'APPLYING': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  protected getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return difficulty;
    }
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

  protected getQuestionTypeId(typeField: any): string {
    if (!typeField) return '';
    let val = '';
    if (typeof typeField === 'object') {
      val = typeField.acronym || typeField.id || '';
    } else {
      val = typeField;
    }
    
    const key = val.toUpperCase();
    if (key === 'D' || key === 'DESCRIPTIVE') {
      return 'DESCRIPTIVE';
    }
    if (key === 'P' || key === 'PROCEDURE' || key === 'PROCEDURAL') {
      return 'PROCEDURE';
    }
    if (key === 'A' || key === 'APPLICATION') {
      return 'APPLICATION';
    }
    return key;
  }

  protected getBloomId(bloomField: any): string {
    if (!bloomField) return '';
    let val = '';
    if (typeof bloomField === 'object') {
      val = bloomField.acronym || bloomField.id || '';
    } else {
      val = bloomField;
    }
    const key = val.toUpperCase();
    if (key === 'R' || key === 'REMEMBERING') return 'REMEMBERING';
    if (key === 'U' || key === 'UNDERSTANDING') return 'UNDERSTANDING';
    if (key === 'AP' || key === 'APPLYING') return 'APPLYING';
    return key;
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

  protected getDifficultyDisplayName(diffField: any): string {
    if (!diffField) return '';
    if (typeof diffField === 'object') {
      return diffField.display_name || diffField.displayName || diffField.id || '';
    }
    const found = this.difficulties().find(d => d.id === diffField || d.displayName === diffField || d.display_name === diffField);
    return found ? (found.display_name || found.displayName) : diffField;
  }

  protected getBloomDisplayName(bloomField: any): string {
    if (!bloomField) return '';
    if (typeof bloomField === 'object') {
      return bloomField.display_name || bloomField.displayName || bloomField.id || '';
    }
    const found = this.bloomLevels().find(b => b.id === bloomField || b.displayName === bloomField || b.display_name === bloomField);
    return found ? (found.display_name || found.displayName) : bloomField;
  }

  protected getQuestionTypeDisplayName(typeField: any): string {
    if (!typeField) return '';
    if (typeof typeField === 'object') {
      return typeField.display_name || typeField.displayName || typeField.id || '';
    }
    const found = this.questionTypes().find(t => t.id === typeField || t.displayName === typeField || t.display_name === typeField);
    return found ? (found.display_name || found.displayName) : typeField;
  }
}
