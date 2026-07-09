import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface MockQuestion {
  id: string;
  type: 'DESCRIPTIVE' | 'PROCEDURE';
  bloomLevel: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  maxScore: number;
  suggestedTime: number;
  content: string;
}

@Component({
  selector: 'app-test-solve',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-solve.html'
})
export class TestSolveComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly examId = signal<string>('');
  protected readonly examTitle = signal<string>('Đề kiểm tra thường kỳ lần 1');
  protected readonly difficulty = signal<string>('Dễ');
  protected readonly examSessionCode = signal<string>('SESSION_MOCK_8429');
  
  protected readonly activeQuestionIndex = signal<number>(0);
  protected readonly formattedTime = signal<string>('30:00');
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly submittingProgress = signal<number>(0);
  
  protected readonly questions = signal<MockQuestion[]>([]);
  protected readonly answers = signal<{ [key: string]: string }>({});

  protected readonly activeQuestion = computed(() => this.questions()[this.activeQuestionIndex()]);
  protected readonly submittedText = computed(() => this.answers()[this.activeQuestion()?.id] || '');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('examId') || 'EXAM_8429adc952594a7b8f';
    this.examId.set(id);
    
    // Clear old answers
    localStorage.removeItem('mock_submitted_answers');
    
    let timeLimitMinutes = 30;

    if (id === 'EXAM_754d0f85412f46fdb7') {
      this.examTitle.set('Đề kiểm tra giữa kỳ');
      this.difficulty.set('Trung bình');
      this.examSessionCode.set('SESSION_754d');
      timeLimitMinutes = 60;
      
      this.questions.set([
        {
          id: 'EXAM_754d_Q01',
          type: 'DESCRIPTIVE',
          bloomLevel: 'M',
          difficulty: 'MEDIUM',
          maxScore: 2.0,
          suggestedTime: 10,
          content: 'Nêu các thao tác cơ bản của ngăn xếp và ý nghĩa của từng thao tác.'
        },
        {
          id: 'EXAM_754d_Q02',
          type: 'PROCEDURE',
          bloomLevel: 'T',
          difficulty: 'MEDIUM',
          maxScore: 2.0,
          suggestedTime: 10,
          content: 'Mô tả quy trình thêm ba phần tử 4, 7, 9 vào ngăn xếp rỗng và sau đó thực hiện một lần Pop.'
        },
        {
          id: 'EXAM_754d_Q03',
          type: 'DESCRIPTIVE',
          bloomLevel: 'M',
          difficulty: 'MEDIUM',
          maxScore: 3.0,
          suggestedTime: 10,
          content: 'Giải thích cấu trúc và nguyên lý hoạt động của danh sách liên kết đơn (Singly Linked List).'
        },
        {
          id: 'EXAM_754d_Q04',
          type: 'PROCEDURE',
          bloomLevel: 'T',
          difficulty: 'MEDIUM',
          maxScore: 3.0,
          suggestedTime: 10,
          content: 'Mô tả các bước chèn một nút mới có giá trị X vào đầu danh sách liên kết đơn.'
        }
      ]);
      
      this.answers.set({
        'EXAM_754d_Q01': '',
        'EXAM_754d_Q02': '',
        'EXAM_754d_Q03': '',
        'EXAM_754d_Q04': ''
      });
    } else if (id === 'EXAM_ca71c6ec622143a8be') {
      this.examTitle.set('Đề thi cuối kỳ');
      this.difficulty.set('Khó');
      this.examSessionCode.set('SESSION_ca71');
      timeLimitMinutes = 90;

      this.questions.set([
        {
          id: 'EXAM_ca71_Q01',
          type: 'DESCRIPTIVE',
          bloomLevel: 'M',
          difficulty: 'EASY',
          maxScore: 1.5,
          suggestedTime: 10,
          content: 'Nêu sự khác biệt cơ bản giữa danh sách liên kết đơn và danh sách liên kết đôi về cấu trúc và khả năng duyệt danh sách.'
        },
        {
          id: 'EXAM_ca71_Q02',
          type: 'DESCRIPTIVE',
          bloomLevel: 'M',
          difficulty: 'MEDIUM',
          maxScore: 1.5,
          suggestedTime: 10,
          content: 'Nêu vai trò của ngăn xếp trong bài toán kiểm tra cặp dấu ngoặc hợp lệ.'
        },
        {
          id: 'EXAM_ca71_Q03',
          type: 'PROCEDURE',
          bloomLevel: 'T',
          difficulty: 'MEDIUM',
          maxScore: 1.5,
          suggestedTime: 15,
          content: 'Mô tả các bước kiểm tra một chuỗi dấu ngoặc có hợp lệ hay không bằng ngăn xếp.'
        },
        {
          id: 'EXAM_ca71_Q04',
          type: 'DESCRIPTIVE',
          bloomLevel: 'M',
          difficulty: 'EASY',
          maxScore: 1.5,
          suggestedTime: 10,
          content: 'Giải thích nút lá (Leaf Node) trong cây nhị phân là gì và nêu đặc điểm chính của nó.'
        },
        {
          id: 'EXAM_ca71_Q05',
          type: 'PROCEDURE',
          bloomLevel: 'T',
          difficulty: 'MEDIUM',
          maxScore: 2.0,
          suggestedTime: 15,
          content: 'Viết mã giả thực hiện thao tác Dequeue để lấy một phần tử ra khỏi hàng đợi dùng mảng.'
        },
        {
          id: 'EXAM_ca71_Q06',
          type: 'PROCEDURE',
          bloomLevel: 'T',
          difficulty: 'HARD',
          maxScore: 2.0,
          suggestedTime: 20,
          content: 'Viết mã giả thêm một phần tử x vào hàng đợi vòng kích thước MAX.'
        }
      ]);

      this.answers.set({
        'EXAM_ca71_Q01': '',
        'EXAM_ca71_Q02': '',
        'EXAM_ca71_Q03': '',
        'EXAM_ca71_Q04': '',
        'EXAM_ca71_Q05': '',
        'EXAM_ca71_Q06': ''
      });
    } else {
      this.examTitle.set('Đề kiểm tra thường kỳ lần 1');
      this.difficulty.set('Dễ');
      this.examSessionCode.set('SESSION_8429');
      timeLimitMinutes = 30;

      this.questions.set([
        {
          id: 'Q_01',
          type: 'DESCRIPTIVE',
          bloomLevel: 'M',
          difficulty: 'EASY',
          maxScore: 5,
          suggestedTime: 15,
          content: 'Giải thích khái niệm cấu trúc dữ liệu. Nêu rõ các đặc điểm cơ bản của cấu trúc dữ liệu.'
        },
        {
          id: 'Q_02',
          type: 'PROCEDURE',
          bloomLevel: 'T',
          difficulty: 'MEDIUM',
          maxScore: 5,
          suggestedTime: 15,
          content: 'Mô tả các bước để tìm giá trị lớn nhất trong một mảng số nguyên.'
        }
      ]);
      
      this.answers.set({
        'Q_01': '',
        'Q_02': ''
      });
    }

    // Start countdown timer
    let totalSeconds = timeLimitMinutes * 60;
    const interval = setInterval(() => {
      if (totalSeconds <= 0) {
        clearInterval(interval);
        this.onSubmit();
        return;
      }
      totalSeconds--;
      const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
      const secs = (totalSeconds % 60).toString().padStart(2, '0');
      this.formattedTime.set(`${mins}:${secs}`);
    }, 1000);
  }

  protected selectQuestion(idx: number): void {
    if (idx >= 0 && idx < this.questions().length) {
      this.activeQuestionIndex.set(idx);
    }
  }

  protected onTextChange(val: string): void {
    const qId = this.activeQuestion().id;
    this.answers.update(ans => ({
      ...ans,
      [qId]: val
    }));
  }

  protected fillSampleAnswer(): void {
    const qId = this.activeQuestion().id;
    let sample = '';
    
    if (qId === 'Q_01') {
      sample = 'Cấu trúc dữ liệu là cách tổ chức và lưu trữ dữ liệu trên máy tính dùng để giúp việc thêm, xóa hoặc sửa dữ liệu. Cấu trúc dữ liệu gồm đặc trưng cơ bản là nó giúp tổ chức dữ liệu một cách có hệ thống để máy tính hiểu được.';
    } else if (qId === 'Q_02') {
      sample = 'Các bước để tìm giá trị lớn nhất trong một mảng số nguyên thực hiện như sau:\nBước 1: Khởi tạo max với giá trị của phần tử đầu tiên.\nBước 2: Duyệt qua từng phần tử còn lại trong mảng từ vị trí thứ 2 đến cuối mảng.\nBước 3: So sánh từng phần tử với giá trị hiện tại của biến max. Nếu lớn hơn max, thì cập nhật giá trị của max thành phần tử đó. \nKhi duyệt hết mảng, biến max sẽ chứa giá trị lớn nhất.';
    } else if (qId === 'EXAM_754d_Q01') {
      sample = 'Các thao tác cơ bản của ngăn xếp gồm: Push dùng để đưa một phần tử vào đỉnh ngăn xếp; Pop dùng để lấy phần tử ở đỉnh ra khỏi ngăn xếp; Peek hoặc Top dùng để xem phần tử ở đỉnh nhưng không xóa nó; isEmpty và isFull dùng để kiểm tra ngăn xếp rỗng hoặc đầy.';
    } else if (qId === 'EXAM_754d_Q02') {
      sample = 'Bước 1: Ban đầu ngăn xếp rỗng.\nBước 2: Thực hiện Push 4, khi đó 4 nằm ở đỉnh.\nBước 3: Thực hiện Push 7, khi đó 7 nằm ở đỉnh.\nBước 4: Thực hiện Push 9, khi đó 9 nằm ở đỉnh.\nBước 5: Thực hiện Pop, phần tử được lấy ra là 9 vì 9 được thêm sau cùng.';
    } else if (qId === 'EXAM_754d_Q03') {
      sample = 'Danh sách liên kết đơn là một cấu trúc dữ liệu gồm các nút nằm nối tiếp nhau. Mỗi nút gồm hai thành phần chính: phần dữ liệu lưu trữ giá trị và phần liên kết chứa con trỏ trỏ tới nút kế tiếp trong danh sách.';
    } else if (qId === 'EXAM_754d_Q04') {
      sample = 'Bước 1: Tạo một nút mới chứa giá trị X.\nBước 2: Gán con trỏ liên kết (next) của nút mới trỏ tới nút đầu tiên hiện tại của danh sách (nút Head).\nBước 3: Cập nhật lại con trỏ Head của danh sách trỏ tới nút mới vừa tạo.';
    }

    this.onTextChange(sample);
  }

  protected isQuestionAnswered(qId: string): boolean {
    return !!this.answers()[qId]?.trim();
  }

  protected getQuestionTypeDisplayName(type: string): string {
    return type === 'DESCRIPTIVE' ? 'Mô tả' : 'Thủ tục';
  }

  protected getBloomDisplayName(bloom: string): string {
    return bloom === 'M' ? 'Hiểu (M)' : 'Áp dụng (T)';
  }

  protected getDifficultyDisplayName(diff: string): string {
    return diff === 'EASY' ? 'Dễ' : diff === 'MEDIUM' ? 'Trung bình' : 'Khó';
  }

  protected getBloomClass(bloom: string): string {
    return bloom === 'M' 
      ? 'bg-blue-50 text-blue-700 border-blue-200' 
      : 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }

  protected getDifficultyClass(diff: string): string {
    return diff === 'EASY' 
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
      : diff === 'MEDIUM'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200';
  }

  protected onForfeit(): void {
    if (confirm('Bạn có chắc chắn muốn bỏ cuộc? Kết quả bài làm sẽ không được lưu.')) {
      this.router.navigate(['/test/exams']);
    }
  }

  protected onSubmit(): void {
    if (confirm('Bạn có chắc chắn muốn nộp bài thi?')) {
      // Save answers in localStorage to share with evaluation report component
      localStorage.setItem('mock_submitted_answers', JSON.stringify(this.answers()));
      
      this.isSubmitting.set(true);
      this.submittingProgress.set(0);
      
      const interval = setInterval(() => {
        const current = this.submittingProgress();
        if (current >= 100) {
          clearInterval(interval);
        } else {
          this.submittingProgress.set(current + 2.5);
        }
      }, 100);

      const subId = this.examId() === 'EXAM_754d0f85412f46fdb7' 
        ? 'SUB_MOCK_754d' 
        : (this.examId() === 'EXAM_ca71c6ec622143a8be' ? 'SUB_MOCK_ca71' : 'SUB_MOCK_8429');
      setTimeout(() => {
        clearInterval(interval);
        this.router.navigate(['/test/evaluation', subId]);
      }, 4000);
    }
  }
}
