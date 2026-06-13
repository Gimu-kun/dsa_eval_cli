import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, TopicResponse } from '../../../../services/admin-api.service';
import { QuestionApiService } from '../../../../services/question-api.service';
import { ExamApiService } from '../../../../services/exam-api.service';
import { Question } from '../../../../models/dsa-models';

@Component({
  selector: 'app-exam-matrix',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-matrix.html'
})
export class ExamMatrixComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly questionApi = inject(QuestionApiService);
  private readonly examApi = inject(ExamApiService);

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

  protected readonly topics = signal<TopicResponse[]>([]);
  protected readonly questions = signal<Question[]>([]);

  ngOnInit(): void {
    this.adminApi.getTopics().subscribe({
      next: (res) => {
        this.topics.set(res);
        this.initMatrixConfigs();
        this.loadSavedTemplates();
        this.loadSavedExams();
        this.loadQuestions();
      }
    });
  }

  protected loadQuestions(): void {
    this.questionApi.getQuestions().subscribe({
      next: (res) => this.questions.set(res)
    });
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
          { type: 'PROCEDURE', bloomLevel: 'APPLYING', difficulty: 'MEDIUM', suggestedTime: 18, maxScore: 2.0 },
          { type: 'APPLICATION', bloomLevel: 'APPLYING', difficulty: 'MEDIUM', suggestedTime: 20, maxScore: 2.0 },
          { type: 'APPLICATION', bloomLevel: 'APPLYING', difficulty: 'HARD', suggestedTime: 25, maxScore: 2.0 },
          { type: 'APPLICATION', bloomLevel: 'APPLYING', difficulty: 'HARD', suggestedTime: 25, maxScore: 2.0 }
        ]
      }
    ];

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dsa_exam_templates');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          this.savedTemplates.set([...defaultTemplates, ...parsed]);
          return;
        } catch {}
      }
    }
    this.savedTemplates.set(defaultTemplates);
  }

  protected loadSavedExams(): void {
    this.examApi.fetchExams().subscribe({
      next: (res) => {
        const mapped = res.map((ex: any) => ({
          ...ex,
          customQuestions: ex.examQuestions ? ex.examQuestions.map((eq: any) => ({
            question: eq.question,
            maxScore: eq.maxScore || eq.max_score || 1.0,
            suggestedTime: eq.suggestedTime || eq.suggested_time || 15,
            sequenceOrder: eq.sequenceOrder || eq.sequence_order || 1
          })) : []
        }));
        this.savedExams.set(mapped);
      },
      error: (err) => console.error('Lỗi khi tải danh sách đề thi:', err)
    });
  }

  protected applyTemplate(): void {
    const template = this.savedTemplates().find(t => t.id === this.selectedTemplateId);
    if (!template) return;

    this.matrixQuestionCount = template.questionCount;
    this.matrixConfigs = JSON.parse(JSON.stringify(template.configs));
    this.successMessage.set(`Đã áp dụng mẫu thiết kế: "${template.name}"`);
  }

  protected saveAsTemplate(): void {
    if (!this.newTemplateName.trim()) {
      this.errorMessage.set('Vui lòng nhập tên mẫu thiết kế.');
      return;
    }

    const newTemplate = {
      id: 'TEMPLATE_' + Date.now(),
      name: this.newTemplateName.trim(),
      questionCount: this.matrixQuestionCount,
      configs: this.matrixConfigs
    };

    const currentTemplates = this.savedTemplates().filter(t => !t.id.startsWith('DEFAULT_'));
    const updated = [...currentTemplates, newTemplate];
    if (typeof window !== 'undefined') {
      localStorage.setItem('dsa_exam_templates', JSON.stringify(updated));
    }

    this.loadSavedTemplates();
    this.newTemplateName = '';
    this.successMessage.set('Đã lưu mẫu thiết kế thành công!');
  }

  protected changeMatrixMode(mode: 'custom' | 'auto'): void {
    this.matrixMode.set(mode);
  }

  protected onSaveMatrixTemplate(): void {
    this.saveAsTemplate();
  }

  protected onDeleteMatrixTemplate(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa bản mẫu ma trận này?')) return;
    const currentTemplates = this.savedTemplates().filter(t => t.id !== id && !t.id.startsWith('DEFAULT_'));
    if (typeof window !== 'undefined') {
      localStorage.setItem('dsa_exam_templates', JSON.stringify(currentTemplates));
    }
    this.loadSavedTemplates();
    if (this.selectedTemplateId === id) {
      this.selectedTemplateId = '';
    }
    this.successMessage.set('Đã xóa bản mẫu ma trận thành công.');
  }

  protected onGenerateExam(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    const formattedConfigs = this.matrixConfigs.map((c, index) => ({
      topic_id: this.topics()[index % this.topics().length]?.id,
      count: 1,
      type: c.type === 'ANY' ? 'DESCRIPTIVE' : c.type,
      bloom_level: c.bloomLevel === 'ANY' ? 'UNDERSTANDING' : c.bloomLevel,
      difficulty: c.difficulty === 'ANY' ? 'MEDIUM' : c.difficulty,
      suggested_time: c.suggestedTime,
      max_score: c.maxScore
    }));

    this.isGeneratingExam.set(true);

    this.examApi.generateCustomExam(formattedConfigs).subscribe({
      next: (res) => {
        this.isGeneratingExam.set(false);
        const mappedExam = {
          ...res,
          customQuestions: res.examQuestions ? res.examQuestions.map((eq: any) => ({
            question: eq.question,
            maxScore: eq.maxScore || eq.max_score || 1.0,
            suggestedTime: eq.suggestedTime || eq.suggested_time || 15,
            sequenceOrder: eq.sequenceOrder || eq.sequence_order || 1
          })) : []
        };
        this.generatedExam.set(mappedExam);
        this.successMessage.set('Sinh đề thi từ ma trận thành công!');
      },
      error: (err) => {
        this.isGeneratingExam.set(false);
        this.errorMessage.set(err.error?.message || 'Không tìm thấy đủ câu hỏi trong ngân hàng khớp với cấu hình ma trận.');
      }
    });
  }

  protected onGenerateExamAuto(): void {
    const template = this.savedTemplates().find(t => t.id === this.selectedTemplateId);
    if (!template) return;

    this.successMessage.set('');
    this.errorMessage.set('');
    this.isGeneratingExam.set(true);

    const formattedConfigs = template.configs.map((c: any, index: number) => ({
      topic_id: this.topics()[index % this.topics().length]?.id,
      count: 1,
      type: c.type === 'ANY' ? 'DESCRIPTIVE' : c.type,
      bloom_level: c.bloomLevel === 'ANY' ? 'UNDERSTANDING' : c.bloomLevel,
      difficulty: c.difficulty === 'ANY' ? 'MEDIUM' : c.difficulty,
      suggested_time: c.suggestedTime,
      max_score: c.maxScore
    }));

    this.examApi.generateCustomExam(formattedConfigs).subscribe({
      next: (res) => {
        this.isGeneratingExam.set(false);
        const mappedExam = {
          ...res,
          customQuestions: res.examQuestions ? res.examQuestions.map((eq: any) => ({
            question: eq.question,
            maxScore: eq.maxScore || eq.max_score || 1.0,
            suggestedTime: eq.suggestedTime || eq.suggested_time || 15,
            sequenceOrder: eq.sequenceOrder || eq.sequence_order || 1
          })) : []
        };
        this.generatedExam.set(mappedExam);
        this.successMessage.set('Sinh đề thi từ bản mẫu thành công!');
      },
      error: (err) => {
        this.isGeneratingExam.set(false);
        this.errorMessage.set(err.error?.message || 'Không tìm thấy đủ câu hỏi trong ngân hàng khớp với cấu hình bản mẫu.');
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

  protected onSaveExam(): void {
    this.saveExamToDatabase();
  }

  protected saveExamToDatabase(): void {
    const exam = this.generatedExam();
    if (!exam) return;

    const payload = {
      title: this.examTitle.trim(),
      difficulty: this.matrixDifficulty,
      duration: exam.duration || 60,
      total_time: exam.totalTime || 60,
      total_score: exam.totalScore || 10.0,
      status: exam.status || 'ACTIVE',
      questions: exam.customQuestions ? exam.customQuestions.map((cq: any) => ({
        question_id: cq.question.id,
        max_score: cq.maxScore || 1.0,
        sequence_order: cq.sequenceOrder || 1
      })) : []
    };

    this.examApi.saveExam(payload).subscribe({
      next: () => {
        this.successMessage.set('Lưu đề thi vào cơ sở dữ liệu thành công!');
        this.generatedExam.set(null);
        this.loadSavedExams();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi lưu đề thi.');
      }
    });
  }

  protected onDeleteExam(id: string): void {
    if (!confirm('Bạn có chắc chắn muốn xóa đề thi này không?')) return;

    this.successMessage.set('');
    this.errorMessage.set('');

    this.examApi.deleteExam(id).subscribe({
      next: () => {
        this.successMessage.set('Đã xóa đề thi thành công.');
        this.loadSavedExams();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Không thể xóa đề thi này.');
      }
    });
  }

  protected updateSavedExamStatus(exam: any, status: string): void {
    this.successMessage.set('');
    this.errorMessage.set('');
    
    const payload = {
      id: exam.id,
      title: exam.title,
      difficulty: exam.difficulty,
      duration: exam.duration || 60,
      total_time: exam.totalTime || 60,
      total_score: exam.totalScore || 10.0,
      status: status,
      questions: exam.customQuestions ? exam.customQuestions.map((cq: any) => ({
        question_id: cq.question?.id,
        max_score: cq.maxScore || 1.0,
        sequence_order: cq.sequenceOrder || 1
      })) : []
    };

    this.examApi.saveExam(payload).subscribe({
      next: () => {
        this.successMessage.set(`Đã cập nhật trạng thái đề thi "${exam.title}" thành ${status}`);
        this.loadSavedExams();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Không thể cập nhật trạng thái đề thi.');
      }
    });
  }

  protected onRemoveQuestion(index: number): void {
    const exam = this.generatedExam();
    if (exam && exam.customQuestions) {
      exam.customQuestions.splice(index, 1);
      const calculated = this.recalculateExamStats(exam);
      this.generatedExam.set({ ...calculated });
      this.successMessage.set('Đã xóa câu hỏi khỏi đề thi.');
    }
  }

  protected onMaxScoreChange(index: number, newScore: number): void {
    this.onScoreChange(index, newScore);
  }

  private recalculateExamStats(exam: any): any {
    if (!exam || !exam.customQuestions) return exam;

    let time = 0;
    let score = 0;
    exam.customQuestions.forEach((cq: any) => {
      time += Number(cq.suggestedTime) || 0;
      score += Number(cq.maxScore) || 0;
    });

    exam.duration = time;
    exam.totalTime = time;
    exam.totalScore = score;
    return exam;
  }

  protected onScoreChange(index: number, newScore: number): void {
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
    return this.questions();
  }

  protected getTopicName(topicId: string): string {
    return this.topics().find(t => t.id === topicId)?.title || topicId;
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
