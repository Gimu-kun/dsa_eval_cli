import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ExamApiService } from '../../services/exam-api.service';

@Component({
  selector: 'app-evaluation-report',
  imports: [CommonModule, RouterLink],
  templateUrl: './evaluation-report.html'
})
export class EvaluationReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examApi = inject(ExamApiService);

  protected readonly examSubmission = signal<any | undefined>(undefined);
  protected readonly activeQuestionIndex = signal<number>(0);

  protected readonly activeExplanation = signal<boolean>(false);
  protected readonly explanationTitle = signal<string>('');
  protected readonly explanationText = signal<string>('');

  protected readonly isConceptsExpanded = signal<boolean>(true);
  protected readonly isRelationsExpanded = signal<boolean>(true);
  protected readonly isRulesExpanded = signal<boolean>(true);
  protected readonly isFunctionsExpanded = signal<boolean>(true);

  protected toggleConcepts(): void {
    this.isConceptsExpanded.update(v => !v);
  }

  protected toggleRelations(): void {
    this.isRelationsExpanded.update(v => !v);
  }

  protected toggleRules(): void {
    this.isRulesExpanded.update(v => !v);
  }

  protected toggleFunctions(): void {
    this.isFunctionsExpanded.update(v => !v);
  }

  protected showDetailedExplanation(qRes: any): void {
    this.explanationTitle.set("Giải thích chi tiết về kết quả đánh giá (DSA Evaluation)");
    let text = `Bộ đối sánh đã phân tích bài làm của bạn dựa trên 3 tiêu chí chính:\n\n`;
    text += `1. Khái niệm (Concepts): Các từ khóa cốt lõi liên quan đến chủ đề được so khớp mờ. Hệ thống kiểm tra xem bài làm của bạn có chứa các thuật ngữ và các từ đồng nghĩa được định nghĩa trong Ontology hay không.\n\n`;
    text += `2. Mối quan hệ ngữ nghĩa (Semantic Relations): Kiểm tra xem các khái niệm có liên kết logic với nhau thông qua các mẫu câu được định nghĩa hay không.\n\n`;
    text += `3. Các quy tắc (Rules): Đánh giá trình tự giải thuật và cấu trúc mã giả bằng đối sánh cây cú pháp trừu tượng (AST). Các cấu trúc điều khiển (if, else, while, for) được dựng thành cây và tính độ tương đồng cấu trúc.\n\n`;
    text += `Điểm số hiện tại phản ánh chính xác cấu trúc bài giải của bạn so với mô hình mong đợi.`;
    
    this.explanationText.set(text);
    this.activeExplanation.set(true);
  }

  protected showLearningRecommendations(qRes: any): void {
    this.explanationTitle.set("Gợi ý học tập từ hệ thống");
    let text = `Để nâng cao mức độ hiểu biết về chủ đề này, hệ thống gợi ý bạn:\n\n`;
    text += `- Xem lại tài liệu học tập của bài học liên quan.\n`;
    text += `- Luyện tập viết lại thuật toán và chú ý đầy đủ các bước đặc trưng (ví dụ: các biến con trỏ, điều kiện dừng vòng lặp, cập nhật vị trí).\n`;
    text += `- Thử sức với các câu hỏi ứng dụng có độ khó tương tự trong ngân hàng đề thi.\n`;
    
    this.explanationText.set(text);
    this.activeExplanation.set(true);
  }

  protected closeInfoBox(): void {
    this.activeExplanation.set(false);
  }

  protected readonly activeQuestionResult = computed(() => {
    const sub = this.examSubmission();
    if (!sub || !sub.questionResults) return undefined;
    return sub.questionResults[this.activeQuestionIndex()];
  });

  protected readonly topicName = computed(() => {
    const q = this.activeQuestionResult();
    if (!q) return '';
    return q.questionType;
  });

  protected readonly parsedChapters = computed(() => {
    const sub = this.examSubmission();
    if (!sub || !sub.feedback) return [];
    const chapters: any[] = [];
    const lines = sub.feedback.split('\n');
    // Regex matches e.g. "- **Chương {Cây Tìm Kiếm Nhị Phân}** (Tỉ lệ: 85.00%): {Mạnh (Strong)} - đạt kết quả xuất sắc"
    const chapterRegex = /- \*\*Chương \{(.*?)\}\*\* \(Tỉ lệ: (.*?)%\): \{(.*?)\} - (.*)/;
    for (const line of lines) {
      const m = line.match(chapterRegex);
      if (m) {
        chapters.push({
          name: m[1],
          percent: parseFloat(m[2]),
          strength: m[3],
          advice: m[4]
        });
      }
    }
    return chapters;
  });

  protected readonly parsedClos = computed(() => {
    const sub = this.examSubmission();
    if (!sub || !sub.feedback) return [];
    const clos: any[] = [];
    const lines = sub.feedback.split('\n');
    // Regex matches e.g. "- **{CLO 3}** (Tỉ lệ: 50.00%): {Đạt (Meets)}"
    const cloRegex = /- \*\*\{(.*?)\}\*\* \(Tỉ lệ: (.*?)%\): \{(.*?)\}(.*)/;
    for (const line of lines) {
      const m = line.match(cloRegex);
      if (m) {
        clos.push({
          name: m[1],
          percent: parseFloat(m[2]),
          status: m[3],
          advice: m[4] ? m[4].trim().replace(/^- /, '') : ''
        });
      }
    }
    return clos;
  });

  protected readonly parsedBloom = computed(() => {
    const sub = this.examSubmission();
    if (!sub || !sub.feedback) return [];
    const blooms: any[] = [];
    const lines = sub.feedback.split('\n');
    // Regex matches e.g. "- Câu 1 - Mức Bloom: {UNDERSTANDING}, Kết quả: {Đạt (Achieved)} (Điểm: 8.5/10)"
    const bloomRegex = /- Câu (\d+) - Mức Bloom: \{(.*?)\}, Kết quả: \{(.*?)\} \(Điểm: (.*?)\/10\)/;
    for (const line of lines) {
      const m = line.match(bloomRegex);
      if (m) {
        blooms.push({
          questionIndex: parseInt(m[1]),
          level: m[2],
          result: m[3],
          score: parseFloat(m[4])
        });
      }
    }
    return blooms;
  });

  // Calculate circular stroke offset for score ring (radius = 36, circumference = 2 * PI * 36 ~ 226)
  protected getScoreStrokeOffset(score: number, maxScore: number): number {
    const circumference = 226.19;
    const ratio = maxScore > 0 ? (score / maxScore) : 0;
    return circumference - ratio * circumference;
  }

  // Calculate percentage strokes for breakdowns
  protected getPercentOffset(score: number): string {
    return `${(score * 100).toFixed(0)}%`;
  }

  ngOnInit(): void {
    const submissionId = this.route.snapshot.paramMap.get('submissionId');
    if (submissionId) {
      this.examApi.fetchExamSubmission(submissionId).subscribe({
        next: (res) => {
          this.examSubmission.set(res);
        },
        error: (err) => {
          console.error('Lỗi tải kết quả đánh giá:', err);
          alert('Không thể tải kết quả đánh giá: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  protected selectQuestion(index: number): void {
    this.activeQuestionIndex.set(index);
    this.activeExplanation.set(false);
  }

  // Compile list of action items based on missed evaluations
  protected readonly improvementAdvice = computed(() => {
    const qRes = this.activeQuestionResult();
    if (!qRes || !qRes.matchedEvidence) return [];

    const advice: string[] = [];
    const evidence = qRes.matchedEvidence;

    // Check concepts
    if (evidence.concepts_evaluated) {
      evidence.concepts_evaluated.concept_evaluation_results.forEach((res: any) => {
        if (res.status === 'MISSED') {
          advice.push(`Cần ôn tập khái niệm cốt lõi: "${res.concept}".`);
        }
      });
    }

    // Check relationships
    if (evidence.relationships_evaluated) {
      evidence.relationships_evaluated.relation_evaluation_results.forEach((res: any) => {
        if (res.status === 'MISSED') {
          advice.push(`Làm rõ mối liên hệ ngữ nghĩa trong quan hệ: "${res.relation_type}".`);
        }
      });
    }

    // Check rules
    if (evidence.rules_evaluated) {
      evidence.rules_evaluated.rule_evaluation_results.forEach((res: any) => {
        if (res.score < res.weight) {
          advice.push(`Thực hành và chuẩn hóa logic thuật toán cho quy tắc: "${res.rule_name}".`);
        }
      });
    }

    // Default if perfect score
    if (advice.length === 0 && qRes.scoreEarned >= 9.5) {
      advice.push('Bài làm xuất sắc! Không có khuyến nghị bổ sung nào. Hãy duy trì cấu trúc lập luận này ở các câu tiếp theo.');
    } else if (advice.length === 0) {
      advice.push('Hãy bổ sung các ví dụ thực tế hoặc giải thích sâu sắc hơn về tính chất và độ phức tạp.');
    }

    return advice;
  });
}
