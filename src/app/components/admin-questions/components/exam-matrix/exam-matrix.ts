import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, TopicResponse, ChapterResponse } from '../../../../services/admin-api.service';
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
  protected readonly editingExam = signal<any>(null);
  protected readonly showEditExamModal = signal<boolean>(false);

  protected readonly savedTemplates = signal<any[]>([]);
  protected selectedTemplateId = '';
  protected readonly matrixMode = signal<'custom' | 'auto'>('custom');

  protected readonly savedExams = signal<any[]>([]);
  protected examTitle = 'Đề thi tự luận Cấu trúc dữ liệu';

  // Matrix Template Config Form State
  protected templateTitle = 'Bản mẫu ma trận đề thi';
  protected templateDifficulty = 'MEDIUM';
  protected selectedChapterIds: string[] = [];
  protected selectedTypeIds: string[] = [];
  protected selectedBloomLevelIds: string[] = [];
  protected easyPer = 40;
  protected mediumPer = 50;
  protected hardPer = 10;

  // Generation config variables (whole exam level)
  protected examDuration = 90;
  protected matrixQuestionCount = 3;

  // Metadata signals
  protected readonly chapters = signal<ChapterResponse[]>([]);
  protected readonly bloomLevels = signal<any[]>([]);
  protected readonly difficulties = signal<any[]>([]);
  protected readonly questionTypes = signal<any[]>([]);
  protected readonly topics = signal<TopicResponse[]>([]);
  protected readonly questions = signal<Question[]>([]);

  // Modal question bank selector state
  protected readonly showQuestionSelectorModal = signal<boolean>(false);
  protected modalTargetIndex = -1;
  protected modalSearchQuery = '';
  protected modalSelectedTopicId = 'ALL';
  protected modalSelectedDifficulty = 'ALL';

  ngOnInit(): void {
    this.adminApi.getChapters().subscribe(res => this.chapters.set(res));
    this.adminApi.getBloomLevels().subscribe(res => this.bloomLevels.set(res));
    this.adminApi.getDifficulties().subscribe(res => this.difficulties.set(res));
    this.adminApi.getQuestionTypes().subscribe(res => this.questionTypes.set(res));
    this.adminApi.getTopics().subscribe({
      next: (res) => {
        this.topics.set(res);
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

  protected loadSavedTemplates(): void {
    this.examApi.fetchTemplates().subscribe({
      next: (res) => {
        const mapped = res.map(t => ({
          ...t,
          easyPerPct: Math.round((t.easy_per || t.easyPer || 0) * 100),
          mediumPerPct: Math.round((t.medium_per || t.mediumPer || 0) * 100),
          hardPerPct: Math.round((t.hard_per || t.hardPer || 0) * 100)
        }));
        this.savedTemplates.set(mapped);
      },
      error: (err) => console.error('Lỗi khi tải danh sách bản mẫu:', err)
    });
  }

  protected loadSavedExams(): void {
    this.examApi.fetchExams().subscribe({
      next: (res) => {
        const mapped = res.map((ex: any) => ({
          ...ex,
          totalScore: ex.total_score !== undefined ? ex.total_score : (ex.totalScore !== undefined ? ex.totalScore : 0.0),
          customQuestions: (ex.exam_questions || ex.examQuestions) ? (ex.exam_questions || ex.examQuestions).map((eq: any) => ({
            question: eq.question,
            maxScore: eq.maxScore || eq.max_score || 1.0,
            suggestedTime: eq.suggestedTime || eq.suggested_time,
            sequenceOrder: eq.sequenceOrder || eq.sequence_order || 1
          })) : []
        }));
        this.savedExams.set(mapped);
      },
      error: (err) => console.error('Lỗi khi tải danh sách đề thi:', err)
    });
  }

  protected toggleChapter(id: string): void {
    const idx = this.selectedChapterIds.indexOf(id);
    if (idx >= 0) {
      this.selectedChapterIds.splice(idx, 1);
    } else {
      this.selectedChapterIds.push(id);
    }
  }

  protected toggleType(id: string): void {
    const idx = this.selectedTypeIds.indexOf(id);
    if (idx >= 0) {
      this.selectedTypeIds.splice(idx, 1);
    } else {
      this.selectedTypeIds.push(id);
    }
  }

  protected toggleBloomLevel(id: string): void {
    const idx = this.selectedBloomLevelIds.indexOf(id);
    if (idx >= 0) {
      this.selectedBloomLevelIds.splice(idx, 1);
    } else {
      this.selectedBloomLevelIds.push(id);
    }
  }

  protected isChapterSelected(id: string): boolean {
    return this.selectedChapterIds.includes(id);
  }

  protected isTypeSelected(id: string): boolean {
    return this.selectedTypeIds.includes(id);
  }

  protected isBloomLevelSelected(id: string): boolean {
    return this.selectedBloomLevelIds.includes(id);
  }

  protected get totalRatio(): number {
    return (Number(this.easyPer) || 0) + (Number(this.mediumPer) || 0) + (Number(this.hardPer) || 0);
  }

  protected get isRatioValid(): boolean {
    return Math.abs(this.totalRatio - 100) < 0.01;
  }

  protected get calculatedDifficultyAcronym(): string {
    const easy = Number(this.easyPer) || 0;
    const medium = Number(this.mediumPer) || 0;
    const hard = Number(this.hardPer) || 0;

    // Dễ (EASY): Dễ >= 70%, Trung bình <= 30%, Khá = 0%
    if (hard === 0 && easy >= 70 && medium <= 30) {
      return 'EASY';
    }

    // Khá/Khó (HARD): Dễ <= 20%, Trung bình 30-40%, Khá >= 40%
    if (easy <= 20 && (medium >= 30 && medium <= 40) && hard >= 40) {
      return 'HARD';
    }

    // Default fallback to MEDIUM
    return 'MEDIUM';
  }

  protected get calculatedDifficultyId(): string {
    const acronym = this.calculatedDifficultyAcronym;
    const diffObj = this.difficulties().find(d =>
      (d.displayName || d.display_name || '').toUpperCase() === acronym
    );
    return diffObj ? diffObj.id : acronym;
  }

  protected applyDefaultMatrixSettings(difficulty: string): void {
    // Clear selections first
    this.selectedChapterIds = [];
    this.selectedTypeIds = [];
    this.selectedBloomLevelIds = [];

    const chaps = this.chapters();
    const qtypes = this.questionTypes();
    const blooms = this.bloomLevels();

    if (difficulty === 'EASY') {
      chaps.forEach((c, index) => {
        const name = (c.chapter_name || '').toLowerCase();
        if (name.includes('chương 1') || name.includes('chương 3') || name.includes('c1') || name.includes('c3') || name.includes('chapter 1') || name.includes('chapter 3')) {
          this.selectedChapterIds.push(c.id);
        } else if (this.selectedChapterIds.length === 0 && (index === 0 || index === 2)) {
          this.selectedChapterIds.push(c.id);
        }
      });
      if (this.selectedChapterIds.length === 0 && chaps.length > 0) {
        if (chaps[0]) this.selectedChapterIds.push(chaps[0].id);
        if (chaps[2]) this.selectedChapterIds.push(chaps[2].id);
      }

      qtypes.forEach(t => {
        const acr = (t.acronym || '').toUpperCase();
        if (acr === 'D' || acr === 'P') {
          this.selectedTypeIds.push(t.id);
        }
      });

      blooms.forEach(b => {
        const acr = (b.acronym || '').toUpperCase();
        if (acr === 'R' || acr === 'U') {
          this.selectedBloomLevelIds.push(b.id);
        }
      });

      this.easyPer = 70;
      this.mediumPer = 30;
      this.hardPer = 0;

    } else if (difficulty === 'MEDIUM') {
      chaps.forEach(c => this.selectedChapterIds.push(c.id));

      qtypes.forEach(t => this.selectedTypeIds.push(t.id));

      blooms.forEach(b => {
        const acr = (b.acronym || '').toUpperCase();
        if (acr === 'U' || acr === 'AP') {
          this.selectedBloomLevelIds.push(b.id);
        }
      });

      this.easyPer = 40;
      this.mediumPer = 50;
      this.hardPer = 10;

    } else if (difficulty === 'HARD') {
      chaps.forEach((c, index) => {
        const name = (c.chapter_name || '').toLowerCase();
        if (name.includes('chương 2') || name.includes('chương 3') || name.includes('chương 4') || name.includes('chương 5') ||
          name.includes('c2') || name.includes('c3') || name.includes('c4') || name.includes('c5') ||
          name.includes('chapter 2') || name.includes('chapter 3') || name.includes('chapter 4') || name.includes('chapter 5')) {
          this.selectedChapterIds.push(c.id);
        }
      });
      if (this.selectedChapterIds.length === 0 && chaps.length > 0) {
        for (let idx = 1; idx <= 4; idx++) {
          if (chaps[idx]) this.selectedChapterIds.push(chaps[idx].id);
        }
      }

      qtypes.forEach(t => {
        const acr = (t.acronym || '').toUpperCase();
        if (acr === 'P' || acr === 'A') {
          this.selectedTypeIds.push(t.id);
        }
      });

      blooms.forEach(b => {
        const acr = (b.acronym || '').toUpperCase();
        if (acr === 'AP') {
          this.selectedBloomLevelIds.push(b.id);
        }
      });

      this.easyPer = 20;
      this.mediumPer = 40;
      this.hardPer = 40;
    }
  }

  protected increaseQuestionCount(): void {
    if (this.matrixQuestionCount < 15) {
      this.matrixQuestionCount++;
    }
  }

  protected decreaseQuestionCount(): void {
    if (this.matrixQuestionCount > 1) {
      this.matrixQuestionCount--;
    }
  }

  protected changeMatrixMode(mode: 'custom' | 'auto'): void {
    this.matrixMode.set(mode);
  }

  protected onSaveTemplate(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (!this.templateTitle.trim()) {
      this.errorMessage.set('Vui lòng nhập tên bản mẫu ma trận.');
      return;
    }

    if (this.selectedChapterIds.length === 0) {
      this.errorMessage.set('Vui lòng chọn ít nhất 1 Chương (Chapter).');
      return;
    }

    if (this.selectedTypeIds.length === 0) {
      this.errorMessage.set('Vui lòng chọn ít nhất 1 Dạng câu hỏi.');
      return;
    }

    if (this.selectedBloomLevelIds.length === 0) {
      this.errorMessage.set('Vui lòng chọn ít nhất 1 Thang Bloom.');
      return;
    }

    if (!this.isRatioValid) {
      this.errorMessage.set('Tổng tỷ lệ phân bổ độ khó (Dễ + Trung bình + Khá) phải bằng đúng 100%.');
      return;
    }

    const payload = {
      title: this.templateTitle.trim(),
      difficulty: this.calculatedDifficultyId,
      easy_per: Number(this.easyPer) / 100,
      easyPer: Number(this.easyPer) / 100,
      medium_per: Number(this.mediumPer) / 100,
      mediumPer: Number(this.mediumPer) / 100,
      hard_per: Number(this.hardPer) / 100,
      hardPer: Number(this.hardPer) / 100,
      chapter_ids: this.selectedChapterIds,
      chapterIds: this.selectedChapterIds,
      type_ids: this.selectedTypeIds,
      typeIds: this.selectedTypeIds,
      bloom_level_ids: this.selectedBloomLevelIds,
      bloomLevelIds: this.selectedBloomLevelIds
    };

    this.examApi.saveTemplate(payload).subscribe({
      next: (res) => {
        this.successMessage.set(`Đã lưu bản mẫu ma trận "${res.title}" thành công!`);
        this.loadSavedTemplates();
        this.selectedTemplateId = res.id;
        this.matrixMode.set('auto');
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi lưu bản mẫu ma trận.');
      }
    });
  }

  protected onDeleteTemplate(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa bản mẫu ma trận này khỏi cơ sở dữ liệu?')) return;

    this.successMessage.set('');
    this.errorMessage.set('');

    this.examApi.deleteTemplate(id).subscribe({
      next: () => {
        this.successMessage.set('Đã xóa bản mẫu ma trận thành công.');
        this.loadSavedTemplates();
        if (this.selectedTemplateId === id) {
          this.selectedTemplateId = '';
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Không thể xóa bản mẫu ma trận này.');
      }
    });
  }

  protected onGenerateExam(): void {
    if (!this.selectedTemplateId) {
      this.errorMessage.set('Vui lòng chọn một bản mẫu ma trận để sinh đề.');
      return;
    }

    this.successMessage.set('');
    this.errorMessage.set('');
    this.isGeneratingExam.set(true);

    this.examApi.generateExamFromTemplate(
      this.selectedTemplateId,
      this.examTitle,
      this.examDuration,
      this.matrixQuestionCount
    ).subscribe({
      next: (res) => {
        this.isGeneratingExam.set(false);
        const mappedExam = {
          ...res,
          customQuestions: (res.exam_questions || res.examQuestions) ? (res.exam_questions || res.examQuestions).map((eq: any) => ({
            question: eq.question,
            maxScore: eq.maxScore || eq.max_score || 1.0,
            suggestedTime: eq.suggestedTime || eq.suggested_time,
            sequenceOrder: eq.sequenceOrder || eq.sequence_order || 1
          })).sort((a: any, b: any) => (a.sequenceOrder || 1) - (b.sequenceOrder || 1)) : []
        };
        const calculated = this.recalculateExamStats(mappedExam);
        this.generatedExam.set(calculated);
        this.successMessage.set('Sinh đề thi từ bản mẫu ma trận thành công!');
      },
      error: (err) => {
        this.isGeneratingExam.set(false);
        this.errorMessage.set(err.error?.message || 'Không tìm thấy đủ câu hỏi phù hợp trong ngân hàng để sinh đề.');
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

    if (Math.abs(exam.totalScore - 10.0) > 0.001) {
      this.errorMessage.set('Không thể lưu đề thi: Tổng điểm của đề thi phải bằng đúng 10.0 điểm.');
      return;
    }

    const payload = {
      id: exam.id,
      title: this.examTitle.trim(),
      difficulty: exam.difficulty || 'MEDIUM',
      duration: exam.duration || 60,
      total_time: exam.duration || 60,
      total_score: exam.totalScore || 10.0,
      status: exam.status || 'ACTIVE',
      questions: exam.customQuestions ? exam.customQuestions.map((cq: any) => ({
        question_id: cq.question.id,
        max_score: cq.maxScore || 1.0,
        suggested_time: cq.suggestedTime || cq.suggested_time || 20,
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

  protected onRemoveQuestion(index: number, isEditing: boolean = false): void {
    const exam = isEditing ? this.editingExam() : this.generatedExam();
    if (exam && exam.customQuestions) {
      exam.customQuestions.splice(index, 1);
      exam.customQuestions.forEach((cq: any, idx: number) => {
        cq.sequenceOrder = idx + 1;
        cq.sequence_order = idx + 1;
      });
      const calculated = this.recalculateExamStats(exam);
      if (isEditing) {
        this.editingExam.set({ ...calculated });
      } else {
        this.generatedExam.set({ ...calculated });
      }
      this.successMessage.set('Đã xóa câu hỏi khỏi đề thi.');
    }
  }

  protected onMaxScoreChange(index: number, newScore: number, isEditing: boolean = false): void {
    this.onScoreChange(index, newScore, isEditing);
  }

  private recalculateExamStats(exam: any): any {
    if (!exam || !exam.customQuestions) return exam;

    let score = 0;
    let totalTime = 0;
    exam.customQuestions.forEach((cq: any) => {
      score += Number(cq.maxScore) || 0;

      let qTime = cq.suggestedTime || cq.suggested_time;
      if (qTime == null && cq.question) {
        qTime = cq.question.suggested_time || cq.question.suggestedTime;
      }
      if (qTime == null && cq.question) {
        const diff = (cq.question.difficulty || '').toUpperCase();
        if (diff === 'EASY' || diff.includes('DIF-A1B2C3D4E5F6G7H8J9K') || diff === 'E') qTime = 15;
        else if (diff === 'HARD' || diff.includes('DIF-H1I2J3K4L5M6N7O8P9Q') || diff === 'H') qTime = 25;
        else qTime = 20;
      }
      if (qTime == null) qTime = 20;

      cq.suggestedTime = qTime;
      cq.suggested_time = qTime;
      totalTime += qTime;
    });

    exam.totalScore = Math.round(score * 100) / 100;
    exam.duration = totalTime;
    exam.totalTime = totalTime;
    return exam;
  }

  protected onScoreChange(index: number, newScore: number, isEditing: boolean = false): void {
    const exam = isEditing ? this.editingExam() : this.generatedExam();
    if (exam && exam.customQuestions && exam.customQuestions[index]) {
      exam.customQuestions[index].maxScore = Number(newScore) || 0;
      const calculated = this.recalculateExamStats(exam);
      if (isEditing) {
        this.editingExam.set({ ...calculated });
      } else {
        this.generatedExam.set({ ...calculated });
      }
    }
  }

  protected onTimeChange(index: number, newTime: number, isEditing: boolean = false): void {
    const exam = isEditing ? this.editingExam() : this.generatedExam();
    if (exam && exam.customQuestions && exam.customQuestions[index]) {
      const parsedTime = Number(newTime) || 1;
      exam.customQuestions[index].suggestedTime = parsedTime;
      exam.customQuestions[index].suggested_time = parsedTime;
      const calculated = this.recalculateExamStats(exam);
      if (isEditing) {
        this.editingExam.set({ ...calculated });
      } else {
        this.generatedExam.set({ ...calculated });
      }
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

  protected getDifficultyDisplayName(id: string): string {
    if (!id) return '';
    const diff = this.difficulties().find(d => d.id === id);
    return diff ? (diff.displayName || diff.display_name || id) : id;
  }

  protected getModalFilteredQuestions(): Question[] {
    let list = this.getQuestionsList() || [];

    const exam = this.editingExam() || this.generatedExam();
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
    const isEditing = !!this.editingExam();
    const exam = isEditing ? this.editingExam() : this.generatedExam();
    if (!exam) return;

    const mappedQ: any = {
      id: question.id,
      content: question.content,
      difficulty: question.difficulty,
      bloom_level: question.bloom_level,
      bloomLevel: question.bloom_level,
      type: question.type,
      topic_id: question.topic_id,
      suggested_time: question.suggested_time,
      suggestedTime: question.suggested_time
    };

    const qTime = question.suggested_time || 20;

    if (this.modalTargetIndex >= 0) {
      if (exam.customQuestions[this.modalTargetIndex]) {
        exam.customQuestions[this.modalTargetIndex].question = mappedQ;
        exam.customQuestions[this.modalTargetIndex].suggestedTime = qTime;
        exam.customQuestions[this.modalTargetIndex].suggested_time = qTime;
      }
    } else {
      if (!exam.customQuestions) exam.customQuestions = [];
      const seq = exam.customQuestions.length + 1;
      exam.customQuestions.push({
        question: mappedQ,
        maxScore: 0,
        suggestedTime: qTime,
        suggested_time: qTime,
        sequenceOrder: seq,
        sequence_order: seq
      });
    }

    const calculated = this.recalculateExamStats(exam);
    if (isEditing) {
      this.editingExam.set({ ...calculated });
    } else {
      this.generatedExam.set({ ...calculated });
    }
    this.closeQuestionSelector();
    this.successMessage.set(this.modalTargetIndex >= 0 ? 'Thay thế câu hỏi thành công!' : 'Thêm câu hỏi mới vào đề thành công!');
  }

  protected moveQuestionUp(index: number, isEditing: boolean = false): void {
    const exam = isEditing ? this.editingExam() : this.generatedExam();
    if (!exam || !exam.customQuestions || index <= 0) return;

    // Swap items
    const temp = exam.customQuestions[index];
    exam.customQuestions[index] = exam.customQuestions[index - 1];
    exam.customQuestions[index - 1] = temp;

    // Update sequenceOrder
    exam.customQuestions.forEach((cq: any, idx: number) => {
      cq.sequenceOrder = idx + 1;
      cq.sequence_order = idx + 1;
    });

    if (isEditing) {
      this.editingExam.set({ ...exam });
    } else {
      this.generatedExam.set({ ...exam });
    }
  }

  protected moveQuestionDown(index: number, isEditing: boolean = false): void {
    const exam = isEditing ? this.editingExam() : this.generatedExam();
    if (!exam || !exam.customQuestions || index >= exam.customQuestions.length - 1) return;

    // Swap items
    const temp = exam.customQuestions[index];
    exam.customQuestions[index] = exam.customQuestions[index + 1];
    exam.customQuestions[index + 1] = temp;

    // Update sequenceOrder
    exam.customQuestions.forEach((cq: any, idx: number) => {
      cq.sequenceOrder = idx + 1;
      cq.sequence_order = idx + 1;
    });

    if (isEditing) {
      this.editingExam.set({ ...exam });
    } else {
      this.generatedExam.set({ ...exam });
    }
  }

  protected onEditExam(exam: any): void {
    this.successMessage.set('');
    this.errorMessage.set('');
    // Clone target exam completely
    const cloned = JSON.parse(JSON.stringify(exam));
    const recalculated = this.recalculateExamStats(cloned);
    this.editingExam.set(recalculated);
    this.showEditExamModal.set(true);
  }

  protected closeEditExamModal(): void {
    this.showEditExamModal.set(false);
    this.editingExam.set(null);
  }

  protected onUpdateExam(): void {
    const exam = this.editingExam();
    if (!exam) return;

    if (Math.abs(exam.totalScore - 10.0) > 0.001) {
      this.errorMessage.set('Không thể lưu đề thi: Tổng điểm của đề thi phải bằng đúng 10.0 điểm.');
      return;
    }

    const payload = {
      id: exam.id,
      title: exam.title.trim(),
      difficulty: exam.difficulty || 'MEDIUM',
      duration: exam.duration || 60,
      total_time: exam.duration || 60,
      total_score: exam.totalScore || 10.0,
      status: exam.status || 'ACTIVE',
      questions: exam.customQuestions ? exam.customQuestions.map((cq: any) => ({
        question_id: cq.question.id,
        max_score: cq.maxScore || 1.0,
        suggested_time: cq.suggestedTime || cq.suggested_time || 20,
        sequence_order: cq.sequenceOrder || 1
      })) : []
    };

    this.examApi.saveExam(payload).subscribe({
      next: () => {
        this.successMessage.set(`Cập nhật đề thi "${exam.title}" thành công!`);
        this.closeEditExamModal();
        this.loadSavedExams();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi cập nhật đề thi.');
      }
    });
  }
}
