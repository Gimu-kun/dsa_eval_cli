import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TokenService } from '../../services/token.service';
import { ExamApiService } from '../../services/exam-api.service';
import { AdminApiService, TopicResponse } from '../../services/admin-api.service';
import { Question, QuestionType, BloomLevel, QuestionDifficulty } from '../../models/dsa-models';

interface StepItem {
  id: string;
  text: string;
}

@Component({
  selector: 'app-solve-assignment',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './solve-assignment.html',
  styles: [`
    /* Monospace simulated editor styles */
    .editor-textarea {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      line-height: 1.5rem;
      resize: none;
    }
    .editor-line-numbers {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      line-height: 1.5rem;
      user-select: none;
    }
  `]
})
export class SolveAssignmentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examApi = inject(ExamApiService);
  private readonly adminApi = inject(AdminApiService);
  private readonly tokenService = inject(TokenService);

  // Exam details
  protected readonly exam = signal<any | undefined>(undefined);
  protected readonly activeQuestionIndex = signal<number>(0);
  protected readonly answersDraft = signal<{[questionId: string]: string}>({});
  protected readonly topics = signal<TopicResponse[]>([]);

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
    const q = this.activeQuestion();
    if (!q) return '';
    return this.topics().find(t => t.id === q.topic_id)?.title || '';
  });

  // Editor Inputs
  protected readonly submittedText = signal<string>(''); // For free text/code editor
  protected readonly submittedExplanation = signal<string>(''); // For logic explanation text
  protected readonly inputMode = signal<'free' | 'structured'>('free'); // For procedural/application
  protected readonly steps = signal<StepItem[]>([
    { id: '1', text: '' }
  ]);

  // Compute line numbers for simulated code editor
  protected readonly lineNumbers = computed(() => {
    const text = this.submittedText();
    const lineCount = text.split('\n').length;
    return Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);
  });

  ngOnInit(): void {
    // Fetch topics for resolving names
    this.adminApi.getTopics().subscribe({
      next: (res) => this.topics.set(res)
    });

    const examId = this.route.snapshot.paramMap.get('id');
    if (examId) {
      this.examApi.fetchExamById(examId).subscribe({
        next: (res) => {
          this.exam.set(res);
          const drafts: {[key: string]: string} = {};
          if (res.customQuestions) {
            res.customQuestions.forEach((cq: any) => {
              drafts[cq.question.id] = '';
            });
            this.answersDraft.set(drafts);
            // Load first question
            if (res.customQuestions.length > 0) {
              const firstQ = res.customQuestions[0].question;
              this.loadQuestionDraft(firstQ);
            }
          }
        },
        error: (err) => {
          console.error('Lỗi khi tải đề thi:', err);
          this.router.navigate(['/']);
        }
      });
    } else {
      this.router.navigate(['/']);
    }
  }

  private getQuestionTypeId(typeStr: any): string {
    if (!typeStr) return 'DESCRIPTIVE';
    if (typeof typeStr === 'object') {
      return typeStr.acronym === 'P' ? 'PROCEDURE' : (typeStr.acronym === 'A' ? 'APPLICATION' : 'DESCRIPTIVE');
    }
    return typeStr === 'P' || typeStr === 'PROCEDURE' ? 'PROCEDURE' : (typeStr === 'A' || typeStr === 'APPLICATION' ? 'APPLICATION' : 'DESCRIPTIVE');
  }

  private saveCurrentQuestionDraft(): void {
    const currentQ = this.activeQuestion();
    if (!currentQ) return;

    const drafts = { ...this.answersDraft() };
    const typeId = this.getQuestionTypeId(currentQ.type);
    
    if (typeId === 'APPLICATION') {
      if (this.inputMode() === 'structured') {
        drafts[currentQ.id] = JSON.stringify({
          mode: 'structured',
          steps: this.steps().map(s => s.text),
          explanation: this.submittedExplanation()
        });
      } else {
        drafts[currentQ.id] = JSON.stringify({
          mode: 'free',
          code: this.submittedText(),
          explanation: this.submittedExplanation(),
          text: this.submittedText()
        });
      }
    } else if (typeId === 'PROCEDURE') {
      drafts[currentQ.id] = JSON.stringify({
        mode: 'free',
        text: this.submittedText()
      });
    } else {
      drafts[currentQ.id] = JSON.stringify({
        mode: 'free',
        text: this.submittedText()
      });
    }
    this.answersDraft.set(drafts);
  }

  private loadQuestionDraft(q: any): void {
    if (!q) return;
    const draftStr = this.answersDraft()[q.id] || '';
    const typeId = this.getQuestionTypeId(q.type);
    
    this.submittedExplanation.set('');
    
    if (!draftStr) {
      this.submittedText.set('');
      this.steps.set([{ id: '1', text: '' }]);
      this.inputMode.set(typeId === 'APPLICATION' ? 'free' : 'free');
      return;
    }

    try {
      const data = JSON.parse(draftStr);
      if (data && typeof data === 'object') {
        this.submittedExplanation.set(data.explanation || '');
        if (data.mode === 'structured') {
          if (typeId === 'PROCEDURE') {
            this.inputMode.set('free');
            const stepsList = Array.isArray(data.steps) ? data.steps : [];
            const formatted = stepsList.map((stepText: string, idx: number) => `- Bước ${idx + 1}: ${stepText}`).join('\n');
            this.submittedText.set(formatted);
            this.steps.set([{ id: '1', text: '' }]);
          } else {
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
          }
        } else {
          this.inputMode.set('free');
          this.submittedText.set(data.code || data.text || '');
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

  protected selectQuestion(index: number): void {
    // 1. Save current editor text to draft
    this.saveCurrentQuestionDraft();

    // 2. Switch index
    this.activeQuestionIndex.set(index);

    // 3. Load next question's draft into editor
    const nextQ = this.activeQuestion();
    if (nextQ) {
      this.loadQuestionDraft(nextQ);
    }
  }

  // Handle Tab key inside code editor
  protected handleEditorTab(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      // Insert 4 spaces for indent
      const newVal = val.substring(0, start) + '    ' + val.substring(end);
      this.submittedText.set(newVal);

      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  }

  // --- Step List Management (Procedural & Application) ---
  protected addStep(): void {
    const current = this.steps();
    const nextId = (current.length + 1).toString();
    this.steps.set([...current, { id: nextId, text: '' }]);
  }

  protected deleteStep(index: number): void {
    const current = this.steps();
    if (current.length <= 1) return; // Keep at least one
    const updated = current.filter((_, i) => i !== index);
    this.steps.set(updated);
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
  }

  protected toggleInputMode(mode: 'free' | 'structured'): void {
    this.inputMode.set(mode);
  }

  // --- Submission ---
  protected onSubmit(): void {
    const exam = this.exam();
    if (!exam) return;

    // Save active question answer draft first
    this.saveCurrentQuestionDraft();

    // Verify draft has contents
    const user = this.tokenService.currentUser();
    const userId = user ? user.id : 'STU_001';

    const answersPayload = Object.keys(this.answersDraft()).map(qId => ({
      questionId: qId,
      submittedText: this.answersDraft()[qId].trim()
    })).filter(a => a.submittedText.length > 0);

    if (answersPayload.length === 0) {
      alert('Vui lòng nhập câu trả lời trước khi nộp bài thi.');
      return;
    }

    const payload = {
      userId: userId,
      examId: exam.id,
      answers: answersPayload
    };

    this.examApi.submitExam(payload).subscribe({
      next: (result) => {
        // Redirect to evaluation report using submission ID
        this.router.navigate(['/evaluation', result.submission_id || result.examSubmissionId]);
      },
      error: (err) => {
        alert('Lỗi khi gửi bài làm: ' + (err.error?.message || err.message));
      }
    });
  }
}
