import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../../../services/mock-data.service';
import { Question } from '../../../../models/dsa-models';

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './question-bank.html'
})
export class QuestionBankComponent implements OnInit {
  private readonly mockService = inject(MockDataService);

  protected readonly topics = this.mockService.topics;
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly successMessage = signal<string>('');
  protected readonly errorMessage = signal<string>('');

  // Form Model
  protected content = '';
  protected selectedTopicId = '';
  protected selectedType = 'DESCRIPTIVE';
  protected selectedBloom = 'REMEMBERING';
  protected selectedDifficulty = 'EASY';

  // Rubric
  protected accW = 0.4;
  protected compW = 0.3;
  protected logW = 0.3;
  protected rubricDesc = 'Tiêu chí chấm điểm mặc định';

  // Expected Answer
  protected conceptsInput = '';
  protected relationsInput = '';
  protected rulesInput = '';
  protected functionsInput = '';

  ngOnInit(): void {
    if (this.topics.length > 0) {
      this.selectedTopicId = this.topics[0].id;
    }
  }

  protected getQuestionsList(): Question[] {
    return this.mockService.getQuestions();
  }

  protected getTopicName(topicId: string): string {
    return this.topics.find(t => t.id === topicId)?.name || topicId;
  }

  protected onSubmit(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (!this.content.trim()) {
      this.errorMessage.set('Nội dung câu hỏi không được để trống.');
      return;
    }

    if (!this.selectedTopicId) {
      this.errorMessage.set('Vui lòng chọn một chủ đề.');
      return;
    }

    const totalWeight = parseFloat((this.accW + this.compW + this.logW).toFixed(4));
    if (Math.abs(totalWeight - 1.0) > 0.0001) {
      this.errorMessage.set(`Tổng trọng số của Rubric phải bằng 1.0 (Hiện tại: ${totalWeight}).`);
      return;
    }

    const parseSet = (str: string): string[] => {
      return str.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    };

    const questionPayload = {
      topic_id: this.selectedTopicId,
      content: this.content.trim(),
      type: this.selectedType,
      bloom_level: this.selectedBloom,
      difficulty: this.selectedDifficulty,
      rubric: {
        acc_w: this.accW,
        comp_w: this.compW,
        log_w: this.logW,
        description: this.rubricDesc.trim()
      },
      ex_ans: {
        concepts: parseSet(this.conceptsInput),
        relations: parseSet(this.relationsInput),
        rules: parseSet(this.rulesInput),
        functions: parseSet(this.functionsInput)
      }
    };

    this.isSubmitting.set(true);
    this.mockService.addQuestion(questionPayload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Tạo câu hỏi mới thành công!');
        this.resetForm();
        this.mockService.refreshQuestions();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi tạo câu hỏi. Hãy đảm bảo ID chủ đề hợp lệ (23 ký tự).');
      }
    });
  }

  protected onDeleteQuestion(id: string): void {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này không? Thao tác này cũng sẽ xóa các câu trả lời của học viên đối với câu hỏi này.')) {
      return;
    }
    this.successMessage.set('');
    this.errorMessage.set('');
    this.mockService.deleteQuestion(id).subscribe({
      next: () => {
        this.successMessage.set('Xóa câu hỏi thành công!');
        this.mockService.refreshQuestions();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Không thể xóa câu hỏi này.');
      }
    });
  }

  private resetForm(): void {
    this.content = '';
    this.accW = 0.4;
    this.compW = 0.3;
    this.logW = 0.3;
    this.rubricDesc = 'Tiêu chí chấm điểm mặc định';
    this.conceptsInput = '';
    this.relationsInput = '';
    this.rulesInput = '';
    this.functionsInput = '';
  }
}
