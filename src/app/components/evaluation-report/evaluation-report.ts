import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../services/mock-data.service';
import { SubmissionLog, Question } from '../../models/dsa-models';

@Component({
  selector: 'app-evaluation-report',
  imports: [CommonModule, RouterLink],
  templateUrl: './evaluation-report.html'
})
export class EvaluationReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mockService = inject(MockDataService);

  protected readonly submissionLog = signal<SubmissionLog | undefined>(undefined);
  protected readonly question = signal<Question | undefined>(undefined);

  protected readonly topicName = computed(() => {
    const log = this.submissionLog();
    if (!log) return '';
    return this.mockService.topics.find(t => t.id === log.topicId)?.name || '';
  });

  // Calculate circular stroke offset for score ring (radius = 36, circumference = 2 * PI * 36 ~ 226)
  protected getScoreStrokeOffset(score: number): number {
    const circumference = 226.19;
    return circumference - (score / 10) * circumference;
  }

  // Calculate percentage strokes for breakdowns
  protected getPercentOffset(score: number): string {
    return `${(score * 100).toFixed(0)}%`;
  }

  ngOnInit(): void {
    const subId = this.route.snapshot.paramMap.get('submissionId');
    if (subId) {
      const log = this.mockService.getSubmissionLogById(subId);
      if (log) {
        this.submissionLog.set(log);
        const q = this.mockService.getQuestionById(log.questionId);
        if (q) {
          this.question.set(q);
        }
      } else {
        this.router.navigate(['/']);
      }
    } else {
      this.router.navigate(['/']);
    }
  }

  // Compile list of action items based on missed evaluations
  protected readonly improvementAdvice = computed(() => {
    const log = this.submissionLog();
    if (!log) return [];

    const advice: string[] = [];
    const evidence = log.evaluationResult.matched_evidence;

    // Check concepts
    if (evidence.concepts_evaluated) {
      evidence.concepts_evaluated.concept_evaluation_results.forEach(res => {
        if (res.status === 'MISSED' && res.error_message) {
          advice.push(`Thực hành định nghĩa lại thuật ngữ: "${res.concept}". ${res.error_message}`);
        }
      });
    }

    // Check relationships
    if (evidence.relationships_evaluated) {
      evidence.relationships_evaluated.relation_evaluation_results.forEach(res => {
        if (res.status === 'MISSED' && res.error_message) {
          advice.push(`Làm rõ mối quan hệ: "${res.relation_type}". ${res.error_message}`);
        }
      });
    }

    // Check rules
    if (evidence.rules_evaluated) {
      evidence.rules_evaluated.rule_evaluation_results.forEach(res => {
        if (res.score < res.weight && res.error_message) {
          advice.push(`Xem xét lại quy tắc: "${res.rule_name}". ${res.error_message}`);
        }
      });
    }

    // Default if perfect score
    if (advice.length === 0 && log.score >= 9.5) {
      advice.push('Bài làm xuất sắc! Không có khuyến nghị bổ sung nào. Hãy duy trì cấu trúc lập luận này ở các câu tiếp theo.');
    } else if (advice.length === 0) {
      advice.push('Hãy bổ sung các ví dụ thực tế hoặc giải thích sâu sắc hơn về tính chất và độ phức tạp.');
    }

    return advice;
  });
}
