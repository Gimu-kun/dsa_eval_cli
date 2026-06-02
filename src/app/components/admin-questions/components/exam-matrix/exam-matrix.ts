import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../../../services/mock-data.service';
import { Question } from '../../../../models/dsa-models';

@Component({
  selector: 'app-exam-matrix',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-matrix.html'
})
export class ExamMatrixComponent implements OnInit {
  private readonly mockService = inject(MockDataService);

  protected readonly successMessage = signal<string>('');
  protected readonly errorMessage = signal<string>('');
  protected readonly isGeneratingExam = signal<boolean>(false);
  protected readonly generatedExam = signal<any>(null);

  protected readonly savedTemplates = signal<any[]>([]);
  protected selectedTemplateId = '';
  protected newTemplateName = '';
  protected readonly matrixMode = signal<'custom' | 'auto'>('custom');

  // Matrix Config State
  protected matrixDifficulty = 'EASY';
  protected matrixQuestionCount = 3;
  protected matrixConfigs: any[] = [];

  // Modal selector state
  protected readonly showQuestionSelectorModal = signal<boolean>(false);
  protected modalTargetIndex = -1;
  protected modalSearchQuery = '';
  protected modalSelectedTopicId = 'ALL';
  protected modalSelectedDifficulty = 'ALL';

  protected readonly topics = this.mockService.topics;

  ngOnInit(): void {
    this.initMatrixConfigs();
    this.loadSavedTemplates();
  }

  protected initMatrixConfigs(): void {
    const currentConfigs = [...this.matrixConfigs];
    this.matrixConfigs = [];
    for (let i = 0; i < this.matrixQuestionCount; i++) {
      if (i < currentConfigs.length) {
        this.matrixConfigs.push(currentConfigs[i]);
      } else {
        this.matrixConfigs.push({
          type: 'ANY',
          bloomLevel: 'ANY',
          difficulty: 'ANY',
          suggestedTime: 15,
          maxScore: 10
        });
      }
    }
  }

  protected onQuestionCountChange(count: number): void {
    this.matrixQuestionCount = Number(count) || 3;
    this.initMatrixConfigs();
  }

  protected loadSavedTemplates(): void {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('dsa_matrix_templates');
      if (saved) {
        try {
          this.savedTemplates.set(JSON.parse(saved));
        } catch (e) {
          console.error('Lỗi khi parse templates:', e);
        }
      }
    }
  }

  protected saveTemplatesToStorage(templates: any[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dsa_matrix_templates', JSON.stringify(templates));
    }
  }

  protected onSaveMatrixTemplate(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    const name = this.newTemplateName.trim();
    if (!name) {
      this.errorMessage.set('Vui lòng nhập tên bản mẫu ma trận.');
      return;
    }

    const template = {
      id: 'TMPL_' + Date.now(),
      name: name,
      questionCount: this.matrixQuestionCount,
      configs: JSON.parse(JSON.stringify(this.matrixConfigs))
    };

    const updated = [...this.savedTemplates(), template];
    this.savedTemplates.set(updated);
    this.saveTemplatesToStorage(updated);
    this.newTemplateName = '';
    this.successMessage.set(`Lưu bản mẫu ma trận "${name}" thành công!`);
  }

  protected onDeleteMatrixTemplate(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa bản mẫu ma trận này không?')) {
      return;
    }
    this.successMessage.set('');
    this.errorMessage.set('');

    const updated = this.savedTemplates().filter(t => t.id !== id);
    this.savedTemplates.set(updated);
    this.saveTemplatesToStorage(updated);
    if (this.selectedTemplateId === id) {
      this.selectedTemplateId = '';
    }
    this.successMessage.set('Xóa bản mẫu ma trận thành công!');
  }

  protected changeMatrixMode(mode: 'custom' | 'auto'): void {
    this.matrixMode.set(mode);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  protected recalculateExamStats(exam: any): any {
    if (!exam || !exam.customQuestions) return exam;

    let totalTime = 0;
    let totalScore = 0.0;
    let difficultyWeightSum = 0;
    const uniqueTypes = new Set<string>();

    exam.customQuestions.forEach((cq: any) => {
      totalTime += cq.suggestedTime || 0;
      totalScore += cq.maxScore || 0;

      if (cq.question && cq.question.type) {
        uniqueTypes.add(cq.question.type);
      }

      const diff = (cq.question && cq.question.difficulty) ? cq.question.difficulty.toUpperCase() : 'EASY';
      if (diff === 'EASY') difficultyWeightSum += 1;
      else if (diff === 'MEDIUM') difficultyWeightSum += 2;
      else if (diff === 'HARD') difficultyWeightSum += 3;
      else difficultyWeightSum += 1;
    });

    exam.totalTime = totalTime;
    exam.totalScore = parseFloat(totalScore.toFixed(2));

    const count = exam.customQuestions.length;
    if (count > 0) {
      const avgWeight = difficultyWeightSum / count;
      if (avgWeight <= 1.5) {
        exam.difficulty = 'EASY';
      } else if (avgWeight <= 2.5) {
        exam.difficulty = 'MEDIUM';
      } else {
        exam.difficulty = 'HARD';
      }
    } else {
      exam.difficulty = 'EASY';
    }

    exam.includedTypes = Array.from(uniqueTypes).join(', ');
    return exam;
  }

  protected onGenerateExam(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
    this.isGeneratingExam.set(true);
    this.generatedExam.set(null);

    this.mockService.generateCustomExam(this.matrixConfigs).subscribe({
      next: (res) => {
        this.isGeneratingExam.set(false);
        res.status = 'DRAFT';
        const calculated = this.recalculateExamStats(res);
        this.generatedExam.set(calculated);
        this.successMessage.set('Tự sinh đề thi theo ma trận cấu hình thành công!');
      },
      error: (err) => {
        this.isGeneratingExam.set(false);
        this.errorMessage.set(err.error?.message || 'Lỗi khi sinh đề thi. Hãy kiểm tra xem cơ sở dữ liệu có đủ câu hỏi thỏa mãn các tiêu chí cấu hình không.');
      }
    });
  }

  protected onGenerateExamAuto(): void {
    if (!this.selectedTemplateId) {
      this.errorMessage.set('Vui lòng chọn một bản mẫu ma trận.');
      return;
    }
    const template = this.savedTemplates().find(t => t.id === this.selectedTemplateId);
    if (!template) {
      this.errorMessage.set('Không tìm thấy bản mẫu ma trận đã chọn.');
      return;
    }

    this.successMessage.set('');
    this.errorMessage.set('');
    this.isGeneratingExam.set(true);
    this.generatedExam.set(null);

    this.mockService.generateCustomExam(template.configs).subscribe({
      next: (res) => {
        this.isGeneratingExam.set(false);
        res.status = 'DRAFT';
        const calculated = this.recalculateExamStats(res);
        this.generatedExam.set(calculated);
        this.successMessage.set(`Tự sinh đề thi tự động từ bản mẫu "${template.name}" thành công!`);
      },
      error: (err) => {
        this.isGeneratingExam.set(false);
        this.errorMessage.set(err.error?.message || 'Lỗi khi sinh đề thi tự động. Hãy kiểm tra xem ngân hàng có đủ câu hỏi không.');
      }
    });
  }

  protected updateExamStatus(status: string): void {
    const exam = this.generatedExam();
    if (exam) {
      exam.status = status;
      this.generatedExam.set({ ...exam });
    }
  }

  protected onRemoveQuestion(index: number): void {
    const exam = this.generatedExam();
    if (exam && exam.customQuestions) {
      exam.customQuestions.splice(index, 1);
      const calculated = this.recalculateExamStats(exam);
      this.generatedExam.set({ ...calculated });
    }
  }

  protected onMaxScoreChange(index: number, newScore: number): void {
    const exam = this.generatedExam();
    if (exam && exam.customQuestions && exam.customQuestions[index]) {
      exam.customQuestions[index].maxScore = Number(newScore) || 0;
      const calculated = this.recalculateExamStats(exam);
      this.generatedExam.set({ ...calculated });
    }
  }

  protected onSuggestedTimeChange(index: number, newTime: number): void {
    const exam = this.generatedExam();
    if (exam && exam.customQuestions && exam.customQuestions[index]) {
      exam.customQuestions[index].suggestedTime = Number(newTime) || 0;
      const calculated = this.recalculateExamStats(exam);
      this.generatedExam.set({ ...calculated });
    }
  }

  protected openQuestionSelector(index: number): void {
    this.modalTargetIndex = index;
    this.modalSearchQuery = '';
    this.modalSelectedTopicId = 'ALL';
    this.modalSelectedDifficulty = 'ALL';
    this.showQuestionSelectorModal.set(true);
  }

  protected closeQuestionSelector(): void {
    this.showQuestionSelectorModal.set(false);
  }

  protected getQuestionsList(): Question[] {
    return this.mockService.getQuestions();
  }

  protected getTopicName(topicId: string): string {
    return this.topics.find(t => t.id === topicId)?.name || topicId;
  }

  protected getModalFilteredQuestions(): Question[] {
    let list = this.getQuestionsList() || [];

    const exam = this.generatedExam();
    if (exam && exam.customQuestions) {
      const selectedIds = exam.customQuestions
        .filter((cq: any, idx: number) => idx !== this.modalTargetIndex)
        .map((cq: any) => cq.question?.id);
      list = list.filter(q => !selectedIds.includes(q.id));
    }

    if (this.modalSelectedTopicId !== 'ALL') {
      list = list.filter(q => q.topic_id === this.modalSelectedTopicId);
    }

    if (this.modalSelectedDifficulty !== 'ALL') {
      list = list.filter(q => q.difficulty === this.modalSelectedDifficulty);
    }

    if (this.modalSearchQuery.trim()) {
      const q = this.modalSearchQuery.toLowerCase();
      list = list.filter(qItem => qItem.content.toLowerCase().includes(q));
    }

    return list;
  }

  protected selectQuestionFromBank(question: Question): void {
    const exam = this.generatedExam();
    if (!exam) return;

    const mappedQ = {
      id: question.id,
      content: question.content,
      difficulty: question.difficulty,
      bloom_level: question.bloom_level,
      bloomLevel: question.bloom_level,
      type: question.type,
      topic_id: question.topic_id
    };

    if (this.modalTargetIndex >= 0) {
      if (exam.customQuestions[this.modalTargetIndex]) {
        exam.customQuestions[this.modalTargetIndex].question = mappedQ;
        exam.customQuestions[this.modalTargetIndex].suggestedTime = question.difficulty === 'EASY' ? 12 : (question.difficulty === 'MEDIUM' ? 18 : 22);
      }
    } else {
      if (!exam.customQuestions) exam.customQuestions = [];
      exam.customQuestions.push({
        question: mappedQ,
        suggestedTime: question.difficulty === 'EASY' ? 12 : (question.difficulty === 'MEDIUM' ? 18 : 22),
        maxScore: 10
      });
    }

    const calculated = this.recalculateExamStats(exam);
    this.generatedExam.set({ ...calculated });
    this.closeQuestionSelector();
    this.successMessage.set(this.modalTargetIndex >= 0 ? 'Thay thế câu hỏi thành công!' : 'Thêm câu hỏi mới vào đề thành công!');
  }
}
