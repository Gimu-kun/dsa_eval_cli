import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../services/mock-data.service';

@Component({
  selector: 'app-evaluation-report',
  imports: [CommonModule, RouterLink],
  templateUrl: './evaluation-report.html'
})
export class EvaluationReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mockService = inject(MockDataService);

  protected readonly examSubmission = signal<any | undefined>(undefined);
  protected readonly activeQuestionIndex = signal<number>(0);

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
    const subId = this.route.snapshot.paramMap.get('submissionId');
    if (subId) {
      this.mockService.fetchExamSubmission(subId).subscribe({
        next: (res) => {
          this.examSubmission.set(res);
        },
        error: (err) => {
          console.error('Lỗi khi tải kết quả bài thi:', err);
          this.router.navigate(['/']);
        }
      });
    } else {
      this.router.navigate(['/']);
    }
  }

  protected selectQuestion(index: number): void {
    this.activeQuestionIndex.set(index);
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
        if (res.status === 'MISSED' && res.error_message) {
          advice.push(`Thực hành định nghĩa lại thuật ngữ: "${res.concept}". ${res.error_message}`);
        }
      });
    }

    // Check relationships
    if (evidence.relationships_evaluated) {
      evidence.relationships_evaluated.relation_evaluation_results.forEach((res: any) => {
        if (res.status === 'MISSED' && res.error_message) {
          advice.push(`Làm rõ mối quan hệ: "${res.relation_type}". ${res.error_message}`);
        }
      });
    }

    // Check rules
    if (evidence.rules_evaluated) {
      evidence.rules_evaluated.rule_evaluation_results.forEach((res: any) => {
        if (res.score < res.weight && res.error_message) {
          advice.push(`Xem xét lại quy tắc: "${res.rule_name}". ${res.error_message}`);
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
