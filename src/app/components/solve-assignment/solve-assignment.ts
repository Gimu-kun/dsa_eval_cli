import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../services/mock-data.service';
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
  private readonly mockService = inject(MockDataService);

  // Question details
  protected readonly question = signal<Question | undefined>(undefined);
  protected readonly topicName = computed(() => {
    const q = this.question();
    if (!q) return '';
    return this.mockService.topics.find(t => t.id === q.topic_id)?.name || '';
  });

  // Inputs
  protected readonly submittedText = signal<string>(''); // For free text/code editor
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
    const questionId = this.route.snapshot.paramMap.get('id');
    if (questionId) {
      const q = this.mockService.getQuestionById(questionId);
      if (q) {
        this.question.set(q);
        // Pre-fill if they have submitted before
        const history = this.mockService.submissionHistory();
        const pastSub = history.find(log => log.questionId === q.id);
        if (pastSub) {
          this.submittedText.set(pastSub.submittedText);
        }
      } else {
        this.router.navigate(['/']);
      }
    } else {
      this.router.navigate(['/']);
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
    const q = this.question();
    if (!q) return;

    let finalAnswer = '';
    if (q.type === 'DESCRIPTIVE') {
      finalAnswer = this.submittedText().trim();
    } else if (q.type === 'PROCEDURE') {
      const freeText = this.submittedText().trim();
      const stepsText = this.steps()
        .map((step, i) => `Bước ${i + 1}: ${step.text.trim()}`)
        .filter(str => str.trim().length > 8)
        .join('\n');
      
      if (freeText && stepsText) {
        finalAnswer = `${freeText}\n\n${stepsText}`;
      } else if (freeText) {
        finalAnswer = freeText;
      } else {
        finalAnswer = stepsText;
      }
    } else { // APPLICATION
      if (this.inputMode() === 'free') {
        finalAnswer = this.submittedText().trim();
      } else {
        finalAnswer = this.steps()
          .map((step, i) => `Bước ${i + 1}: ${step.text.trim()}`)
          .filter(str => str.trim().length > 8)
          .join('\n');
      }
    }

    if (!finalAnswer) {
      alert('Vui lòng nhập bài làm của bạn trước khi nộp.');
      return;
    }

    // Call evaluate mock service
    this.mockService.evaluateAnswer(q.id, finalAnswer).subscribe({
      next: (result) => {
        // Redirect to evaluation feedback
        this.router.navigate(['/evaluation', result.answer_id]);
      },
      error: (err) => {
        alert('Lỗi khi gửi câu trả lời đến server: ' + err.message);
      }
    });
  }
}
