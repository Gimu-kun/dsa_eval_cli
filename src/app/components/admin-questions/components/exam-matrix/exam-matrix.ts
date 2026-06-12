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
  
  protected readonly savedExams = signal<any[]>([]);
  protected examTitle = 'Đề thi tự luận Cấu trúc dữ liệu';

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
    this.loadSavedExams();
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
    const defaultTemplates = [
      {
        id: 'DEFAULT_BASIC',
        name: 'Đề kiểm tra Cơ bản (3 câu - Dễ & Trung bình)',
        questionCount: 3,
        configs: [
          { type: 'DESCRIPTIVE', bloomLevel: 'REMEMBERING', difficulty: 'EASY', suggestedTime: 10, maxScore: 3.0 },
          { type: 'PROCEDURE', bloomLevel: 'UNDERSTANDING', difficulty: 'MEDIUM', suggestedTime: 15, maxScore: 3.5 },
          { type: 'APPLICATION', bloomLevel: 'UNDERSTANDING', difficulty: 'MEDIUM', suggestedTime: 20, maxScore: 3.5 }
        ]
      },
      {
        id: 'DEFAULT_MID',
        name: 'Đề thi Giữa kỳ (4 câu - Cân bằng)',
        questionCount: 4,
        configs: [
          { type: 'DESCRIPTIVE', bloomLevel: 'UNDERSTANDING', difficulty: 'MEDIUM', suggestedTime: 12, maxScore: 2.0 },
          { type: 'PROCEDURE', bloomLevel: 'APPLYING', difficulty: 'MEDIUM', suggestedTime: 18, maxScore: 3.0 },
          { type: 'PROCEDURE', bloomLevel: 'UNDERSTANDING', difficulty: 'MEDIUM', suggestedTime: 15, maxScore: 2.5 },
          { type: 'APPLICATION', bloomLevel: 'APPLYING', difficulty: 'HARD', suggestedTime: 25, maxScore: 2.5 }
        ]
      },
      {
        id: 'DEFAULT_CHALLENGE',
        name: 'Đề thi Thử thách Nâng cao (5 câu - Khó)',
        questionCount: 5,
        configs: [
          { type: 'DESCRIPTIVE', bloomLevel: 'UNDERSTANDING', difficulty: 'MEDIUM', suggestedTime: 15, maxScore: 2.0 },
          { type: 'PROCEDURE', bloomLevel: 'APPLYING', difficulty: 'MEDIUM', suggestedTime: 20, maxScore: 2.0 },
          { type: 'APPLICATION', bloomLevel: 'APPLYING', difficulty: 'MEDIUM', suggestedTime: 20, maxScore: 2.0 },
          { type: 'APPLICATION', bloomLevel: 'APPLYING', difficulty: 'HARD', suggestedTime: 25, maxScore: 2.0 },
          { type: 'PROCEDURE', bloomLevel: 'APPLYING', difficulty: 'HARD', suggestedTime: 25, maxScore: 2.0 }
        ]
      }
    ];

    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('dsa_matrix_templates');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.savedTemplates.set(parsed);
            if (parsed.length > 0) {
              this.selectedTemplateId = parsed[0].id;
            }
            return;
          }
        } catch (e) {
          console.error('Lỗi khi parse templates:', e);
        }
      }
    }

    this.savedTemplates.set(defaultTemplates);
    this.saveTemplatesToStorage(defaultTemplates);
    this.selectedTemplateId = defaultTemplates[0].id;
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

  protected loadSavedExams(): void {
    this.mockService.fetchExams().subscribe({
      next: (res) => {
        this.savedExams.set(res);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách đề thi:', err);
      }
    });
  }

  protected onSaveExam(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    const title = this.examTitle.trim();
    if (!title) {
      this.errorMessage.set('Vui lòng nhập tiêu đề cho đề thi.');
      return;
    }

    const exam = this.generatedExam();
    if (!exam) return;

    const questionsPayload = exam.customQuestions.map((cq: any) => ({
      questionId: cq.question?.id,
      maxScore: cq.maxScore,
      suggestedTime: cq.suggestedTime
    }));

    const payload = {
      id: exam.id,
      title: title,
      difficulty: exam.difficulty,
      status: exam.status || 'DRAFT',
      questions: questionsPayload
    };

    this.mockService.saveExam(payload).subscribe({
      next: (res) => {
        this.successMessage.set(`Lưu đề thi "${title}" thành công!`);
        this.generatedExam.set(null);
        this.loadSavedExams();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Lỗi khi lưu đề thi.');
      }
    });
  }

  protected updateSavedExamStatus(exam: any, newStatus: string): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    const questionsPayload = exam.customQuestions.map((cq: any) => ({
      questionId: cq.question?.id,
      maxScore: cq.maxScore,
      suggestedTime: cq.suggestedTime
    }));

    const payload = {
      id: exam.id,
      title: exam.title,
      difficulty: exam.difficulty,
      status: newStatus,
      questions: questionsPayload
    };

    this.mockService.saveExam(payload).subscribe({
      next: (res) => {
        this.successMessage.set(`Cập nhật trạng thái đề thi "${exam.title}" thành công!`);
        this.loadSavedExams();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Lỗi khi cập nhật trạng thái đề thi.');
      }
    });
  }

  protected onDeleteExam(id: string): void {
    if (!confirm('Bạn có chắc chắn muốn xóa đề thi này không?')) {
      return;
    }
    this.successMessage.set('');
    this.errorMessage.set('');

    this.mockService.deleteExam(id).subscribe({
      next: (res) => {
        this.successMessage.set('Xóa đề thi thành công!');
        this.loadSavedExams();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Lỗi khi xóa đề thi.');
      }
    });
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
