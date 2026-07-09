import { Component, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-evaluation',
  imports: [CommonModule, RouterLink],
  templateUrl: './test-evaluation.html'
})
export class TestEvaluationComponent implements OnInit {
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
    const bloomRegex1 = /- Câu (\d+) - Mức Bloom: \{(.*?)\}, Kết quả: \{(.*?)\} \(Điểm: (.*?)\/(.*?)\)/;
    const bloomRegex2 = /Question (\d+) - Expected: \{(.*?)\}, Achievement: \{(.*?)\} \(Score: (.*?)\/(.*?)\)/;
    for (const line of lines) {
      let m = line.match(bloomRegex1);
      if (m) {
        blooms.push({
          questionIndex: parseInt(m[1]),
          level: m[2],
          result: m[3],
          score: parseFloat(m[4]),
          maxScore: parseFloat(m[5])
        });
      } else {
        m = line.match(bloomRegex2);
        if (m) {
          blooms.push({
            questionIndex: parseInt(m[1]),
            level: m[2],
            result: m[3],
            score: parseFloat(m[4]),
            maxScore: parseFloat(m[5])
          });
        }
      }
    }
    console.log("parsedBloom output:", blooms);
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

  ngOnInit(): void {
    // Set mock data directly
    this.examSubmission.set({
      id: "SUB_MOCK_TEST",
      examId: "EXAM_MOCK_1",
      examTitle: "Đề thi kiểm tra giữa kì lần 1",
      score: 8.0,
      maxScore: 10.0,
      studentName: "Nguyễn Văn B",
      submittedAt: new Date().toISOString(),
      timeLimit: "60:00",
      timeSpent: 48,
      accScore: 0.835,
      compScore: 0.800,
      logScore: 1.0,
      cloStats: [
        { name: 'CLO 2: Phân tích bài toán tìm kiếm, xác định ràng buộc và đánh giá các giải pháp thuật toán phù hợp', prevScore: 6.70, increment: 0.97, currentScore: 7.67, status: 'Đạt' },
        { name: 'CLO 3: Phân tích bài toán sắp xếp, xác định ràng buộc và đánh giá giải pháp sắp xếp hiệu quả', prevScore: 6.60, increment: 1.12, currentScore: 7.72, status: 'Đạt' },
        { name: 'CLO 4: Mô tả và phân tích các cấu trúc dữ liệu cơ bản', prevScore: 0.00, increment: 7.65, currentScore: 7.65, status: 'Đạt' },
        { name: 'CLO 5: Thiết kế và mô tả giải pháp sử dụng cấu trúc dữ liệu và thuật toán để giải quyết các bài toán đơn giản', prevScore: 0.00, increment: 8.15, currentScore: 8.15, status: 'Đạt' }
      ],
      chapterStats: [
        { name: 'Chương 2: Tìm kiếm và sắp xếp', prevScore: 6.80, increment: 1.20, currentScore: 8.00, status: 'Khá' },
        { name: 'Chương 4: Ngăn xếp, hàng đợi', prevScore: 0.00, increment: 4.50, currentScore: 4.50, status: 'Khá' },
        { name: 'Chương 5: Cây nhị phân tìm kiếm', prevScore: 0.00, increment: 3.55, currentScore: 3.55, status: 'Tốt' }
      ],
      conceptStats: [
        { name: 'Cây BST', prevScore: 0.00, increment: 5.25, currentScore: 5.25, status: 'Khá' },
        { name: 'Bubble Sort', prevScore: 7.10, increment: 1.10, currentScore: 8.20, status: 'Khá tốt' },
        { name: 'Tìm kiếm nhị phân', prevScore: 7.00, increment: 1.00, currentScore: 8.00, status: 'Khá tốt' },
        { name: 'Hàng đợi (Queue)', prevScore: 0.00, increment: 7.50, currentScore: 7.50, status: 'Khá' }
      ],
      progressReport: {
        overallSlope: 0.75,
        overallTrendVN: 'Tốt',
        advice: 'Sinh viên có tiến bộ rõ rệt qua các bài thi gần đây. Cần tập trung hơn vào phần lập luận logic thứ tự các bước trong mô tả giải thuật để đạt điểm số tối đa.'
      },
      feedback: `- **{CLO 1}** (Tỉ lệ: 81%): {Đạt} - Vận dụng tốt các cấu trúc dữ liệu và giải thuật.\n` +
        `- **{CLO 2}** (Tỉ lệ: 86%): {Đạt} - Khả năng cài đặt thuật toán tương đối tốt.\n` +
        `- **Chương {Cây}** (Tỉ lệ: 84%): {Tốt} - Nắm được cấu trúc cây nhị phân tìm kiếm (BST).\n` +
        `- **Chương {Thuật toán sắp xếp & Tìm kiếm}** (Tỉ lệ: 86%): {Tốt} - Triển khai thuật toán tìm kiếm và sắp xếp.\n` +
        `- **Chương {Cấu trúc dữ liệu tuyến tính}** (Tỉ lệ: 82%): {Tốt} - Hiểu cơ chế hoạt động của Hàng đợi (Queue).\n\n` +
        `Bloom Level Achievement by Question:\n` +
        `Question 1 - Expected: {Hiểu}, Achievement: {Achieved} (Score: 1.71/2)\n` +
        `Question 2 - Expected: {Áp dụng}, Achievement: {Achieved} (Score: 1.64/2)\n` +
        `Question 3 - Expected: {Áp dụng}, Achievement: {Achieved} (Score: 2.4/3)\n` +
        `Question 4 - Expected: {Hiểu}, Achievement: {Achieved} (Score: 2.25/3)`,
      questionResults: [
        {
          questionId: "QUES_bst_desc",
          questionType: "DESCRIPTIVE",
          bloomLevel: "Hiểu",
          questionContent: "Hãy giải thích khái niệm cây nhị phân tìm kiếm (BST) và nêu rõ các tính chất quan trọng của nó?",
          submittedText: "Cây BST là cấu trúc cho phép tìm kiếm nhanh. Trong BST, mọi nút bên trái có giá trị nhỏ hơn nút cha và nút bên phải có giá trị lớn hơn. Nhờ vậy mà ta có thể tìm được phần tử rất nhanh.",
          submittedAnswerHtml: `Cây BST là cấu trúc cho phép tìm kiếm nhanh. Trong BST, mọi nút bên trái có giá trị nhỏ hơn nút cha và nút bên phải có giá trị lớn hơn. Nhờ vậy mà ta có thể tìm được phần tử rất nhanh.`,
          expectedAnswerHtml: `Cây nhị phân tìm kiếm (BST) là cây nhị phân mà với mọi nút, giá trị khóa ở cây con trái nhỏ hơn khóa nút gốc và giá trị ở cây con phải lớn hơn khóa nút gốc. Tính chất này giúp tìm kiếm có độ phức tạp O(logn) hoặc logarit.`,
          scoreEarned: 8.55,
          maxScoreInExam: 2.0,
          weightedScore: 1.7,
          accScore: 0.7,
          accW: 0.4,
          compScore: 0.6,
          compW: 0.3,
          logScore: 0.8,
          logW: 0.3,
          feedbackText: "Câu trả lời có độ chính xác khá tốt nhưng chưa đầy đủ chưa do thiếu thông tin về độ phức tạp thuật toán.",
          matchedEvidence: {
            concepts_evaluated: {
              match_percent: 1.0,
              concept_evaluation_results: [
                { concept: "BST (cây nhị phân tìm kiếm)", status: "MATCHED", lexeme_found: "BST", error_message: null },
                { concept: "Node (nút)", status: "MATCHED", lexeme_found: "nút", error_message: null }
              ]
            },
            relationships_evaluated: {
              pass_percent: 1.0,
              relation_evaluation_results: [
                {
                  relation_type: "hasLeft",
                  status: "MATCHED",
                  source_concept: { description: "BST" },
                  target_concept: { description: "cây con trái nhỏ hơn nút gốc" },
                  error_message: null
                },
                {
                  relation_type: "hasRight",
                  status: "MATCHED",
                  source_concept: { description: "BST" },
                  target_concept: { description: "cây con phải lớn hơn nút gốc" },
                  error_message: null
                }
              ]
            },
            rules_evaluated: {
              total_score: 0.8,
              rule_evaluation_results: [
                {
                  rule_name: "BSTProperty (Tính chất BST)",
                  score: 0.6,
                  weight: 0.6,
                  matchScore: 1.0,
                  synonymScore: 1.0,
                  orderScore: 1.0,
                  structureScore: 1.0,
                  strength: "Định nghĩa đúng tính chất khóa con trái nhỏ hơn nút gốc và khóa con phải lớn hơn nút gốc.",
                  weakness: "Không có lỗi nghiêm trọng ở tính chất cây.",
                  advice: "Tốt.",
                  error_message: null,
                  synonym_evaluation: [
                    { concept: "BSTProperty_Left", status: "MATCHED", lexeme_found: "nút bên trái có giá trị nhỏ hơn nút cha" },
                    { concept: "BSTProperty_Right", status: "MATCHED", lexeme_found: "nút bên phải có giá trị lớn hơn" }
                  ]
                },
                {
                  rule_name: "SearchComplexity (Độ phức tạp tìm kiếm)",
                  score: 0.2,
                  weight: 0.4,
                  matchScore: 0,
                  synonymScore: 0,
                  orderScore: 1.0,
                  structureScore: 1.0,
                  strength: "Đã nêu ý tưởng tìm kiếm nhanh.",
                  weakness: "Thiếu độ phức tạp thời gian cụ thể.",
                  advice: "Cần nêu rõ độ phức tạp.",
                  error_message: "Thiếu độ phức tạp tìm kiếm.",
                  synonym_evaluation: [
                    { concept: "SSearchComplexity", status: "MISSED", lexeme_found: "tìm kiếm nhanh" }
                  ]
                }
              ]
            },
            functions_evaluated: [
              {
                description: "complexity (Độ phức tạp O(log n))",
                status: "MISSED",
                lexeme_found: "",
                error_message: "Thiếu công thức độ phức tạp tìm kiếm."
              }
            ]
          }
        },
        {
          questionId: "QUES_bubble_proc",
          questionType: "PROCEDURE",
          bloomLevel: "Áp dụng",
          questionContent: "Mô tả chi tiết thuật toán Bubble Sort cho một mảng số nguyên.",
          submittedText: `Thuật toán Bubble Sort gồm các bước như sau. Bước 1: Khởi tạo và lặp ngoài - Thực hiện lặp ngoài từ 0 đến n-2 để sắp xếp dần. Bước 2: Lặp trong và so sánh - Trong mỗi lần lặp ngoài, lặp từ 0 đến n-i-1 để so sánh các cặp liền kề. Bước 3: Hoán đổi - Nếu phần tử sau lớn hơn phần tử trước thì hoán đổi vị trí. Bước 4: Kết quả - Sau tất cả các lần lặp, mảng sẽ được sắp xếp tăng dần.`,
          submittedAnswerHtml: `Thuật toán Bubble Sort gồm các bước như sau.
<span class="text-emerald-400 bg-emerald-950/40 px-1 rounded block" title="Khớp quy tắc: outerLoop (vòng lặp ngoài)">Bước 1: Khởi tạo và lặp ngoài - Thực hiện lặp ngoài từ 0 đến n-2 để sắp xếp dần.</span>
<span class="text-emerald-400 bg-emerald-950/40 px-1 rounded block" title="Khớp quy tắc: innerLoop (vòng lặp trong)">Bước 2: Lặp trong và so sánh - Trong mỗi lần lặp ngoài, lặp từ 0 đến n-i-1 để so sánh các cặp liền kề.</span>
<span class="text-emerald-400 bg-emerald-950/40 px-1 rounded block" title="Khớp quy tắc: pairWiseSwap (hoán đổi)">Bước 3: Hoán đổi - Nếu phần tử sau lớn hơn phần tử trước thì hoán đổi vị trí.</span>
<span class="text-rose-400 bg-rose-950/40 px-1 rounded block border-b border-dashed border-rose-500 font-bold" title="Lỗi sai: Thiếu công thức tính số bước so sánh tổng quát n(n-1)/2">Bước 4: Kết quả - Sau tất cả các lần lặp, mảng sẽ được sắp xếp tăng dần.</span>`,
          expectedAnswerHtml: `<span class="text-emerald-400 bg-emerald-950/40 px-1 rounded block">Bước 1: Khởi tạo vòng lặp ngoài chạy từ i = 0 đến n - 1 (vòng lặp ngoài outerLoop).</span>
<span class="text-emerald-400 bg-emerald-950/40 px-1 rounded block">Bước 2: Vòng lặp trong innerLoop so sánh từng cặp liền kề và lặp từ 0 đến n - i - 1.</span>
<span class="text-emerald-400 bg-emerald-950/40 px-1 rounded block">Bước 3: Hoán đổi pairWiseSwap nếu phát hiện phần tử sau lớn hơn (hoặc nhỏ hơn) phần tử trước.</span>
<span class="text-emerald-400 bg-emerald-950/40 px-1 rounded block">Bước 4: Đánh giá số bước so sánh tổng cộng: n(n-1)/2.</span>`,
          scoreEarned: 8.7,
          maxScoreInExam: 2.0,
          weightedScore: 1.65,
          accScore: 1.0,
          accW: 0.4,
          compScore: 1.0,
          compW: 0.4,
          logScore: 1.0,
          logW: 0.2,
          feedbackText: "Bạn đã mô tả rất tốt quy trình Bubble Sort với thứ tự logic rõ ràng, tuy nhiên còn thiếu công thức tính số bước so sánh tổng quát. Tổng điểm: 1.64/2. Gợi ý: bổ sung công thức n(n-1)/2.",
          matchedEvidence: {
            concepts_evaluated: {
              match_percent: 1.0,
              concept_evaluation_results: [
                { concept: "BubbleSort (sắp xếp nổi bọt)", status: "MATCHED", lexeme_found: "Bubble Sort", error_message: null },
                { concept: "Array (mảng)", status: "MATCHED", lexeme_found: "mảng", error_message: null }
              ]
            },
            relationships_evaluated: {
              pass_percent: 1.0,
              relation_evaluation_results: [
                {
                  relation_type: "hasElement",
                  status: "MATCHED",
                  source_concept: { description: "Array" },
                  target_concept: { description: "phần tử" },
                  error_message: null
                },
                {
                  relation_type: "pairWiseSwap",
                  status: "MATCHED",
                  source_concept: { description: "so sánh" },
                  target_concept: { description: "hoán đổi vị trí" },
                  error_message: null
                }
              ]
            },
            rules_evaluated: {
              total_score: 0.872,
              rule_evaluation_results: [
                {
                  rule_name: "outerLoop (Vòng lặp ngoài)",
                  score: 0.288,
                  weight: 0.3,
                  matchScore: 0.96,
                  synonymScore: 0.90,
                  orderScore: 1.0,
                  structureScore: 1.0,
                  strength: "Xác định chính xác số lần chạy của vòng lặp ngoài từ i = 0 đến n-2.",
                  weakness: "Không có lỗi.",
                  advice: "Không.",
                  error_message: null,
                  synonym_evaluation: [
                    { concept: "outerLoop", status: "MATCHED", lexeme_found: "lặp từ 0 đến n-2" }
                  ]
                },
                {
                  rule_name: "innerLoop (Vòng lặp trong)",
                  score: 0.1936,
                  weight: 0.2,
                  matchScore: 0.968,
                  synonymScore: 0.92,
                  orderScore: 1.0,
                  structureScore: 1.0,
                  strength: "Chỉ số vòng lặp trong j chạy từ 0 đến n-i-1 đúng đắn.",
                  weakness: "Không có.",
                  advice: "Không.",
                  error_message: null,
                  synonym_evaluation: [
                    { concept: "innerLoop", status: "MATCHED", lexeme_found: "lặp từ 0 đến n-i-1" }
                  ]
                },
                {
                  rule_name: "pairWiseSwap (Hoán đổi cặp)",
                  score: 0.282,
                  weight: 0.3,
                  matchScore: 0.94,
                  synonymScore: 0.85,
                  orderScore: 1.0,
                  structureScore: 1.0,
                  strength: "Cơ chế so sánh và đổi chỗ kề nhau chính xác.",
                  weakness: "Không có.",
                  advice: "Không.",
                  error_message: null,
                  synonym_evaluation: [
                    { concept: "pairWiseSwap", status: "MATCHED", lexeme_found: "hoán đổi vị trí" }
                  ]
                },
                {
                  rule_name: "logicalStepSequence (Thứ tự logic)",
                  score: 0.1988,
                  weight: 0.2,
                  matchScore: 0.994,
                  synonymScore: 1.0,
                  orderScore: 0.98,
                  structureScore: 1.0,
                  strength: "Tuần tự các bước từ Khởi tạo -> So sánh -> Hoán đổi được tuân thủ đúng đắn.",
                  weakness: "Không.",
                  advice: "Không.",
                  error_message: null,
                  synonym_evaluation: []
                }
              ]
            },
            functions_evaluated: [
              {
                description: "stepCount (Số bước so sánh n(n-1)/2)",
                status: "MISSED",
                lexeme_found: "",
                error_message: "Thiếu công thức tính số bước so sánh tổng quát n(n-1)/2."
              }
            ]
          }
        },
        {
          questionId: "QUES_binary_app",
          questionType: "APPLICATION",
          bloomLevel: "Áp dụng",
          questionContent: "Viết mã giả cho thuật toán tìm kiếm nhị phân (Binary Search) trên một mảng số nguyên đã được sắp xếp tăng dần.",
          submittedText: `function binarySearch(arr, key):
    low = 0
    high = length(arr) - 1
    while low < high:
        mid = (low + high) / 2
        if arr[mid] == key:
            return mid
        else if arr[mid] < key:
            low = mid + 1
    return -1`,
          submittedAnswerHtml: `function binarySearch(arr, key):
    low = 0
    high = length(arr) - 1
    <span class="text-rose-400 bg-rose-950/40 px-1 rounded block border-b border-dashed border-rose-500 font-bold" title="Lỗi sai: Sai điều kiện lặp (kỳ vọng <= thay vì <)">while low < high:</span>
        mid = (low + high) / 2
        if arr[mid] == key:
            return mid
        else if arr[mid] < key:
            low = mid + 1
    <span class="text-rose-400 bg-rose-950/40 px-1 rounded block border-b border-dashed border-rose-500 font-bold" title="Thiếu sót: Thiếu nhánh cập nhật high = mid - 1 khi arr[mid] > key">return -1</span>`,
          expectedAnswerHtml: `function binarySearch(arr, key):
    low = 0
    high = arr.length - 1
    <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded block">while low &lt;= high:</span>
        mid = (low + high) / 2
        if arr[mid] == key:
            return mid
        else if arr[mid] &lt; key:
            low = mid + 1
        <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded block">else:</span>
            <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded block">high = mid - 1</span>
    return -1`,
          scoreEarned: 8.5,
          maxScoreInExam: 3.0,
          weightedScore: 2.4,
          accScore: 0.85,
          accW: 0.4,
          compScore: 0.80,
          compW: 0.4,
          logScore: 0.90,
          logW: 0.2,
          feedbackText: "Mã giả của bạn cơ bản đúng nhưng còn một số lỗi nhỏ. Điểm mạnh: cấu trúc tổng thể tốt. Điểm cần cải thiện: sửa điều kiện vòng lặp thành low <= high và bổ sung nhánh else cập nhật high = mid - 1 hoàn chỉnh. Tổng điểm: 2.4/3.",
          matchedEvidence: {
            concepts_evaluated: {
              match_percent: 1.0,
              concept_evaluation_results: [
                { concept: "BinarySearch (tìm kiếm nhị phân)", status: "MATCHED", lexeme_found: "binarySearch", error_message: null },
                { concept: "Array (mảng)", status: "MATCHED", lexeme_found: "arr", error_message: null }
              ]
            },
            relationships_evaluated: {
              pass_percent: 1.0,
              relation_evaluation_results: [
                {
                  relation_type: "hasElement",
                  status: "MATCHED",
                  source_concept: { description: "Array" },
                  target_concept: { description: "arr[" },
                  error_message: null
                },
                {
                  relation_type: "hasMid",
                  status: "MATCHED",
                  source_concept: { description: "Vòng lặp" },
                  target_concept: { description: "mid =" },
                  error_message: null
                }
              ]
            },
            rules_evaluated: {
              total_score: 0.807,
              rule_evaluation_results: [
                {
                  rule_name: "pointerInitialization (Khởi tạo con trỏ)",
                  score: 0.2375,
                  weight: 0.25,
                  matchScore: 0.95,
                  synonymScore: 0.95,
                  orderScore: 1.0,
                  structureScore: 1.0,
                  strength: "Cài đặt chính xác các vị trí biên low = 0 và high = length(arr) - 1.",
                  weakness: "Không có lỗi.",
                  advice: "Không.",
                  error_message: null,
                  synonym_evaluation: [
                    { concept: "CPT_LowHighInit", status: "MATCHED", lexeme_found: "low = 0" }
                  ]
                },
                {
                  rule_name: "loopCondition (Điều kiện lặp)",
                  score: 0.1625,
                  weight: 0.25,
                  matchScore: 0.65,
                  synonymScore: 0.65,
                  orderScore: 1.0,
                  structureScore: 1.0,
                  strength: "Đã khai báo vòng lặp while.",
                  weakness: "Sử dụng điều kiện dừng while low < high thay vì while low <= high.",
                  advice: "Sửa thành low <= high để không bỏ sót phần tử cuối cùng khi không gian tìm kiếm còn 1 phần tử.",
                  error_message: "Sai điều kiện lặp.",
                  synonym_evaluation: [
                    { concept: "CPT_WhileLoop", status: "MISSED", lexeme_found: "while low < high" }
                  ]
                },
                {
                  rule_name: "midCalculationAndCompare (Chia đôi & So sánh)",
                  score: 0.428,
                  weight: 0.5,
                  matchScore: 0.856,
                  synonymScore: 0.85,
                  orderScore: 1.0,
                  structureScore: 0.72,
                  strength: "Tính toán chỉ số mid và so sánh đúng phân nhánh đầu tiên.",
                  weakness: "Thiếu nhánh else cập nhật high = mid - 1.",
                  advice: "Cần bổ sung nhánh else để hoàn thiện giải thuật.",
                  error_message: "Thiếu nhánh rẽ nhánh else.",
                  synonym_evaluation: [
                    { concept: "CPT_MidCalc", status: "MATCHED", lexeme_found: "mid = (low + high) / 2" }
                  ]
                }
              ]
            },
            functions_evaluated: [
              {
                description: "complexity (Độ phức tạp O(log n))",
                status: "MATCHED",
                lexeme_found: "O(log n)",
                error_message: null
              }
            ]
          }
        },
        {
          questionId: "QUES_queue_desc",
          questionType: "DESCRIPTIVE",
          bloomLevel: "Hiểu",
          questionContent: "Giải thích khái niệm hàng đợi (Queue) và các nguyên lý hoạt động FIFO của nó.",
          submittedText: "Hàng đợi (Queue) là một cấu trúc dữ liệu tuyến tính hoạt động theo nguyên lý First-In-First-Out (Vào trước ra trước). Các phần tử được thêm vào ở đầu (front) và lấy ra ở cuối (rear). Thao tác cơ bản là enqueue và dequeue.",
          submittedAnswerHtml: `Hàng đợi (Queue) là một cấu trúc dữ liệu tuyến tính hoạt động theo nguyên lý <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded inline-block" title="Khớp quy tắc: QueueFIFO">First-In-First-Out (Vào trước ra trước)</span>. Các phần tử được thêm vào ở <span class="text-rose-400 bg-rose-950/40 px-1 rounded inline-block border-b border-dashed border-rose-500 font-bold" title="Lỗi sai: Sai vị trí enqueue (phải ở rear)">đầu (front)</span> và lấy ra ở <span class="text-rose-400 bg-rose-950/40 px-1 rounded inline-block border-b border-dashed border-rose-500 font-bold" title="Lỗi sai: Sai vị trí dequeue (phải ở front)">cuối (rear)</span>. Thao tác cơ bản là <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded inline-block" title="Khớp quy tắc: QueueOperations">enqueue và dequeue</span>.`,
          expectedAnswerHtml: `<span class="text-emerald-400 bg-emerald-950/40 px-1 rounded inline-block">Hàng đợi (Queue)</span> tuân theo cơ chế <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded inline-block">FIFO (First-In-First-Out)</span>. Trỏ bởi đầu <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded inline-block">front</span> và cuối <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded inline-block">rear</span>. Thao tác thêm là <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded inline-block">enqueue</span>, thao tác xóa là <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded inline-block">dequeue</span>. Độ phức tạp là <span class="text-emerald-400 bg-emerald-950/40 px-1 rounded inline-block">O(1)</span>.`,
          scoreEarned: 8.5,
          maxScoreInExam: 3.0,
          weightedScore: 2.25,
          accScore: 0.80,
          accW: 0.4,
          compScore: 0.80,
          compW: 0.4,
          logScore: 0.935,
          logW: 0.2,
          feedbackText: "Định nghĩa hàng đợi và nguyên lý FIFO đúng. Tuy nhiên, sai vị trí thêm/xoá phần tử: enqueue ở cuối (rear) và dequeue ở đầu (front) chứ không phải ngược lại. Tổng điểm: 2.25/3.",
          matchedEvidence: {
            concepts_evaluated: {
              match_percent: 1.0,
              concept_evaluation_results: [
                { concept: "Queue (hàng đợi)", status: "MATCHED", lexeme_found: "Hàng đợi (Queue)", error_message: null },
                { concept: "front (đầu hàng)", status: "MATCHED", lexeme_found: "front", error_message: null },
                { concept: "rear (cuối hàng)", status: "MATCHED", lexeme_found: "rear", error_message: null }
              ]
            },
            relationships_evaluated: {
              pass_percent: 0.0,
              relation_evaluation_results: [
                {
                  relation_type: "rearEnqueue",
                  status: "MISSED",
                  source_concept: { description: "rear" },
                  target_concept: { description: "enqueue" },
                  error_message: "Sai cơ chế: enqueue phải được thực hiện ở rear chứ không phải ở front."
                },
                {
                  relation_type: "frontDequeue",
                  status: "MISSED",
                  source_concept: { description: "front" },
                  target_concept: { description: "dequeue" },
                  error_message: "Sai cơ chế: dequeue phải được thực hiện ở front chứ không phải ở rear."
                }
              ]
            },
            rules_evaluated: {
              total_score: 0.9,
              rule_evaluation_results: [
                {
                  rule_name: "QueueFIFO (Nguyên lý FIFO)",
                  score: 0.5,
                  weight: 0.5,
                  matchScore: 1.0,
                  synonymScore: 1.0,
                  orderScore: 1.0,
                  structureScore: 1.0,
                  strength: "Giải thích rõ ràng cơ chế vào trước ra trước FIFO.",
                  weakness: "Không.",
                  advice: "Không.",
                  error_message: null,
                  synonym_evaluation: []
                },
                {
                  rule_name: "QueueOperations (Thao tác cơ bản)",
                  score: 0.4,
                  weight: 0.5,
                  matchScore: 0.8,
                  synonymScore: 0.5,
                  orderScore: 1.0,
                  structureScore: 1.0,
                  strength: "Mô tả đầy đủ hai thao tác cốt lõi enqueue và dequeue.",
                  weakness: "Sai vị trí thực hiện: thêm ở đầu và lấy ra ở cuối.",
                  advice: "Nhớ rằng hàng đợi thêm phần tử ở cuối (rear) và lấy ra từ đầu (front).",
                  error_message: "Sai cơ chế enqueue/dequeue.",
                  synonym_evaluation: []
                }
              ]
            },
            functions_evaluated: [
              {
                description: "complexity (Độ phức tạp O(1))",
                status: "MATCHED",
                lexeme_found: "O(1)",
                error_message: null
              }
            ]
          }
        }
      ]
    });
  }

  protected selectQuestion(index: number): void {
    this.activeQuestionIndex.set(index);
    this.activeExplanation.set(false);
  }

  protected readonly improvementAdvice = computed(() => {
    const qRes = this.activeQuestionResult();
    if (!qRes || !qRes.matchedEvidence) return [];

    const advice: string[] = [];
    const evidence = qRes.matchedEvidence;

    if (evidence.concepts_evaluated) {
      evidence.concepts_evaluated.concept_evaluation_results.forEach((res: any) => {
        if (res.status === 'MISSED') {
          advice.push(`Cần ôn tập khái niệm cốt lõi: "${res.concept}".`);
        }
      });
    }

    if (evidence.relationships_evaluated) {
      evidence.relationships_evaluated.relation_evaluation_results.forEach((res: any) => {
        if (res.status === 'MISSED') {
          advice.push(`Làm rõ mối liên hệ ngữ nghĩa trong quan hệ: "${res.relation_type}".`);
        }
      });
    }

    if (evidence.rules_evaluated) {
      evidence.rules_evaluated.rule_evaluation_results.forEach((res: any) => {
        if (res.score < res.weight) {
          advice.push(`Trình bày đầy đủ logic thuật toán cho quy tắc: "${res.rule_name}".`);
        }
      });
    }

    if (advice.length === 0 && qRes.scoreEarned >= 9.5) {
      advice.push('Bài làm xuất sắc! Không có khuyến nghị bổ sung nào. Hãy duy trì cấu trúc lập luận này ở các câu tiếp theo.');
    } else if (advice.length === 0) {
      advice.push('Hãy bổ sung các ví dụ thực tế hoặc giải thích sâu sắc hơn về tính chất và độ phức tạp.');
    }

    return advice;
  });
}
