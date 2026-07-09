import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-test-evaluation-report',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './test-evaluation-report.html'
})
export class TestEvaluationReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  protected manualScore = signal<number | null>(null);
  protected readonly examSubmission = signal<any | undefined>(undefined);

  protected saveManualScore(): void {
    const score = this.manualScore();
    if (score !== null && score >= 0 && score <= 10) {
      const sub = this.examSubmission();
      if (sub) {
        const updatedSub = { ...sub, score: score };
        this.examSubmission.set(updatedSub);
        alert(`Đã lưu điểm thủ công thành công: ${score}`);
        this.manualScore.set(null); 
      }
    } else {
      alert("Vui lòng nhập điểm hợp lệ từ 0 đến 10.");
    }
  }
  protected readonly activeQuestionIndex = signal<number>(0);

  protected readonly activeExplanation = signal<boolean>(false);
  protected readonly explanationTitle = signal<string>('');
  protected readonly explanationText = signal<string>('');

  protected readonly isConceptsExpanded = signal<boolean>(true);
  protected readonly isRelationsExpanded = signal<boolean>(false);
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

  protected selectQuestion(index: number): void {
    this.activeQuestionIndex.set(index);
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

  protected getScoreStrokeOffset(score: number, maxScore: number): number {
    const circumference = 226.19;
    const ratio = maxScore > 0 ? (score / maxScore) : 0;
    return circumference - ratio * circumference;
  }

  protected getPercentOffset(score: number): string {
    return `${(score * 100).toFixed(0)}%`;
  }

  protected readonly improvementAdvice = computed(() => {
    const sub = this.examSubmission();
    if (!sub) return [];

    // For EXAM_8429
    if (sub.examId === 'EXAM_8429adc952594a7b8f') {
      const idx = this.activeQuestionIndex();
      if (idx === 1) {
        return ['Bài làm tương đối hoàn thiện.'];
      }
      return [
        'Cần bổ sung thêm khái niệm cốt lõi: "Access".',
        'Cần rà soát và làm rõ luật: "Process More Effective".'
      ];
    }

    // For EXAM_754d
    const qRes = this.activeQuestionResult();
    if (!qRes || !qRes.matchedEvidence) return [];

    const advice: string[] = [];
    const evidence = qRes.matchedEvidence;

    if (evidence.concepts_evaluated) {
      evidence.concepts_evaluated.concept_evaluation_results.forEach((res: any) => {
        if (res.status === 'MISSED') {
          advice.push(`Cần bổ sung thêm khái niệm cốt lõi: "${res.concept}".`);
        }
      });
    }

    if (evidence.rules_evaluated) {
      evidence.rules_evaluated.rule_evaluation_results.forEach((res: any) => {
        if (res.matchScore < 0.95 || res.synonymScore < 0.95) {
          advice.push(`Cần rà soát và làm rõ luật: "${res.rule_name}".`);
        }
      });
    }
    if (advice.length === 0) {
      advice.push('Bài làm tương đối hoàn thiện.');
    }

    return advice;
  });

  ngOnInit(): void {
    const subId = this.route.snapshot.paramMap.get('submissionId') || 'SUB_MOCK_8429';
    const savedStr = localStorage.getItem('mock_submitted_answers');
    let parsed: any = {};
    if (savedStr) {
      try {
        parsed = JSON.parse(savedStr);
      } catch (e) {
        console.error(e);
      }
    }

    if (subId === 'SUB_MOCK_ca71') {
      // FINAL EXAM (EXAM_ca71c6ec622143a8be) - 6 Questions
      let ansQ1 = parsed['EXAM_ca71_Q01'] || '';
      let ansQ2 = parsed['EXAM_ca71_Q02'] || '';
      let ansQ3 = parsed['EXAM_ca71_Q03'] || '';
      let ansQ4 = parsed['EXAM_ca71_Q04'] || '';
      let ansQ5 = parsed['EXAM_ca71_Q05'] || '';
      let ansQ6 = parsed['EXAM_ca71_Q06'] || '';

      if (!ansQ1.trim()) ansQ1 = 'Danh sách liên kết đơn và danh sách liên kết đôi khác nhau về cấu trúc và khả năng duyệt:\nVề cấu trúc: Danh sách liên kết đơn chỉ có con trỏ next để liên kết các nút theo một chiều. Danh sách liên kết đôi có thêm con trỏ prev, cho phép liên kết theo hai chiều.\nVề khả năng duyệt: Danh sách liên kết đơn chỉ có thể duyệt theo một chiều (từ đầu đến cuối). Danh sách liên kết đôi có thể duyệt theo hai chiều, giúp việc di chuyển giữa các nút linh hoạt hơn.';
      if (!ansQ2.trim()) ansQ2 = 'Trong bài toán kiểm tra cặp dấu ngoặc hợp lệ, ngăn xếp được dùng để lưu các dấu ngoặc mở. Khi gặp dấu ngoặc đóng, ta kiểm tra dấu ngoặc mở ở đỉnh ngăn xếp có khớp hay không. Nếu khớp thì lấy dấu ngoặc mở ra khỏi ngăn xếp. Sau khi duyệt hết chuỗi, nếu ngăn xếp rỗng thì các cặp ngoặc là hợp lệ.';
      if (!ansQ3.trim()) ansQ3 = 'Bước 1: Duyệt từng ký tự từ trái sang phải.\nBước 2: Nếu gặp ngoặc mở thì đưa vào ngăn xếp.\nBước 3: Gặp ngoặc đóng thì lấy ra khỏi ngăn xếp.';
      if (!ansQ4.trim()) ansQ4 = 'Nút lá (Leaf Node) là nút nằm ở vị trí dưới cùng của cây nhị phân và không có bất kỳ nút con nào.\nĐặc điểm chính:\n- Nút lá không có con trái lẫn con phải.\n- Nó là điểm kết thúc của mọi đường đi từ gốc xuống.\n- Trong một cây nhị phân, số lượng nút lá càng nhiều thường cho thấy cây có xu hướng cân bằng và phân bố đều hơn.';
      if (!ansQ5.trim()) ansQ5 = 'function dequeue(queue):\n    if queue.front == -1 or queue.front > queue.rear then\n        return "Hàng đợi rỗng"\n\n    x = queue.data[queue.front]\n    queue.front = queue.front + 1\n    return x';
      if (!ansQ6.trim()) ansQ6 = 'function enqueueCircular(queue, x):\n    queue.rear = (queue.rear + 1) mod MAX\n    queue.data[queue.rear] = x\n    return true';

      const scoreQ1 = 9.0;  // 9.0/10 -> weighted: 1.35/1.5
      const scoreQ2 = 8.67; // 8.67/10 -> weighted: 1.30/1.5
      const scoreQ3 = 4.33; // 4.33/10 -> weighted: 0.65/1.5
      const scoreQ4 = 9.33; // 9.33/10 -> weighted: 1.40/1.5
      const scoreQ5 = 8.50; // 8.50/10 -> weighted: 1.70/2.0
      const scoreQ6 = 2.75; // 2.75/10 -> weighted: 0.55/2.0

      const finalScore = 6.95;

      this.examSubmission.set({
        id: "SUB_MOCK_ca71",
        examId: "EXAM_ca71c6ec622143a8be",
        examTitle: "Đề thi cuối kỳ",
        score: finalScore,
        maxScore: 10.0,
        studentName: "Quản trị viên",
        submittedAt: new Date().toISOString(),
        timeLimit: 90,
        timeSpent: 78,
        accScore: 0.695,
        compScore: 0.74,
        logScore: 1.0,
        cloStats: [
          { name: 'CLO4: Mô tả và phân tích các cấu trúc dữ liệu cơ bản', prevScore: 0.00, increment: 8.94, currentScore: 8.94, status: 'Đạt' },
          { name: 'CLO5: Thiết kế và mô tả giải pháp sử dụng cấu trúc dữ liệu và thuật toán để giải quyết các bài toán đơn giản', prevScore: 0.00, increment: 5.25, currentScore: 5.25, status: 'Đạt' }
        ],
        chapterStats: [
          { name: 'Chương 3: Danh sách liên kết', prevScore: 0.00, increment: 9.00, currentScore: 9.00, status: 'Khá' },
          { name: 'Chương 4: Ngăn xếp & Hàng đợi', prevScore: 0.00, increment: 6.06, currentScore: 6.06, status: 'Khá' },
          { name: 'Chương 5: Cây nhị phân', prevScore: 0.00, increment: 9.33, currentScore: 9.33, status: 'Tốt' }
        ],
        conceptStats: [
          { name: 'LinkedList', prevScore: 0.00, increment: 9.00, currentScore: 9.00, status: 'Khá' },
          { name: 'Stack', prevScore: 0.00, increment: 6.50, currentScore: 6.50, status: 'Khá' },
          { name: 'Queue', prevScore: 0.00, increment: 5.63, currentScore: 5.63, status: 'Trung bình' },
          { name: 'BinaryTree', prevScore: 0.00, increment: 9.33, currentScore: 9.33, status: 'Tốt' }
        ],
        progressReport: {
          overallSlope: 0.58,
          overallTrendVN: 'Khá',
          advice: 'Hệ số tiến bộ ổn định: +0.58đ. Các cấu trúc dữ liệu cơ bản nắm khá vững. Cần lưu ý tối ưu hóa thuật toán.'
        },
        feedback: `- **{CLO 4}** (Tỉ lệ: 89.4%): {Đạt} - Nắm vững mô tả cấu trúc dữ liệu cơ bản.\n` +
          `- **{CLO 5}** (Tỉ lệ: 52.5%): {Đạt} - Thiết kế cơ bản giải pháp sử dụng cấu trúc dữ liệu.\n` +
          `- **Chương {Danh sách liên kết}** (Tỉ lệ: 90.0%): {Tốt}\n` +
          `- **Chương {Cây nhị phân}** (Tỉ lệ: 93.3%): {Tốt}\n` +
          `- **Chương {Ngăn xếp & Hàng đợi}** (Tỉ lệ: 60.6%): {Khá}\n\n` +
          `- Câu 1 - Mức Bloom: {Hiểu}, Kết quả: {Đạt} (Điểm: 9.0/10)\n` +
          `- Câu 2 - Mức Bloom: {Hiểu}, Kết quả: {Đạt} (Điểm: 8.7/10)\n` +
          `- Câu 3 - Mức Bloom: {Áp dụng}, Kết quả: {Không đạt} (Điểm: 4.3/10)\n` +
          `- Câu 4 - Mức Bloom: {Hiểu}, Kết quả: {Đạt} (Điểm: 9.3/10)\n` +
          `- Câu 5 - Mức Bloom: {Áp dụng}, Kết quả: {Đạt} (Điểm: 8.5/10)\n` +
          `- Câu 6 - Mức Bloom: {Áp dụng}, Kết quả: {Không đạt} (Điểm: 2.8/10)`,
        questionResults: [
          {
            questionId: "EXAM_ca71_Q01",
            questionType: "DESCRIPTIVE",
            bloomLevel: "Hiểu",
            questionContent: "Nêu sự khác biệt cơ bản giữa danh sách liên kết đơn và danh sách liên kết đôi về cấu trúc và khả năng duyệt danh sách.",
            submittedText: ansQ1,
            submittedAnswerHtml: `<span>${ansQ1}</span>`,
            expectedAnswerHtml: `<span>Danh sách liên kết đơn và danh sách liên kết đôi khác nhau về cấu trúc và khả năng duyệt:\n- Về cấu trúc: Danh sách liên kết đơn chỉ có con trỏ next để liên kết các nút theo một chiều. Danh sách liên kết đôi có thêm con trỏ prev, cho phép liên kết theo hai chiều.\n- Về khả năng duyệt: Danh sách liên kết đơn chỉ có thể duyệt theo một chiều (từ đầu đến cuối). Danh sách liên kết đôi có thể duyệt theo hai chiều, giúp việc di chuyển giữa các nút linh hoạt hơn.</span>`,
            scoreEarned: scoreQ1,
            maxScoreInExam: 1.5,
            weightedScore: 1.35,
            accScore: 0.90,
            compScore: 0.92,
            logScore: 1.0,
            feedbackText: "Bài làm trả lời tốt đầy đủ cấu trúc và hướng duyệt của hai cấu trúc danh sách.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.90,
                concept_evaluation_results: [
                  { concept: 'SinglyLinkedList', status: 'MATCHED', lexeme_found: 'danh sách liên kết đơn' },
                  { concept: 'DoublyLinkedList', status: 'MATCHED', lexeme_found: 'danh sách liên kết đôi' },
                  { concept: 'Structure', status: 'MATCHED', lexeme_found: 'cấu trúc' },
                  { concept: 'Traversal', status: 'MATCHED', lexeme_found: 'duyệt' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'hasDifferenceIn', status: 'MATCHED', source_concept: { description: 'danh sách liên kết đơn' }, target_concept: { description: 'cấu trúc và khả năng duyệt' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.90,
                rule_evaluation_results: [
                  { rule_name: 'SinglyNext', score: 0.27, weight: 0.30, matchScore: 0.90, synonymScore: 0.90, orderScore: 1.0, structureScore: 1.0, strength: 'Mô tả tốt cấu trúc danh sách liên kết đơn chỉ có next.' },
                  { rule_name: 'DoublyBoth', score: 0.27, weight: 0.30, matchScore: 0.90, synonymScore: 0.90, orderScore: 1.0, structureScore: 1.0, strength: 'Mô tả tốt cấu trúc danh sách liên kết đôi dùng cả next và prev.' },
                  { rule_name: 'SinglyOneWay', score: 0.225, weight: 0.25, matchScore: 0.90, synonymScore: 0.90, orderScore: 1.0, structureScore: 1.0, strength: 'Nêu hướng duyệt một chiều của danh sách liên kết đơn.' },
                  { rule_name: 'DoublyTwoWay', score: 0.135, weight: 0.15, matchScore: 0.90, synonymScore: 0.90, orderScore: 1.0, structureScore: 1.0, strength: 'Nêu chính xác danh sách liên kết đôi duyệt hai chiều.' }
                ]
              }
            }
          },
          {
            questionId: "EXAM_ca71_Q02",
            questionType: "DESCRIPTIVE",
            bloomLevel: "Hiểu",
            questionContent: "Nêu vai trò của ngăn xếp trong bài toán kiểm tra cặp dấu ngoặc hợp lệ.",
            submittedText: ansQ2,
            submittedAnswerHtml: `<span>${ansQ2}</span>`,
            expectedAnswerHtml: `<span>Trong bài toán kiểm tra cặp dấu ngoặc hợp lệ, ngăn xếp được dùng để lưu các dấu ngoặc mở. Khi gặp dấu ngoặc đóng, ta kiểm tra dấu ngoặc mở ở đỉnh ngăn xếp có khớp hay không. Nếu khớp thì lấy dấu ngoặc mở ra khỏi ngăn xếp. Sau khi duyệt hết chuỗi, nếu ngăn xếp rỗng thì các cặp ngoặc là hợp lệ.</span>`,
            scoreEarned: scoreQ2,
            maxScoreInExam: 1.5,
            weightedScore: 1.30,
            accScore: 0.867,
            compScore: 0.88,
            logScore: 1.0,
            feedbackText: "Khớp tốt vai trò ngăn xếp trong bài toán dấu ngoặc.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.87,
                concept_evaluation_results: [
                  { concept: 'Stack', status: 'MATCHED', lexeme_found: 'ngăn xếp' },
                  { concept: 'BalancedParentheses', status: 'MATCHED', lexeme_found: 'cặp dấu ngoặc hợp lệ' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'pushOpenBracket', status: 'MATCHED', source_concept: { description: 'đưa ngoặc mở' }, target_concept: { description: 'ngăn xếp' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.867,
                rule_evaluation_results: [
                  { rule_name: 'PushOpen', score: 0.30, weight: 0.35, matchScore: 0.86, synonymScore: 0.86, orderScore: 1.0, structureScore: 1.0, strength: 'Trình bày đúng việc lưu dấu ngoặc mở vào stack.' },
                  { rule_name: 'PopClose', score: 0.30, weight: 0.35, matchScore: 0.86, synonymScore: 0.86, orderScore: 1.0, structureScore: 1.0, strength: 'Mô tả chính xác thao tác pop khi gặp ngoặc đóng.' },
                  { rule_name: 'EmptyValid', score: 0.267, weight: 0.30, matchScore: 0.89, synonymScore: 0.89, orderScore: 1.0, structureScore: 1.0, strength: 'Xác định đúng điều kiện chuỗi hợp lệ chỉ khi ngăn xếp rỗng.' }
                ]
              }
            }
          },
          {
            questionId: "EXAM_ca71_Q03",
            questionType: "PROCEDURE",
            bloomLevel: "Áp dụng",
            questionContent: "Mô tả các bước kiểm tra một chuỗi dấu ngoặc có hợp lệ hay không bằng ngăn xếp.",
            submittedText: ansQ3,
            submittedAnswerHtml: `<span>${ansQ3}</span>`,
            expectedAnswerHtml: `<span>Bước 1: Duyệt từng ký tự của chuỗi từ trái sang phải.\nBước 2: Nếu gặp dấu ngoặc mở thì đưa dấu đó vào ngăn xếp.\nBước 3: Nếu gặp dấu ngoặc đóng thì kiểm tra ngăn xếp có rỗng không và dấu ở đỉnh có cùng loại không.\nBước 4: Nếu không khớp thì chuỗi không hợp lệ.\nBước 5: Sau khi duyệt xong, chuỗi hợp lệ khi ngăn xếp rỗng.</span>`,
            scoreEarned: scoreQ3,
            maxScoreInExam: 1.5,
            weightedScore: 0.65,
            accScore: 0.433,
            compScore: 0.50,
            logScore: 1.0,
            feedbackText: "Thiếu các bước kiểm tra điều kiện dừng (khi stack rỗng giữa chừng) và kiểm tra cuối tiến trình.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.50,
                concept_evaluation_results: [
                  { concept: 'Stack', status: 'MATCHED', lexeme_found: 'ngăn xếp' },
                  { concept: 'BalancedParentheses', status: 'MATCHED', lexeme_found: 'ngoặc' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'pushOpenBracket', status: 'MATCHED', source_concept: { description: 'ngoặc mở' }, target_concept: { description: 'ngăn xếp' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.433,
                rule_evaluation_results: [
                  { rule_name: 'TraverseChar', score: 0.20, weight: 0.20, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Trình bày đúng bước duyệt chuỗi ký tự.' },
                  { rule_name: 'PushOpen', score: 0.20, weight: 0.20, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Mô tả tốt thao tác đưa ngoặc mở vào stack.' },
                  { rule_name: 'PopClose', score: 0.25, weight: 0.25, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Lấy ngoặc mở ra khớp với ngoặc đóng.' },
                  { rule_name: 'EmptyFinish', score: 0.0, weight: 0.20, matchScore: 0.0, synonymScore: 0.0, orderScore: 1.0, structureScore: 1.0 },
                  { rule_name: 'Sequence', score: 0.0, weight: 0.15, matchScore: 0.0, synonymScore: 0.0, orderScore: 1.0, structureScore: 1.0 }
                ]
              }
            }
          },
          {
            questionId: "EXAM_ca71_Q04",
            questionType: "DESCRIPTIVE",
            bloomLevel: "Hiểu",
            questionContent: "Giải thích nút lá (Leaf Node) trong cây nhị phân là gì và nêu đặc điểm chính của nó.",
            submittedText: ansQ4,
            submittedAnswerHtml: `<span>${ansQ4}</span>`,
            expectedAnswerHtml: `<span>Nút lá (Leaf Node) là nút nằm ở vị trí dưới cùng của cây nhị phân và không có bất kỳ nút con nào.\nĐặc điểm chính:\n- Nút lá không có con trái lẫn con phải.\n- Nó là điểm kết thúc của mọi đường đi từ gốc xuống.\n- Trong một cây nhị phân, số lượng nút lá càng nhiều thường cho thấy cây có xu hướng cân bằng và phân bố đều hơn.</span>`,
            scoreEarned: scoreQ4,
            maxScoreInExam: 1.5,
            weightedScore: 1.40,
            accScore: 0.933,
            compScore: 0.94,
            logScore: 1.0,
            feedbackText: "Khớp tốt định nghĩa nút lá và các đặc điểm cân bằng của nút lá trên cây.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.93,
                concept_evaluation_results: [
                  { concept: 'LeafNode', status: 'MATCHED', lexeme_found: 'nút lá' },
                  { concept: 'BinaryTree', status: 'MATCHED', lexeme_found: 'cây nhị phân' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'hasNoChildren', status: 'MATCHED', source_concept: { description: 'nút lá' }, target_concept: { description: 'không có con' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.933,
                rule_evaluation_results: [
                  { rule_name: 'NoChildren', score: 0.42, weight: 0.45, matchScore: 0.93, synonymScore: 0.93, orderScore: 1.0, structureScore: 1.0, strength: 'Nêu rõ nút lá không có con trái và con phải.' },
                  { rule_name: 'BottomLocation', score: 0.33, weight: 0.35, matchScore: 0.94, synonymScore: 0.94, orderScore: 1.0, structureScore: 1.0, strength: 'Mô tả vị trí ở đáy cây chính xác.' },
                  { rule_name: 'TreeBalance', score: 0.183, weight: 0.20, matchScore: 0.92, synonymScore: 0.92, orderScore: 1.0, structureScore: 1.0, strength: 'Giải thích tốt vai trò nút lá đối với độ cân bằng của cây.' }
                ]
              }
            }
          },
          {
            questionId: "EXAM_ca71_Q05",
            questionType: "PROCEDURE",
            bloomLevel: "Áp dụng",
            questionContent: "Viết mã giả thực hiện thao tác Dequeue để lấy một phần tử ra khỏi hàng đợi dùng mảng.",
            submittedText: ansQ5,
            submittedAnswerHtml: `<pre class="font-mono bg-slate-50 p-3 rounded-lg text-slate-800 text-xs">${ansQ5}</pre>`,
            expectedAnswerHtml: `<pre class="font-mono bg-slate-50 p-3 rounded-lg text-slate-800 text-xs">function dequeue(queue):\n    if queue.front == -1 or queue.front > queue.rear then\n        return "Hàng đợi rỗng"\n\n    x = queue.data[queue.front]\n    queue.front = queue.front + 1\n    return x</pre>`,
            scoreEarned: scoreQ5,
            maxScoreInExam: 2.0,
            weightedScore: 1.70,
            accScore: 0.85,
            compScore: 0.88,
            logScore: 1.0,
            feedbackText: "Mã giả trình bày rõ ràng, đầy đủ các bước thực hiện dequeue và kiểm tra rỗng.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.85,
                concept_evaluation_results: [
                  { concept: 'Queue', status: 'MATCHED', lexeme_found: 'hàng đợi' },
                  { concept: 'Dequeue', status: 'MATCHED', lexeme_found: 'dequeue' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'hasFront', status: 'MATCHED', source_concept: { description: 'dequeue' }, target_concept: { description: 'front' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.85,
                rule_evaluation_results: [
                  { rule_name: 'EmptyCheck', score: 0.21, weight: 0.25, matchScore: 0.84, synonymScore: 0.84, orderScore: 1.0, structureScore: 1.0, strength: 'Kiểm tra đầy đủ điều kiện hàng đợi rỗng.' },
                  { rule_name: 'GetValue', score: 0.30, weight: 0.35, matchScore: 0.86, synonymScore: 0.86, orderScore: 1.0, structureScore: 1.0, strength: 'Lấy chính xác phần tử ở vị trí front.' },
                  { rule_name: 'MoveFront', score: 0.34, weight: 0.40, matchScore: 0.85, synonymScore: 0.85, orderScore: 1.0, structureScore: 1.0, strength: 'Tăng front chính xác lên 1 và trả về phần tử.' }
                ]
              }
            }
          },
          {
            questionId: "EXAM_ca71_Q06",
            questionType: "PROCEDURE",
            bloomLevel: "Áp dụng",
            questionContent: "Viết mã giả thêm một phần tử x vào hàng đợi vòng kích thước MAX.",
            submittedText: ansQ6,
            submittedAnswerHtml: `<pre class="font-mono bg-slate-50 p-3 rounded-lg text-slate-800 text-xs">${ansQ6}</pre>`,
            expectedAnswerHtml: `<pre class="font-mono bg-slate-50 p-3 rounded-lg text-slate-800 text-xs">function enqueueCircular(queue, x):\n    if (queue.rear + 1) mod MAX == queue.front then\n        return "Hàng đợi vòng đầy"\n\n    if queue.front == -1 then\n        queue.front = 0\n\n    queue.rear = (queue.rear + 1) mod MAX\n    queue.data[queue.rear] = x\n    return true</pre>`,
            scoreEarned: scoreQ6,
            maxScoreInExam: 2.0,
            weightedScore: 0.55,
            accScore: 0.275,
            compScore: 0.35,
            logScore: 1.0,
            feedbackText: "Thiếu hoàn toàn điều kiện kiểm tra đầy (overflow) và khởi tạo giá trị cho front.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.35,
                concept_evaluation_results: [
                  { concept: 'CircularQueue', status: 'MATCHED', lexeme_found: 'hàng đợi vòng' },
                  { concept: 'Enqueue', status: 'MATCHED', lexeme_found: 'enqueue' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 0.50,
                relation_evaluation_results: [
                  { relation_type: 'usesModulo', status: 'MATCHED', source_concept: { description: 'enqueueCircular' }, target_concept: { description: 'mod' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.275,
                rule_evaluation_results: [
                  { rule_name: 'FullCheck', score: 0.0, weight: 0.25, matchScore: 0.0, synonymScore: 0.0, orderScore: 1.0, structureScore: 1.0 },
                  { rule_name: 'FrontInit', score: 0.0, weight: 0.20, matchScore: 0.0, synonymScore: 0.0, orderScore: 1.0, structureScore: 1.0 },
                  { rule_name: 'RearUpdate', score: 0.30, weight: 0.30, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Cập nhật rear tuần hoàn theo công thức modulo tốt.' },
                  { rule_name: 'AssignValue', score: 0.25, weight: 0.25, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Gán chính xác dữ liệu tại vị trí rear mới.' }
                ]
              }
            }
          }
        ]
      });
    } else if (subId === 'SUB_MOCK_754d') {
      // MIDTERM EXAM (EXAM_754d0f85412f46fdb7) - 4 Questions
      let ansQ1 = parsed['EXAM_754d_Q01'] || '';
      let ansQ2 = parsed['EXAM_754d_Q02'] || '';
      let ansQ3 = parsed['EXAM_754d_Q03'] || '';
      let ansQ4 = parsed['EXAM_754d_Q04'] || '';

      if (!ansQ1.trim()) ansQ1 = 'Các thao tác cơ bản của ngăn xếp gồm: Push dùng để thêm một phần tử vào ngăn xếp; Pop dùng để lấy phần tử ra khỏi ngăn xếp; Peek dùng để xem phần tử nhưng không xóa nó; isEmpty và isFull dùng để kiểm tra ngăn xếp rỗng hoặc đầy.';
      if (!ansQ2.trim()) ansQ2 = 'Bước 1: Khởi tạo ngăn xếp.\nBước 2: Đưa số 4 vào ngăn xếp.\nBước 3: Đưa số 7 vào ngăn xếp.\nBước 4: Cho tiếp số 8 vào.\nBước 5: Pop lấy ra là số 9 thêm sau cùng.';
      if (!ansQ3.trim()) ansQ3 = 'Danh sách liên kết đơn là cấu trúc gồm các nút nối tiếp nhau. Mỗi nút chứa phần dữ liệu của nó. Cấu trúc này giúp dễ dàng cấp phát bộ nhớ động khi chạy chương trình.';
      if (!ansQ4.trim()) ansQ4 = 'Bước 1: Tạo một nút mới chứa giá trị X.\nBước 2: Cho nút đầu tiên trỏ đến nút mới này để biến nó thành nút đầu danh sách.';

      const scoreQ1 = 7.0;
      const scoreQ2 = 6.4;
      const scoreQ3 = 6.5;
      const scoreQ4 = 5.8;

      const finalScore = 6.37;

      this.examSubmission.set({
        id: "SUB_MOCK_754d",
        examId: "EXAM_754d0f85412f46fdb7",
        examTitle: "Đề kiểm tra giữa kỳ",
        score: finalScore,
        maxScore: 10.0,
        studentName: "Quản trị viên",
        submittedAt: new Date().toISOString(),
        timeLimit: 60,
        timeSpent: 52,
        accScore: 0.64,
        compScore: 0.71,
        logScore: 1.0,
        cloStats: [
          { name: 'CLO4: Mô tả và phân tích các cấu trúc dữ liệu cơ bản', prevScore: 0.00, increment: 6.75, currentScore: 6.75, status: 'Đạt' },
          { name: 'CLO5: Thiết kế và mô tả giải pháp sử dụng cấu trúc dữ liệu và thuật toán để giải quyết các bài toán đơn giản', prevScore: 0.00, increment: 6.10, currentScore: 6.10, status: 'Đạt' }
        ],
        chapterStats: [
          { name: 'Chương 3: Ngăn xếp & Hàng đợi', prevScore: 0.00, increment: 6.70, currentScore: 6.70, status: 'Tốt' },
          { name: 'Chương 4: Danh sách liên kết', prevScore: 0.00, increment: 6.15, currentScore: 6.15, status: 'Tốt' }
        ],
        conceptStats: [
          { name: 'Stack', prevScore: 0.00, increment: 6.70, currentScore: 6.70, status: 'Tốt' },
          { name: 'LinkedList', prevScore: 0.00, increment: 6.15, currentScore: 6.15, status: 'Tốt' }
        ],
        progressReport: {
          overallSlope: -0.85,
          overallTrendVN: 'Cần cố gắng',
          advice: 'Hệ số tiến bộ giảm sút: -0.85đ/bài thi. Khả năng làm bài các câu hỏi về Stack và Danh sách liên kết đơn cần cải thiện thêm.'
        },
        feedback: `- **{CLO 4}** (Tỉ lệ: 67.5%): {Đạt} - Nắm vững mô tả cấu trúc dữ liệu cơ bản.\n` +
          `- **{CLO 5}** (Tỉ lệ: 61%): {Đạt} - Thiết kế cơ bản giải pháp sử dụng cấu trúc dữ liệu.\n` +
          `- **Chương {Ngăn xếp & Hàng đợi}** (Tỉ lệ: 67%): {Khá}\n` +
          `- **Chương {Danh sách liên kết}** (Tỉ lệ: 61.5%): {Khá}\n\n` +
          `- Câu 1 - Mức Bloom: {Hiểu}, Kết quả: {Đạt} (Điểm: 7.0/10)\n` +
          `- Câu 2 - Mức Bloom: {Áp dụng}, Kết quả: {Đạt} (Điểm: 6.4/10)\n` +
          `- Câu 3 - Mức Bloom: {Hiểu}, Kết quả: {Đạt} (Điểm: 6.5/10)\n` +
          `- Câu 4 - Mức Bloom: {Áp dụng}, Kết quả: {Đạt} (Điểm: 5.8/10)`,
        questionResults: [
          {
            questionId: "EXAM_754d_Q01",
            questionType: "DESCRIPTIVE",
            bloomLevel: "Hiểu",
            questionContent: "Nêu các thao tác cơ bản của ngăn xếp và ý nghĩa của từng thao tác.",
            submittedText: ansQ1,
            submittedAnswerHtml: `<span>${ansQ1}</span>`,
            expectedAnswerHtml: `<span>Các thao tác cơ bản của ngăn xếp gồm: Push dùng để đưa một phần tử vào đỉnh ngăn xếp; Pop dùng để lấy phần tử ra khỏi ngăn xếp; Peek dùng để xem phần tử ở đỉnh nhưng không xóa nó; isEmpty và isFull dùng để kiểm tra ngăn xếp rỗng hoặc đầy.</span>`,
            scoreEarned: scoreQ1,
            maxScoreInExam: 2.0,
            weightedScore: 1.40,
            accScore: 0.70,
            compScore: 0.75,
            logScore: 1.0,
            feedbackText: "Khớp hầu hết các khái niệm và thao tác cơ bản của Stack.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.70,
                concept_evaluation_results: [
                  { concept: 'Stack', status: 'MATCHED', lexeme_found: 'ngăn xếp' },
                  { concept: 'Pop', status: 'MATCHED', lexeme_found: 'pop' },
                  { concept: 'Push', status: 'MATCHED', lexeme_found: 'push' },
                  { concept: 'Peek', status: 'MATCHED', lexeme_found: 'peek' },
                  { concept: 'Top', status: 'MISSED' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'hasOperation', status: 'MATCHED', source_concept: { description: 'ngăn xếp' }, target_concept: { description: 'các thao tác' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.70,
                rule_evaluation_results: [
                  { rule_name: 'PushOperation', score: 0.21, weight: 0.3, matchScore: 0.65, synonymScore: 0.75, orderScore: 1.0, structureScore: 1.0, strength: 'Trình bày chính xác thao tác đưa vào ngăn xếp (Push).', error_message: 'Lỗi đối sánh: Thao tác Push chưa mô tả rõ việc đưa phần tử vào đỉnh ngăn xếp.' },
                  { rule_name: 'PopOperation', score: 0.30, weight: 0.3, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Trình bày chính xác thao tác lấy ra khỏi ngăn xếp (Pop).' },
                  { rule_name: 'PeekOperation', score: 0.14, weight: 0.2, matchScore: 0.60, synonymScore: 0.80, orderScore: 1.0, structureScore: 1.0, strength: 'Trình bày chính xác thao tác xem đỉnh (Peek).', error_message: 'Lỗi đối sánh: Thao tác Peek chưa mô tả rõ việc xem phần tử ở đỉnh ngăn xếp.' },
                  { rule_name: 'CheckStatus', score: 0.20, weight: 0.2, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Mô tả tốt chức năng isEmpty và isFull.' }
                ]
              }
            }
          },
          {
            questionId: "EXAM_754d_Q02",
            questionType: "PROCEDURE",
            bloomLevel: "Áp dụng",
            questionContent: "Mô tả quy trình thêm ba phần tử 4, 7, 9 vào ngăn xếp rỗng và sau đó thực hiện một lần Pop.",
            submittedText: ansQ2,
            submittedAnswerHtml: `<span>${ansQ2}</span>`,
            expectedAnswerHtml: `<span>Bước 1: Ban đầu ngăn xếp rỗng. \nBước 2: Thực hiện Push 4, khi đó 4 nằm ở đỉnh. \nBước 3: Thực hiện Push 7, khi đó 7 nằm ở đỉnh. \nBước 4: Thực hiện Push 9, khi đó 9 nằm ở đỉnh. \nBước 5: Thực hiện Pop, phần tử được lấy ra là 9 vì 9 được thêm sau cùng.</span>`,
            scoreEarned: scoreQ2,
            maxScoreInExam: 2.0,
            weightedScore: 1.28,
            accScore: 0.64,
            compScore: 0.70,
            logScore: 1.0,
            feedbackText: "Đầy đủ các bước chèn và xóa theo đúng trình tự LIFO của Ngăn xếp.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.64,
                concept_evaluation_results: [
                  { concept: 'Stack', status: 'MATCHED', lexeme_found: 'ngăn xếp' },
                  { concept: 'Pop', status: 'MATCHED', lexeme_found: 'pop' },
                  { concept: 'Push', status: 'MISSED' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'hasTop', status: 'MATCHED', source_concept: { description: 'ngăn xếp' }, target_concept: { description: 'đỉnh ngăn xếp' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.64,
                rule_evaluation_results: [
                  { rule_name: 'PushFour', score: 0.128, weight: 0.2, matchScore: 0.60, synonymScore: 0.68, orderScore: 1.0, structureScore: 1.0, strength: 'Mô tả tốt bước push 4.', error_message: 'Lỗi quy trình: Thiếu thao tác Push 4 kỹ thuật, dùng từ ngữ không chuẩn xác.' },
                  { rule_name: 'PushSeven', score: 0.20, weight: 0.2, matchScore: 1.0, synonymScore: 1.0, strength: 'Mô tả tốt bước push 7.' },
                  { rule_name: 'PushNine', score: 0.128, weight: 0.2, matchScore: 0.32, synonymScore: 0.66, orderScore: 1.0, structureScore: 1.0, error_message: 'Lỗi quy trình: Thiếu thao tác Push 9 kỹ thuật, dùng từ ngữ không chuẩn xác.' },
                  { rule_name: 'PopNine', score: 0.25, weight: 0.25, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Xác định đúng phần tử 9 được lấy ra.' },
                  { rule_name: 'LogicalSequence', score: 0.15, weight: 0.15, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Trình tự các bước cực kỳ mạch lạc và tuân thủ thứ tự logic.' }
                ]
              }
            }
          },
          {
            questionId: "EXAM_754d_Q03",
            questionType: "DESCRIPTIVE",
            bloomLevel: "Hiểu",
            questionContent: "Giải thích cấu trúc và nguyên lý hoạt động của danh sách liên kết đơn (Singly Linked List).",
            submittedText: ansQ3,
            submittedAnswerHtml: `<span>${ansQ3}</span>`,
            expectedAnswerHtml: `<span>Danh sách liên kết đơn là một cấu trúc dữ liệu gồm các nút nằm nối tiếp nhau. Mỗi nút gồm hai thành phần chính: phần dữ liệu lưu trữ giá trị và phần liên kết chứa con trỏ trỏ tới nút kế tiếp trong danh sách. Cấu trúc này giúp cấp phát bộ nhớ động khi chạy chương trình.</span>`,
            scoreEarned: scoreQ3,
            maxScoreInExam: 3.0,
            weightedScore: 1.95,
            accScore: 0.65,
            compScore: 0.72,
            logScore: 1.0,
            feedbackText: "Khái quát cấu trúc danh sách liên kết đơn khá tốt nhưng còn thiếu mô tả con trỏ liên kết các nút.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.65,
                concept_evaluation_results: [
                  { concept: 'LinkedList', status: 'MATCHED', lexeme_found: 'danh sách liên kết đơn' },
                  { concept: 'Node', status: 'MATCHED', lexeme_found: 'nút' },
                  { concept: 'Pointer', status: 'MISSED' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'hasNode', status: 'MATCHED', source_concept: { description: 'danh sách liên kết' }, target_concept: { description: 'nút' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.65,
                rule_evaluation_results: [
                  { rule_name: 'ListStructure', score: 0.325, weight: 0.5, matchScore: 0.60, synonymScore: 0.70, orderScore: 1.0, structureScore: 1.0, strength: 'Trình bày cơ bản các thành phần cấu tạo nên danh sách.' },
                  { rule_name: 'DynamicMemory', score: 0.50, weight: 0.5, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Nêu bật ưu điểm cấp phát bộ nhớ động.' }
                ]
              }
            }
          },
          {
            questionId: "EXAM_754d_Q04",
            questionType: "PROCEDURE",
            bloomLevel: "Áp dụng",
            questionContent: "Mô tả các bước chèn một nút mới có giá trị X vào đầu danh sách liên kết đơn.",
            submittedText: ansQ4,
            submittedAnswerHtml: `<span>${ansQ4}</span>`,
            expectedAnswerHtml: `<span>Bước 1: Tạo một nút mới chứa giá trị X.\nBước 2: Gán con trỏ liên kết (next) của nút mới trỏ tới nút đầu tiên hiện tại của danh sách (nút Head).\nBước 3: Cập nhật lại con trỏ Head của danh sách trỏ tới nút mới vừa tạo.</span>`,
            scoreEarned: scoreQ4,
            maxScoreInExam: 3.0,
            weightedScore: 1.74,
            accScore: 0.58,
            compScore: 0.68,
            logScore: 1.0,
            feedbackText: "Mô tả quy trình bị đảo ngược thứ tự cập nhật con trỏ, gây lỗi mất liên kết phần còn lại của danh sách.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.58,
                concept_evaluation_results: [
                  { concept: 'Insert', status: 'MATCHED', lexeme_found: 'chèn' },
                  { concept: 'Head', status: 'MATCHED', lexeme_found: 'nút đầu tiên' },
                  { concept: 'Link', status: 'MISSED' },
                  { concept: 'TempNode', status: 'MISSED' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'hasStep', status: 'MATCHED', source_concept: { description: 'chèn' }, target_concept: { description: 'các bước' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.58,
                rule_evaluation_results: [
                  { rule_name: 'PointNext', score: 0.232, weight: 0.4, matchScore: 0.50, synonymScore: 0.66, orderScore: 1.0, structureScore: 1.0, strength: 'Hiểu cơ bản việc cần chèn phần tử mới.' },
                  { rule_name: 'UpdateHead', score: 0.60, weight: 0.6, matchScore: 1.0, synonymScore: 1.0, orderScore: 1.0, structureScore: 1.0, strength: 'Trình bày đúng bước cập nhật lại con trỏ Head.' }
                ]
              }
            }
          }
        ]
      });
    } else {
      // DEFAULT EXAM (EXAM_8429adc952594a7b8f) - 2 Questions
      let ansQ1 = parsed['Q_01'] || '';
      let ansQ2 = parsed['Q_02'] || '';

      if (!ansQ1.trim()) {
        ansQ1 = 'Cấu trúc dữ liệu là cách tổ chức và lưu trữ dữ liệu trên máy tính dùng để giúp việc thêm, xóa hoặc sửa dữ liệu. Cấu trúc dữ liệu gồm đặc trưng cơ bản là nó giúp tổ chức dữ liệu một cách có hệ thống để máy tính hiểu được.';
      }
      if (!ansQ2.trim()) {
        ansQ2 = 'Các bước để tìm giá trị lớn nhất trong một mảng số nguyên thực hiện như sau:\nBước 1: Khởi tạo max với giá trị của phần tử đầu tiên.\nBước 2: Duyệt qua từng phần tử còn lại trong mảng từ vị trí thứ 2 đến cuối mảng.\nBước 3: So sánh từng phần tử với giá trị hiện tại của biến max. Nếu lớn hơn max, thì cập nhật giá trị của max thành phần tử đó. \nKhi duyệt hết mảng, biến max sẽ chứa giá trị lớn nhất.';
      }

      const expectedQ1 = 'Cấu trúc dữ liệu là cách tổ chức và lưu trữ dữ liệu trong máy tính nhằm giúp việc truy cập, thêm, xóa hoặc sửa đổi dữ liệu được thực hiện hiệu quả hơn. Các đặc điểm cơ bản của cấu trúc dữ liệu là nó giúp tổ chức dữ liệu một cách có hệ thống và hỗ trợ các thao tác xử lý dữ liệu nhanh chóng.';
      const expectedQ2 = 'Để tìm giá trị lớn nhất trong một mảng số nguyên, thực hiện các bước sau theo đúng trình tự:\nBước 1: Khởi tạo biến max bằng giá trị của phần tử đầu tiên trong mảng. Ví dụ: max = a[0]\nBước 2: Duyệt qua từng phần tử còn lại trong mảng từ vị trí thứ 2 đến cuối mảng. Ví dụ: Sử dụng vòng lặp for i = 1 to n-1\nBước 3: So sánh từng phần tử với giá trị hiện tại của biến max. Nếu phần tử hiện tại lớn hơn max, thì cập nhật giá trị của max bằng phần tử đó. Ví dụ: if a[i] > max then max = a[i]\nSau khi duyệt hết mảng, biến max sẽ chứa giá trị lớn nhất cần tìm.';

      const scoreQ1 = 6.3;
      const scoreQ2 = 8.1;
      const finalScore = (scoreQ1 + scoreQ2) / 2.0;

      let highlightedQ1 = ansQ1
        .replace(/(cấu\s+trúc\s+dữ\s+liệu)/gi, '<span>$1</span>')
        .replace(/(tổ\s+chức\s+và\s+lưu\s+trữ)/gi, '<span>$1</span>')
        .replace(/(truy\s+cập)/gi, '<span>$1</span>');

      let highlightedQ2 = ansQ2
        .replace(/(khởi\s+tạo|chọn\s+max)/gi, '<span>$1</span>')
        .replace(/(duyệt|vòng\s+lặp|for)/gi, '<span>$1</span>')
        .replace(/(so\s+sánh|lớn\s+hơn|cập\s+nhật)/gi, '<span>$1</span>');

      this.examSubmission.set({
        id: "SUB_MOCK_8429",
        examId: "EXAM_8429adc952594a7b8f",
        examTitle: "Đề kiểm tra thường kỳ lần 1",
        score: finalScore,
        maxScore: 10.0,
        studentName: "Quản trị viên",
        submittedAt: new Date().toISOString(),
        timeLimit: 30,
        timeSpent: 36,
        accScore: 0.72,
        compScore: 0.80,
        logScore: 1.0,
        cloStats: [
          { name: 'CLO1: Hiểu được các khái niệm cơ bản về thuật toán, độ phức tạp và phương pháp biểu diễn thuật toán', prevScore: 0.00, increment: scoreQ1, currentScore: scoreQ1, status: 'Đạt' },
          { name: 'CLO2: Phân tích bài toán tìm kiếm, xác định ràng buộc và đánh giá các giải pháp thuật toán phù hợp', prevScore: 0.00, increment: scoreQ2, currentScore: scoreQ2, status: 'Đạt' }
        ],
        chapterStats: [
          { name: 'Chương 1: Tổng quan CTDL', prevScore: 0.00, increment: scoreQ1, currentScore: scoreQ1, status: 'Tốt' },
          { name: 'Chương 2: Sắp xếp & Tìm kiếm', prevScore: 0.00, increment: scoreQ2, currentScore: scoreQ2, status: 'Tốt' }
        ],
        conceptStats: [
          { name: 'DataStructure', prevScore: 0.00, increment: scoreQ1, currentScore: scoreQ1, status: 'Tốt' },
          { name: 'FindMax (Array)', prevScore: 0.00, increment: scoreQ2, currentScore: scoreQ2, status: 'Tốt' }
        ],
        progressReport: {
          overallSlope: 0.75,
          overallTrendVN: 'Tốt',
          advice: 'Hệ số tiến bộ tích cực: +0.75đ/bài thi. Mức độ làm chủ kiến thức và điểm số đang tăng trưởng tốt qua các bài kiểm tra gần đây.!'
        },
        feedback: `- **{CLO 1}** (Tỉ lệ: 63%): {Đạt} - Hiểu các khái niệm cơ bản về thuật toán và độ phức tạp.\n` +
          `- **{CLO 2}** (Tỉ lệ: 81%): {Đạt} - Phân tích bài toán tìm kiếm và đánh giá giải pháp thuật toán.\n` +
          `- **Chương {Tổng quan CTDL}** (Tỉ lệ: 63%): {Khá}\n` +
          `- **Chương {Mảng & Tìm kiếm}** (Tỉ lệ: 81%): {Tốt}\n\n` +
          `- Câu 1 - Mức Bloom: {Hiểu}, Kết quả: {Đạt} (Điểm: 6.3/10)\n` +
          `- Câu 2 - Mức Bloom: {Áp dụng}, Kết quả: {Đạt} (Điểm: 8.1/10)`,
        questionResults: [
          {
            questionId: "Q_01",
            questionType: "DESCRIPTIVE",
            bloomLevel: "Hiểu",
            questionContent: "Giải thích khái niệm cấu trúc dữ liệu. Nêu rõ các đặc điểm cơ bản của cấu trúc dữ liệu.",
            submittedText: ansQ1,
            submittedAnswerHtml: highlightedQ1,
            expectedAnswerHtml: expectedQ1
              .replace(/(cấu\s+trúc\s+dữ\s+liệu)/gi, '<span>$1</span>')
              .replace(/(tổ\s+chức\s+và\s+lưu\s+trữ)/gi, '<span>$1</span>')
              .replace(/(truy\s+cập)/gi, '<span>$1</span>'),
            scoreEarned: scoreQ1,
            maxScoreInExam: 5.0,
            weightedScore: 3.15,
            accScore: 0.63,
            compScore: 0.75,
            logScore: 1.0,
            feedbackText: "Bài làm trả lời tốt nội dung trọng tâm về lưu trữ và tổ chức dữ liệu.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.63,
                concept_evaluation_results: [
                  { concept: 'DataStructure', status: 'MATCHED', lexeme_found: 'cấu trúc dữ liệu' },
                  { concept: 'Storage', status: 'MATCHED', lexeme_found: 'lưu trữ' },
                  { concept: 'Access', status: 'MISSED', lexeme_found: 'truy cập' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'isUsedTo', status: 'MATCHED', source_concept: { description: 'cấu trúc dữ liệu' }, target_concept: { description: 'lưu trữ và truy cập' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.63,
                rule_evaluation_results: [
                  { rule_name: 'Process More Effective', score: 0.25, weight: 0.5, matchScore: 0.48, synonymScore: 0.84, orderScore: 1.0, structureScore: 1.0 },
                  { rule_name: 'Use For Storage', score: 0.38, weight: 0.5, matchScore: 0.78, synonymScore: 0.86, orderScore: 1.0, structureScore: 1.0, strength: 'Trình bày đầy đủ khái niệm lưu trữ dữ liệu.' }
                ]
              }
            }
          },
          {
            questionId: "Q_02",
            questionType: "PROCEDURE",
            bloomLevel: "Áp dụng",
            questionContent: "Mô tả các bước để tìm giá trị lớn nhất trong một mảng số nguyên.",
            submittedText: ansQ2,
            submittedAnswerHtml: highlightedQ2,
            expectedAnswerHtml: expectedQ2
              .replace(/(khởi\s+tạo)/gi, '<span>$1</span>')
              .replace(/(duyệt|vòng\s+lặp|for)/gi, '<span>$1</span>')
              .replace(/(so\s+sánh|lớn\s+hơn|cập\s+nhật)/gi, '<span>$1</span>'),
            scoreEarned: scoreQ2,
            maxScoreInExam: 5.0,
            weightedScore: 4.05,
            accScore: 0.81,
            compScore: 0.85,
            logScore: 1.0,
            feedbackText: "Đầy đủ các bước của thực hiện cần thiết.",
            matchedEvidence: {
              concepts_evaluated: {
                match_percent: 0.81,
                concept_evaluation_results: [
                  { concept: 'FindMax', status: 'MATCHED', lexeme_found: 'tìm giá trị lớn nhất' },
                  { concept: 'Array', status: 'MATCHED', lexeme_found: 'mảng' }
                ]
              },
              relationships_evaluated: {
                pass_percent: 1.0,
                relation_evaluation_results: [
                  { relation_type: 'hasStep', status: 'MATCHED', source_concept: { description: 'tìm max' }, target_concept: { description: 'các bước thuật toán' } }
                ]
              },
              rules_evaluated: {
                total_score: 0.81,
                rule_evaluation_results: [
                  { rule_name: 'InitMax', score: 0.246, weight: 0.3, matchScore: 0.82, synonymScore: 0.76, orderScore: 1.0, structureScore: 1.0, strength: 'Xác định đúng bước khởi đầu gán max = a[0].' },
                  { rule_name: 'BrowseWhole', score: 0.231, weight: 0.3, matchScore: 0.70, synonymScore: 0.84, orderScore: 1.0, structureScore: 1.0, strength: 'Lập cấu trúc lặp tuyến tính chính xác.' },
                  { rule_name: 'CompareUpdate', score: 0.333, weight: 0.4, matchScore: 0.75, synonymScore: 0.88, orderScore: 1.0, structureScore: 1.0, strength: 'Mô tả rõ ràng điều kiện so sánh.' }
                ]
              }
            }
          }
        ]
      });
    }
  }
}
