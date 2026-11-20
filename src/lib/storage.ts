import { getDashboardData, saveEvaluationFn, addClassroomFn, updateClassroomRubricFn, addStudentFn, saveStudentProfileFn } from './api';
import { SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL, SAMPLE_QUESTION_PAPER_DATA_URL, SAMPLE_BETA_QUESTIONS } from './sample-paper';

export type TeacherProfile = {
  name: string;
  institution: string;
  id?: string;
  email?: string;
  institutionId?: string;
  createdAt?: string;
  isBeta?: boolean;
  role?: 'teacher' | 'student';
  gradeOrExam?: string;
};

export type RubricaConfig = {
  aiCreditsApiKey: string;
  visionModel: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  theme?: 'light' | 'dark' | 'system';
};

export type QuestionPaperRecord = {
  id: string;
  title: string;
  subject: string;
  fileUrls: string[];
  pageCount: number;
  createdAt: string;
};

export type QuestionEvaluation = {
  questionNumber: string; // e.g., "Q1", "Q2"
  pages: number[];        // e.g., [1] or [1, 2] if multi-page
  maxMarks: number;
  marksAwarded: number;
  reason: string;
};

export type VisionEvaluation = {
  score: number;
  maxScore: number;
  percentage: number;
  confirmedStrengths: string[];
  watchOutAreas: string[];
  overallFeedback: string;
  detailedAnalysis: string;
  questions?: QuestionEvaluation[];
  rawJsonResult?: string;
};

export type ClassroomRecord = {
  id: string;
  name: string;
  grade: string;
  subject: string;
  rubric?: string;
  createdAt: string;
};

export type StudentRecord = {
  id: string;
  classroomId?: string;
  name: string;
  grade: string;
  createdAt: string;
};

export type EvaluationRecord = {
  id: string;
  studentId: string;
  title: string;
  subject: string;
  score: number;
  maxScore: number;
  fileName: string;
  createdAt: string;
  summary?: string;
  percentage?: number;
  confirmedStrengths?: string[];
  watchOutAreas?: string[];
  detailedAnalysis?: string;
  rawJsonResult?: any;
};

export type DPPRecord = {
  id: string;
  createdAt: string;
  content: string; // The generated markdown
  basedOnMistakes: string[];
};

export type StudentProfileRecord = {
  studentId: string;
  activeWeaknesses: string[];
  stableStrengths: string[];
  updatedAt: string;
  dpps?: DPPRecord[];
};

export type CommonMistakePattern = {
  skill: string;
  occurrenceCount: number;
  totalTests: number;
  firstSeenDate: string;
  lastSeenDate: string;
  testTitles: string[];
  status: 'recurring' | 'improving' | 'resolved' | 'single';
  trend: string;
};

export type CommonStrengthPattern = {
  skill: string;
  occurrenceCount: number;
  totalTests: number;
  status: 'stable' | 'emerging';
};

export type PersistedData = {
  classrooms: ClassroomRecord[];
  students: StudentRecord[];
  evaluations: EvaluationRecord[];
  profiles: StudentProfileRecord[];
  questionPapers?: QuestionPaperRecord[];
};

const keys = {
  teacher: 'rubrica_teacher_profile',
  config: 'rubrica_config',
  questionPapers: 'rubrica_saved_question_papers',
  deletedQpIds: 'rubrica_deleted_qp_ids',
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key "${key}":`, error);
    // Quota-exceeded fallback: evict older question papers if storage limit reached
    if (key === keys.questionPapers && Array.isArray(value) && value.length > 2) {
      try {
        const trimmed = value.slice(0, Math.max(1, Math.floor(value.length / 2)));
        window.localStorage.setItem(key, JSON.stringify(trimmed));
      } catch {
        // Ignore if still fails
      }
    }
  }
}

export function loadQuestionPapers(): QuestionPaperRecord[] {
  return read<QuestionPaperRecord[]>(keys.questionPapers, []);
}

export function getDeletedQuestionPaperIds(): string[] {
  return read<string[]>(keys.deletedQpIds, []);
}

export function saveQuestionPaper(paper: QuestionPaperRecord): void {
  const existing = loadQuestionPapers();
  // Keep up to 15 most recent papers to prevent localStorage bloating
  const next = [paper, ...existing.filter(p => p.id !== paper.id)].slice(0, 15);
  write(keys.questionPapers, next);
  // Remove from deleted list if it was previously marked deleted
  const deleted = getDeletedQuestionPaperIds();
  if (deleted.includes(paper.id)) {
    write(keys.deletedQpIds, deleted.filter(id => id !== paper.id));
  }
}

export function deleteQuestionPaper(id: string): void {
  const existing = loadQuestionPapers();
  const next = existing.filter(p => p.id !== id);
  write(keys.questionPapers, next);
  const deleted = getDeletedQuestionPaperIds();
  if (!deleted.includes(id)) {
    write(keys.deletedQpIds, [...deleted, id]);
  }
}

export function restoreQuestionPaper(paper: QuestionPaperRecord): void {
  saveQuestionPaper(paper);
}

export function loadTeacherProfile(): TeacherProfile | null {
  const profile = read<TeacherProfile | null>(keys.teacher, null);
  if (profile?.isBeta) return profile;
  // Clear old invalid test sessions that didn't use UUIDs
  if (profile && profile.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id)) {
    localStorage.removeItem(keys.teacher);
    return null;
  }
  return profile;
}

export function saveTeacherProfile(profile: TeacherProfile): void {
  write(keys.teacher, profile);
}

export function loadConfig(): RubricaConfig {
  const currentTheme = (typeof window !== 'undefined' ? (localStorage.getItem('theme') as any) : 'system') || 'system';
  return read<RubricaConfig>(keys.config, {
    aiCreditsApiKey: '',
    visionModel: 'gpt-4o-mini',
    supabaseUrl: '',
    supabaseAnonKey: '',
    theme: currentTheme,
  });
}

export function saveConfig(config: RubricaConfig): void {
  write(keys.config, config);
  if (config.theme && typeof window !== 'undefined') {
    try {
      localStorage.setItem('theme', config.theme);
      const isDark = config.theme === 'dark' || (config.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    } catch {}
  }
}

export async function fetchDashboardData(userId: string): Promise<PersistedData> {
  try {
    const data = await getDashboardData({ data: { userId } });
    return data as PersistedData;
  } catch (e) {
    console.error("Failed to fetch dashboard data from SQLite:", e);
    return { classrooms: [], students: [], evaluations: [], profiles: [] };
  }
}

export async function persistData(next: PersistedData, config?: RubricaConfig, userId?: string) {
  // Not used for bulk anymore, each action is individual
}

export function loadLocalData(): PersistedData {
  // Return empty initially
  return { classrooms: [], students: [], evaluations: [], profiles: [] };
}

// Analytics Helper for multi-test logic
export function analyzeStudentHistory(evaluations: EvaluationRecord[]) {
  const commonMistakes: CommonMistakePattern[] = [];
  const commonStrengths: CommonStrengthPattern[] = [];
  
  if (!evaluations || evaluations.length === 0) {
    return { commonMistakes, commonStrengths };
  }

  const sorted = [...evaluations].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  const weaknessTracker = new Map<string, { count: number, first: string, last: string, tests: string[], indices: number[] }>();
  const strengthTracker = new Map<string, { count: number, tests: string[] }>();
  
  sorted.forEach((test, testIndex) => {
    test.watchOutAreas?.forEach(area => {
      const existing = weaknessTracker.get(area);
      if (existing) {
        weaknessTracker.set(area, {
          count: existing.count + 1,
          first: existing.first,
          last: test.createdAt,
          tests: [...existing.tests, test.title],
          indices: [...existing.indices, testIndex]
        });
      } else {
        weaknessTracker.set(area, {
          count: 1,
          first: test.createdAt,
          last: test.createdAt,
          tests: [test.title],
          indices: [testIndex]
        });
      }
    });

    test.confirmedStrengths?.forEach(area => {
      const existing = strengthTracker.get(area);
      if (existing) {
        strengthTracker.set(area, { count: existing.count + 1, tests: [...existing.tests, test.title] });
      } else {
        strengthTracker.set(area, { count: 1, tests: [test.title] });
      }
    });
  });
  
  const totalTests = sorted.length;
  
  weaknessTracker.forEach((data, skill) => {
    let status: CommonMistakePattern['status'] = 'single';
    let trend = '';
    
    if (data.count === 1) {
      status = data.indices[0] === totalTests - 1 ? 'recurring' : 'single'; // newly introduced
      trend = data.indices[0] === totalTests - 1 ? 'New issue' : 'Not seen recently';
    } else {
      const wasInLastTest = data.indices.includes(totalTests - 1);
      const wasInPreviousTest = data.indices.includes(totalTests - 2);
      
      if (wasInLastTest && wasInPreviousTest) {
        status = 'recurring';
        trend = 'Persistent issue across recent tests';
      } else if (!wasInLastTest && wasInPreviousTest) {
        status = 'improving';
        trend = 'Did not appear in latest test';
      } else if (!wasInLastTest && !wasInPreviousTest) {
        status = 'resolved';
        trend = 'Resolved (not seen in last 2 tests)';
      } else if (wasInLastTest && !wasInPreviousTest) {
        status = 'recurring';
        trend = 'Re-emerged in latest test';
      }
    }
    
    if (status !== 'single' || data.indices[0] === totalTests - 1) {
      commonMistakes.push({
        skill,
        occurrenceCount: data.count,
        totalTests,
        firstSeenDate: data.first,
        lastSeenDate: data.last,
        testTitles: data.tests,
        status,
        trend
      });
    }
  });

  strengthTracker.forEach((data, skill) => {
    commonStrengths.push({
      skill,
      occurrenceCount: data.count,
      totalTests,
      status: data.count >= 2 ? 'stable' : 'emerging'
    });
  });

  commonMistakes.sort((a, b) => {
    const statusWeight = { recurring: 3, improving: 2, resolved: 1, single: 0 };
    if (statusWeight[a.status] !== statusWeight[b.status]) return statusWeight[b.status] - statusWeight[a.status];
    return b.occurrenceCount - a.occurrenceCount;
  });

  commonStrengths.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

  return { commonMistakes, commonStrengths };
}

export function generateStudentProfile(evaluations: EvaluationRecord[]): StudentProfileRecord {
  const history = analyzeStudentHistory(evaluations);
  return {
    studentId: evaluations[0]?.studentId || '',
    activeWeaknesses: history.commonMistakes.filter(m => m.status === 'recurring').map(m => m.skill).slice(0, 3),
    stableStrengths: history.commonStrengths.map(s => s.skill).slice(0, 5),
    updatedAt: new Date().toISOString()
  };
}

const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

export function generateInitialBetaData(): PersistedData {
  const classrooms: ClassroomRecord[] = [
    {
      id: 'c1000000-0000-4000-8000-000000000001',
      name: 'Year 8 Science (Sec A)',
      grade: 'Year 8',
      subject: 'Science',
      rubric: 'Deduct 1 mark for missing units (e.g. kg, m/s). 2 marks for clear diagram labels.',
      createdAt: ago(25)
    },
    {
      id: 'c2000000-0000-4000-8000-000000000002',
      name: 'Year 9 Mathematics',
      grade: 'Year 9',
      subject: 'Mathematics',
      rubric: 'Show all step-by-step calculations for algebraic equations.',
      createdAt: ago(20)
    },
    {
      id: 'c3000000-0000-4000-8000-000000000003',
      name: 'Grade 10 Physics',
      grade: 'Grade 10',
      subject: 'Physics',
      rubric: 'Full credit only if formula is stated before numeric substitution.',
      createdAt: ago(15)
    },
    {
      id: 'c4000000-0000-4000-8000-000000000004',
      name: 'JEE Advanced Prep (Maths & Physics)',
      grade: 'JEE Advanced 2026',
      subject: 'Mathematics',
      rubric: 'Partial credit awarded for correct integration substitution and vector cross-product steps.',
      createdAt: ago(30)
    }
  ];

  const students: StudentRecord[] = [
    { id: 's1000000-0000-4000-8000-000000000001', classroomId: 'c1000000-0000-4000-8000-000000000001', name: 'Maya Robinson', grade: 'Year 8', createdAt: ago(24) },
    { id: 's2000000-0000-4000-8000-000000000002', classroomId: 'c1000000-0000-4000-8000-000000000001', name: 'Alex Chen', grade: 'Year 8', createdAt: ago(22) },
    { id: 's3000000-0000-4000-8000-000000000003', classroomId: 'c2000000-0000-4000-8000-000000000002', name: 'Sarah Connor', grade: 'Year 9', createdAt: ago(18) },
    { id: 's4000000-0000-4000-8000-000000000004', classroomId: 'c3000000-0000-4000-8000-000000000003', name: 'David Miller', grade: 'Grade 10', createdAt: ago(14) },
    { id: 'student-beta-session', classroomId: 'c4000000-0000-4000-8000-000000000004', name: 'Aryan Patel', grade: 'JEE Advanced 2026', createdAt: ago(28) }
  ];

  const evaluations: EvaluationRecord[] = [
    {
      id: 'e1000000-0000-4000-8000-000000000001',
      studentId: 's1000000-0000-4000-8000-000000000001',
      title: 'Science Mid-term',
      subject: 'Science',
      score: 68,
      maxScore: 100,
      percentage: 68,
      fileName: 'maya_midterm_answers.jpg',
      confirmedStrengths: ['Identifying chemical reaction types', 'Clear diagram labeling'],
      watchOutAreas: ['Balancing multi-step chemical equations', 'Unit conversion errors'],
      summary: 'Good conceptual understanding, but lost marks on calculation details and equation balancing.',
      detailedAnalysis: 'Demonstrated solid grasp of reaction classifications. Calculation steps lacked standard SI units, and the redox reaction balancing was incomplete.',
      createdAt: ago(14),
      rawJsonResult: {
        score: 68,
        maxScore: 100,
        percentage: 68,
        confirmedStrengths: ['Identifying chemical reaction types', 'Clear diagram labeling'],
        watchOutAreas: ['Balancing multi-step chemical equations', 'Unit conversion errors'],
        overallFeedback: 'Good conceptual understanding, but lost marks on calculation details and equation balancing.',
        detailedAnalysis: 'Demonstrated solid grasp of reaction classifications. Calculation steps lacked standard SI units, and the redox reaction balancing was incomplete.',
        questions: SAMPLE_BETA_QUESTIONS,
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e2000000-0000-4000-8000-000000000002',
      studentId: 's1000000-0000-4000-8000-000000000001',
      title: 'Chemical Reactions Quiz',
      subject: 'Science',
      score: 76,
      maxScore: 100,
      percentage: 76,
      fileName: 'maya_quiz1.jpg',
      confirmedStrengths: ['Identifying chemical reaction types', 'Writing molecular formulas'],
      watchOutAreas: ['Balancing multi-step chemical equations'],
      summary: 'Noticeable improvement in formula writing! Still needs practice balancing complex coefficients.',
      detailedAnalysis: 'Writing molecular formulas was accurate across all 5 prompts. Reaction balancing still showed coefficient errors on questions 3 and 4.',
      createdAt: ago(7),
      rawJsonResult: {
        score: 76,
        maxScore: 100,
        percentage: 76,
        confirmedStrengths: ['Identifying chemical reaction types', 'Writing molecular formulas'],
        watchOutAreas: ['Balancing multi-step chemical equations'],
        overallFeedback: 'Noticeable improvement in formula writing! Still needs practice balancing complex coefficients.',
        detailedAnalysis: 'Writing molecular formulas was accurate across all 5 prompts. Reaction balancing still showed coefficient errors on questions 3 and 4.',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 40,
            marksAwarded: 38,
            reason: 'Accurately classified combination and decomposition reactions.'
          },
          {
            questionNumber: 'Q2',
            pages: [1, 2],
            maxMarks: 60,
            marksAwarded: 38,
            reason: 'Oxidation state assignments correct on page 1. Equation balancing coefficient slip on page 2.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e3000000-0000-4000-8000-000000000003',
      studentId: 's1000000-0000-4000-8000-000000000001',
      title: 'Science Term Checkpoint',
      subject: 'Science',
      score: 88,
      maxScore: 100,
      percentage: 88,
      fileName: 'maya_checkpoint.jpg',
      confirmedStrengths: ['Identifying chemical reaction types', 'Writing molecular formulas', 'Unit conversion errors'],
      watchOutAreas: ['Significant figures precision'],
      summary: 'Superb growth! Balancing equations is now steady and unit conversions were completely accurate.',
      detailedAnalysis: 'A massive turnaround. All three combustion and synthesis reactions were balanced correctly. Only minor precision deduction on significant figures.',
      createdAt: ago(2),
      rawJsonResult: {
        score: 88,
        maxScore: 100,
        percentage: 88,
        confirmedStrengths: ['Identifying chemical reaction types', 'Writing molecular formulas', 'Unit conversion errors'],
        watchOutAreas: ['Significant figures precision'],
        overallFeedback: 'Superb growth! Balancing equations is now steady and unit conversions were completely accurate.',
        detailedAnalysis: 'A massive turnaround. All three combustion and synthesis reactions were balanced correctly. Only minor precision deduction on significant figures.',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 25,
            marksAwarded: 25,
            reason: 'Flawless reaction classification and apparatus diagram with clear annotations.'
          },
          {
            questionNumber: 'Q2',
            pages: [1, 2],
            maxMarks: 35,
            marksAwarded: 33,
            reason: 'Balanced multi-step thermite equation and correctly applied mole ratios. Minor deduction on decimal rounding.'
          },
          {
            questionNumber: 'Q3',
            pages: [2],
            maxMarks: 40,
            marksAwarded: 30,
            reason: 'Acid-base neutralization stoichiometry is clearly worked out. Deducted 10 marks for intermediate unit omission.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e4000000-0000-4000-8000-000000000004',
      studentId: 's2000000-0000-4000-8000-000000000002',
      title: 'Science Mid-term',
      subject: 'Science',
      score: 58,
      maxScore: 100,
      percentage: 58,
      fileName: 'alex_midterm.jpg',
      confirmedStrengths: ['Clear diagram sketches'],
      watchOutAreas: ['Explaining reasoning in detail', 'Unit conversion errors'],
      summary: 'Accurate diagrams, but lost significant marks for leaving explanation questions brief.',
      detailedAnalysis: 'Alex draws excellent diagrams but needs to focus on adding explanatory text to support his conclusions.',
      createdAt: ago(10),
      rawJsonResult: {
        score: 58,
        maxScore: 100,
        percentage: 58,
        confirmedStrengths: ['Clear diagram sketches'],
        watchOutAreas: ['Explaining reasoning in detail', 'Unit conversion errors'],
        overallFeedback: 'Accurate diagrams, but lost significant marks for leaving explanation questions brief.',
        detailedAnalysis: 'Alex draws excellent diagrams but needs to focus on adding explanatory text to support his conclusions.',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 25,
            marksAwarded: 18,
            reason: 'Neat diagram sketch. Did not provide written sentences explaining the single displacement reaction.'
          },
          {
            questionNumber: 'Q2',
            pages: [1, 2],
            maxMarks: 35,
            marksAwarded: 20,
            reason: 'Iron reduction reaction unbalanced at step 2. Theoretical yield calculation incomplete on page 2.'
          },
          {
            questionNumber: 'Q3',
            pages: [2],
            maxMarks: 40,
            marksAwarded: 20,
            reason: 'Calculated molar mass correctly but missed the 1:2 stoichiometric factor for sulfuric acid.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e5000000-0000-4000-8000-000000000005',
      studentId: 's2000000-0000-4000-8000-000000000002',
      title: 'Weekly Review',
      subject: 'Science',
      score: 65,
      maxScore: 100,
      percentage: 65,
      fileName: 'alex_quiz.jpg',
      confirmedStrengths: ['Clear diagram sketches', 'Observation tables'],
      watchOutAreas: ['Explaining reasoning in detail'],
      summary: 'Continued progress on observational accuracy. Explanation paragraphs still require more depth.',
      detailedAnalysis: 'Diagrams and observation tables received full marks. Short response questions need 2-3 supporting sentences rather than bullet points.',
      createdAt: ago(3),
      rawJsonResult: {
        score: 65,
        maxScore: 100,
        percentage: 65,
        confirmedStrengths: ['Clear diagram sketches', 'Observation tables'],
        watchOutAreas: ['Explaining reasoning in detail'],
        overallFeedback: 'Continued progress on observational accuracy. Explanation paragraphs still require more depth.',
        detailedAnalysis: 'Diagrams and observation tables received full marks. Short response questions need 2-3 supporting sentences rather than bullet points.',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 30,
            marksAwarded: 24,
            reason: 'Good experimental setup sketch and observation recorded.'
          },
          {
            questionNumber: 'Q2',
            pages: [1, 2],
            maxMarks: 35,
            marksAwarded: 21,
            reason: 'Observation table filled accurately. Short response lacked supporting detail.'
          },
          {
            questionNumber: 'Q3',
            pages: [2],
            maxMarks: 35,
            marksAwarded: 20,
            reason: 'Conclusion was brief. Requires step-by-step reasoning.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e6000000-0000-4000-8000-000000000006',
      studentId: 's3000000-0000-4000-8000-000000000003',
      title: 'Linear Algebra Test',
      subject: 'Mathematics',
      score: 92,
      maxScore: 100,
      percentage: 92,
      fileName: 'sarah_algebra.jpg',
      confirmedStrengths: ['Factoring polynomials', 'Graphing intercepts', 'Step-by-step working'],
      watchOutAreas: ['Sign errors in expansion'],
      summary: 'Outstanding comprehension of linear systems and quadratic factoring.',
      detailedAnalysis: 'Exemplary mathematical handwriting and neat step-by-step derivations. Only one minor sign slip when expanding brackets.',
      createdAt: ago(5),
      rawJsonResult: {
        score: 92,
        maxScore: 100,
        percentage: 92,
        confirmedStrengths: ['Factoring polynomials', 'Graphing intercepts', 'Step-by-step working'],
        watchOutAreas: ['Sign errors in expansion'],
        overallFeedback: 'Outstanding comprehension of linear systems and quadratic factoring.',
        detailedAnalysis: 'Exemplary mathematical handwriting and neat step-by-step derivations. Only one minor sign slip when expanding brackets.',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 30,
            marksAwarded: 30,
            reason: 'Perfect quadratic factorization and identification of roots.'
          },
          {
            questionNumber: 'Q2',
            pages: [1, 2],
            maxMarks: 35,
            marksAwarded: 34,
            reason: 'Step-by-step linear systems solved via substitution. Minor sign slip on check step.'
          },
          {
            questionNumber: 'Q3',
            pages: [2],
            maxMarks: 35,
            marksAwarded: 28,
            reason: 'Coordinate plane intercepts correctly graphed. Slope calculation has minor arithmetic error.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e7000000-0000-4000-8000-000000000007',
      studentId: 's4000000-0000-4000-8000-000000000004',
      title: 'Newtonian Mechanics',
      subject: 'Physics',
      score: 78,
      maxScore: 100,
      percentage: 78,
      fileName: 'david_physics.jpg',
      confirmedStrengths: ['Free-body diagrams', 'Vector decomposition'],
      watchOutAreas: ['Missing SI units in final answers', 'Friction coefficients'],
      summary: 'Strong analytical skills in vector physics, but frequently omitted unit symbols in final answers.',
      detailedAnalysis: 'Vectors were decomposed with great precision. Two questions lost marks purely for missing N (Newtons) and m/s^2 units.',
      createdAt: ago(4),
      rawJsonResult: {
        score: 78,
        maxScore: 100,
        percentage: 78,
        confirmedStrengths: ['Free-body diagrams', 'Vector decomposition'],
        watchOutAreas: ['Missing SI units in final answers', 'Friction coefficients'],
        overallFeedback: 'Strong analytical skills in vector physics, but frequently omitted unit symbols in final answers.',
        detailedAnalysis: 'Vectors were decomposed with great precision. Two questions lost marks purely for missing N (Newtons) and m/s^2 units.',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 30,
            marksAwarded: 28,
            reason: 'Free body diagram drawn accurately. Lost 2 marks for missing vector arrow on normal force.'
          },
          {
            questionNumber: 'Q2',
            pages: [1, 2],
            maxMarks: 35,
            marksAwarded: 25,
            reason: 'Resolved incline forces correctly. Lost marks for omitted Newton units in final answer.'
          },
          {
            questionNumber: 'Q3',
            pages: [2],
            maxMarks: 35,
            marksAwarded: 25,
            reason: 'Kinematics formula applied properly. Kinetic friction coefficient calculation incomplete.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e8000000-0000-4000-8000-000000000008',
      studentId: 's1000000-0000-4000-8000-000000000001',
      title: 'Linear Equations & Graphs',
      subject: 'Mathematics',
      score: 85,
      maxScore: 100,
      percentage: 85,
      fileName: 'maya_math_midterm.jpg',
      confirmedStrengths: ['Solving simultaneous linear equations', 'Graph slope-intercept form'],
      watchOutAreas: ['Sign distribution across negative brackets'],
      summary: 'Solid algebraic fluency on linear systems and coordinate graphing; minor negative bracket sign slip.',
      detailedAnalysis: 'Q1 and Q2 solved with complete working steps. Q3 had an algebraic slip when expanding -(3x - 5).',
      createdAt: ago(8),
      rawJsonResult: {
        score: 85,
        maxScore: 100,
        percentage: 85,
        confirmedStrengths: ['Solving simultaneous linear equations', 'Graph slope-intercept form'],
        watchOutAreas: ['Sign distribution across negative brackets'],
        overallFeedback: 'Solid algebraic fluency on linear systems and coordinate graphing; minor negative bracket sign slip.',
        detailedAnalysis: 'Q1 and Q2 solved with complete working steps. Q3 had an algebraic slip when expanding -(3x - 5).',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 30,
            marksAwarded: 30,
            reason: 'Step-by-step algebraic elimination method solved with flawless accuracy.'
          },
          {
            questionNumber: 'Q2',
            pages: [1, 2],
            maxMarks: 35,
            marksAwarded: 33,
            reason: 'Plotted line coordinates accurately and determined slope m = -2/3 correctly.'
          },
          {
            questionNumber: 'Q3',
            pages: [2],
            maxMarks: 35,
            marksAwarded: 22,
            reason: 'Sign inversion error when distributing negative coefficient across brackets.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e9000000-0000-4000-8000-000000000009',
      studentId: 's1000000-0000-4000-8000-000000000001',
      title: 'Algebraic Operations Quiz',
      subject: 'Mathematics',
      score: 94,
      maxScore: 100,
      percentage: 94,
      fileName: 'maya_algebra_quiz.jpg',
      confirmedStrengths: ['Solving simultaneous linear equations', 'Quadratic expansion', 'Parentheses distribution'],
      watchOutAreas: ['Double-checking intermediate calculations'],
      summary: 'Outstanding improvement! Flawless parentheses distribution and crisp step-by-step algebra.',
      detailedAnalysis: 'Completely resolved previous sign errors. Full marks on all expansion questions.',
      createdAt: ago(1),
      rawJsonResult: {
        score: 94,
        maxScore: 100,
        percentage: 94,
        confirmedStrengths: ['Solving simultaneous linear equations', 'Quadratic expansion', 'Parentheses distribution'],
        watchOutAreas: ['Double-checking intermediate calculations'],
        overallFeedback: 'Outstanding improvement! Flawless parentheses distribution and crisp step-by-step algebra.',
        detailedAnalysis: 'Completely resolved previous sign errors. Full marks on all expansion questions.',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 50,
            marksAwarded: 48,
            reason: 'Excellent polynomial multiplication with careful sign tracking.'
          },
          {
            questionNumber: 'Q2',
            pages: [1, 2],
            maxMarks: 50,
            marksAwarded: 46,
            reason: 'Factoring quadratic expressions completed with full mathematical rigour.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e1000000-0000-4000-8000-000000000010',
      studentId: 's2000000-0000-4000-8000-000000000002',
      title: 'Kinematics & Vectors Test',
      subject: 'Physics',
      score: 74,
      maxScore: 100,
      percentage: 74,
      fileName: 'alex_physics_test.jpg',
      confirmedStrengths: ['Free-body diagrams', 'Vector decomposition on coordinate planes'],
      watchOutAreas: ['SI unit acceleration notation (m/s²)'],
      summary: 'Good physical intuition and neat free-body sketches; remember acceleration units (m/s²).',
      detailedAnalysis: 'Accurately resolved 2D incline force components. Lost marks for writing m/s instead of m/s².',
      createdAt: ago(5),
      rawJsonResult: {
        score: 74,
        maxScore: 100,
        percentage: 74,
        confirmedStrengths: ['Free-body diagrams', 'Vector decomposition on coordinate planes'],
        watchOutAreas: ['SI unit acceleration notation (m/s²)'],
        overallFeedback: 'Good physical intuition and neat free-body sketches; remember acceleration units (m/s²).',
        detailedAnalysis: 'Accurately resolved 2D incline force components. Lost marks for writing m/s instead of m/s².',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 50,
            marksAwarded: 40,
            reason: 'Vector components correctly resolved using sine and cosine trigonometry.'
          },
          {
            questionNumber: 'Q2',
            pages: [2],
            maxMarks: 50,
            marksAwarded: 34,
            reason: 'Applied Newton second law equation. Omitted m/s² units in final computed answer.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e4000000-0000-4000-8000-000000000001',
      studentId: 'student-beta-session',
      title: 'Calculus & Coordinate Geometry Mock 1',
      subject: 'Mathematics',
      score: 84,
      maxScore: 100,
      percentage: 84,
      fileName: 'aryan_calculus_mock1.jpg',
      confirmedStrengths: ['Definite integrals by substitution', 'Vector dot and cross products', 'Matrix determinants'],
      watchOutAreas: ['Negative bracket distribution in algebraic expansions', 'Missing constants of integration'],
      summary: 'Strong conceptual grasp of integration by substitution and vector algebra. Minor algebraic sign error in expansion.',
      detailedAnalysis: 'Demonstrated superior mastery in trigonometric substitutions for definite integrals. In problem 3, a negative sign was omitted when expanding brackets, resulting in an avoidable 4-mark deduction.',
      createdAt: ago(7),
      rawJsonResult: {
        score: 84,
        maxScore: 100,
        percentage: 84,
        confirmedStrengths: ['Definite integrals by substitution', 'Vector dot and cross products', 'Matrix determinants'],
        watchOutAreas: ['Negative bracket distribution in algebraic expansions', 'Missing constants of integration'],
        overallFeedback: 'Strong conceptual grasp of integration by substitution and vector algebra. Minor algebraic sign error in expansion.',
        detailedAnalysis: 'Demonstrated superior mastery in trigonometric substitutions for definite integrals. In problem 3, a negative sign was omitted when expanding brackets, resulting in an avoidable 4-mark deduction.',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 40,
            marksAwarded: 40,
            reason: 'Perfect integration by parts and substitution. Limits transformed correctly.'
          },
          {
            questionNumber: 'Q2',
            pages: [1],
            maxMarks: 30,
            marksAwarded: 30,
            reason: 'Vector cross product and plane normal vector computed accurately.'
          },
          {
            questionNumber: 'Q3',
            pages: [2],
            maxMarks: 30,
            marksAwarded: 14,
            reason: 'Correct method for ellipse eccentricity. Lost marks due to negative bracket distribution: -2(x - 3) was expanded as -2x - 6 instead of -2x + 6.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    },
    {
      id: 'e4000000-0000-4000-8000-000000000002',
      studentId: 'student-beta-session',
      title: 'Differential Equations & Vectors Assessment',
      subject: 'Mathematics',
      score: 76,
      maxScore: 100,
      percentage: 76,
      fileName: 'aryan_diffeq_assessment.jpg',
      confirmedStrengths: ['Separable differential equations', 'Vector triple products'],
      watchOutAreas: ['Negative bracket distribution in algebraic expansions', 'Integrating factor simplification'],
      summary: 'Solid working on linear differential equations. Watch out for negative sign distribution in polynomial terms.',
      detailedAnalysis: 'Clean execution of separable variables and vector equations. Lost partial marks when distributing negative factors across numerator polynomials.',
      createdAt: ago(2),
      rawJsonResult: {
        score: 76,
        maxScore: 100,
        percentage: 76,
        confirmedStrengths: ['Separable differential equations', 'Vector triple products'],
        watchOutAreas: ['Negative bracket distribution in algebraic expansions', 'Integrating factor simplification'],
        overallFeedback: 'Solid working on linear differential equations. Watch out for negative sign distribution in polynomial terms.',
        detailedAnalysis: 'Clean execution of separable variables and vector equations. Lost partial marks when distributing negative factors across numerator polynomials.',
        questions: [
          {
            questionNumber: 'Q1',
            pages: [1],
            maxMarks: 50,
            marksAwarded: 44,
            reason: 'Integrating factor computed correctly. Minor arithmetic slip on boundary condition.'
          },
          {
            questionNumber: 'Q2',
            pages: [2],
            maxMarks: 50,
            marksAwarded: 32,
            reason: 'Sign distribution error inside polynomial brackets in the final simplification step.'
          }
        ],
        filePreviewUrls: [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]
      }
    }
  ];

  const profiles: StudentProfileRecord[] = [
    {
      studentId: 's1000000-0000-4000-8000-000000000001',
      activeWeaknesses: ['Balancing multi-step chemical equations', 'Significant figures precision'],
      stableStrengths: ['Identifying chemical reaction types', 'Writing molecular formulas', 'Solving simultaneous linear equations'],
      updatedAt: ago(1),
      dpps: [
        {
          id: 'dpp-beta-maya-1',
          createdAt: ago(2),
          basedOnMistakes: ['Balancing multi-step chemical equations', 'Unit conversion errors'],
          content: '### Targeted Practice: Chemical Equations & Metric Units\n\n**Problem 1 (Balancing Reaction):**\nBalance the following thermite reaction demonstrating conservation of atoms:\n$$\\text{Al} + \\text{Fe}_3\\text{O}_4 \\rightarrow \\text{Al}_2\\text{O}_3 + \\text{Fe}$$\n\n**Problem 2 (Hydrocarbon Combustion):**\nWrite and balance the complete combustion equation for butane ($\\text{C}_4\\text{H}_{10}$):\n$$\\text{C}_4\\text{H}_{10} + \\text{O}_2 \\rightarrow \\text{CO}_2 + \\text{H}_2\\text{O}$$\n\n**Problem 3 (Unit Conversion):**\nA gas sample occupies $3500\\text{ cm}^3$ at standard conditions. Convert this volume into $\\text{m}^3$ and $\\text{dm}^3$, expressing your final answer to 3 significant figures.\n\n---\n#### Hints & Guidance:\n1. For Problem 1, balance the oxygen atoms first by finding the lowest common multiple of 4 and 3 (12).\n- Solution for Problem 1: $8\\text{Al} + 3\\text{Fe}_3\\text{O}_4 \\rightarrow 4\\text{Al}_2\\text{O}_3 + 9\\text{Fe}$. Balancing oxygen gives $3\\text{Fe}_3\\text{O}_4 \\rightarrow 4\\text{Al}_2\\text{O}_3$, which requires $8\\text{Al}$ and produces $9\\text{Fe}$.\n2. For Problem 2, balance Carbon (4) and Hydrogen (10 -> 5 H2O), then double all coefficients if Oxygen needs a fractional fraction.\n- Solution for Problem 2: $2\\text{C}_4\\text{H}_{10} + 13\\text{O}_2 \\rightarrow 8\\text{CO}_2 + 10\\text{H}_2\\text{O}$. Carbon balances with $8\\text{CO}_2$ and Hydrogen balances with $10\\text{H}_2\\text{O}$, consuming $8 \\times 2 + 10 = 26$ oxygen atoms (13 $\\text{O}_2$).\n3. For Problem 3, recall that $1\\text{ dm}^3 = 1000\\text{ cm}^3$ and $1\\text{ m}^3 = 10^6\\text{ cm}^3$.\n- Solution for Problem 3: $3500\\text{ cm}^3 = 3.50\\text{ dm}^3 = 3.50 \\times 10^{-3}\\text{ m}^3$ (expressed accurately to 3 significant figures).'
        }
      ]
    },
    {
      studentId: 's2000000-0000-4000-8000-000000000002',
      activeWeaknesses: ['Explaining reasoning in detail'],
      stableStrengths: ['Clear diagram sketches', 'Vector decomposition on coordinate planes'],
      updatedAt: ago(3),
      dpps: []
    },
    {
      studentId: 's3000000-0000-4000-8000-000000000003',
      activeWeaknesses: ['Sign errors in expansion'],
      stableStrengths: ['Factoring polynomials', 'Graphing intercepts'],
      updatedAt: ago(5),
      dpps: []
    },
    {
      studentId: 's4000000-0000-4000-8000-000000000004',
      activeWeaknesses: ['Missing SI units in final answers'],
      stableStrengths: ['Free-body diagrams', 'Vector decomposition'],
      updatedAt: ago(4),
      dpps: []
    },
    {
      studentId: 'student-beta-session',
      activeWeaknesses: ['Negative bracket distribution in algebraic expansions', 'Missing constants of integration'],
      stableStrengths: ['Definite integrals by substitution', 'Vector dot and cross products', 'Separable differential equations'],
      updatedAt: ago(1),
      dpps: [
        {
          id: 'dpp-beta-aryan-1',
          createdAt: ago(1),
          basedOnMistakes: ['Negative bracket distribution in algebraic expansions', 'Missing constants of integration'],
          content: '### Targeted Practice: JEE Advanced Calculus & Bracket Expansion\n\n**Problem 1 (Definite Integral & Bracket Expansion):**\nEvaluate the following definite integral demonstrating careful negative sign distribution across the algebraic expansion:\n$$\\int_{0}^{2} \\left[ 3(2x - 1)^2 - 2(x + 4)(x - 1) \\right] \\, dx$$\n\n**Problem 2 (Differential Equation with Initial Condition):**\nSolve the following first-order linear differential equation, ensuring the constant of integration $C$ is explicitly evaluated:\n$$\\frac{dy}{dx} + 2y = 4x, \\quad \\text{with } y(0) = 1$$\n\n**Problem 3 (Vector Geometry & Sign Verification):**\nGiven vectors $\\vec{a} = 2\\hat{i} - 3\\hat{j} + \\hat{k}$ and $\\vec{b} = -\\hat{i} + 2\\hat{j} - 4\\hat{k}$, calculate the vector cross product $\\vec{a} \\times \\vec{b}$ and verify that $(\\vec{a} \\times \\vec{b}) \\cdot \\vec{a} = 0$.\n\n---\n#### Hints & Guidance:\n1. For Problem 1, expand $(2x - 1)^2 = 4x^2 - 4x + 1$ and $(x + 4)(x - 1) = x^2 + 3x - 4$. Distribute the $-2$: $-2(x^2 + 3x - 4) = -2x^2 - 6x + 8$.\n- Solution for Problem 1: Combining terms inside gives $(12x^2 - 12x + 3) + (-2x^2 - 6x + 8) = 10x^2 - 18x + 11$. Integrating from $0$ to $2$: $\\left[ \\frac{10}{3}x^3 - 9x^2 + 11x \\right]_0^2 = \\frac{80}{3} - 36 + 22 = \\frac{80}{3} - 14 = \\frac{38}{3}$.\n2. For Problem 2, the integrating factor is $I(x) = e^{\\int 2\\,dx} = e^{2x}$. Multiply across: $\\frac{d}{dx}(y e^{2x}) = 4x e^{2x}$. Integrate by parts to find $y e^{2x} = 2x e^{2x} - e^{2x} + C$. Divide by $e^{2x}$: $y = 2x - 1 + C e^{-2x}$. Using $y(0) = 1$: $1 = 0 - 1 + C \\implies C = 2$. Thus, $y = 2x - 1 + 2e^{-2x}$.\n3. For Problem 3, compute the determinant for $\\vec{a} \\times \\vec{b}$:\n- Solution for Problem 3: $\\vec{a} \\times \\vec{b} = \\begin{vmatrix} \\hat{i} & \\hat{j} & \\hat{k} \\\\ 2 & -3 & 1 \\\\ -1 & 2 & -4 \\end{vmatrix} = \\hat{i}(12 - 2) - \\hat{j}(-8 - (-1)) + \\hat{k}(4 - 3) = 10\\hat{i} + 7\\hat{j} + \\hat{k}$. Check dot product: $10(2) + 7(-3) + 1(1) = 20 - 21 + 1 = 0$.'
        }
      ]
    }
  ];

  const questionPapers: QuestionPaperRecord[] = [
    {
      id: 'qp-science-midterm',
      title: 'Year 8 Science Mid-Term Exam',
      subject: 'Science',
      fileUrls: [SAMPLE_QUESTION_PAPER_DATA_URL],
      pageCount: 1,
      createdAt: ago(25)
    },
    {
      id: 'qp-math-algebra',
      title: 'Year 9 Linear Equations Assessment',
      subject: 'Mathematics',
      fileUrls: [SAMPLE_QUESTION_PAPER_DATA_URL],
      pageCount: 1,
      createdAt: ago(20)
    },
    {
      id: 'qp-jee-calculus',
      title: 'JEE Advanced Calculus & Vectors Mock Paper',
      subject: 'Mathematics',
      fileUrls: [SAMPLE_QUESTION_PAPER_DATA_URL],
      pageCount: 1,
      createdAt: ago(15)
    }
  ];

  return { classrooms, students, evaluations, profiles, questionPapers };
}

export function getSampleBetaData(): PersistedData {
  const saved = read<PersistedData | null>('rubrica_beta_data', null);
  const initial = generateInitialBetaData();

  if (!saved || !Array.isArray(saved.students) || saved.students.length === 0 || !Array.isArray(saved.classrooms) || saved.classrooms.length === 0) {
    write('rubrica_beta_data', initial);
    return initial;
  }

  // Non-destructive update: preserve all user-created classrooms, students, evaluations, and profiles,
  // while ensuring baseline sample records (including Aryan Patel and JEE Advanced) are present.
  let modified = false;

  for (const c of initial.classrooms) {
    if (!saved.classrooms.some(existing => existing.id === c.id)) {
      saved.classrooms.push(c);
      modified = true;
    }
  }

  for (const s of initial.students) {
    if (!saved.students.some(existing => existing.id === s.id)) {
      saved.students.push(s);
      modified = true;
    }
  }

  saved.evaluations = saved.evaluations || [];
  for (const ev of initial.evaluations) {
    if (!saved.evaluations.some(existing => existing.id === ev.id)) {
      saved.evaluations.push(ev);
      modified = true;
    }
  }

  saved.profiles = saved.profiles || [];
  for (const p of initial.profiles) {
    if (!saved.profiles.some(existing => existing.studentId === p.studentId)) {
      saved.profiles.push(p);
      modified = true;
    }
  }

  saved.questionPapers = saved.questionPapers || [];
  for (const qp of (initial.questionPapers || [])) {
    if (!saved.questionPapers.some(existing => existing.id === qp.id)) {
      saved.questionPapers.push(qp);
      modified = true;
    }
  }

  if (modified) {
    write('rubrica_beta_data', saved);
  }

  return saved;
}

export function resetBetaData(): PersistedData {
  const initial = generateInitialBetaData();
  write('rubrica_beta_data', initial);
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(keys.deletedQpIds);
    window.localStorage.removeItem(keys.questionPapers);
  }
  return initial;
}

export function saveBetaData(data: PersistedData): void {
  write('rubrica_beta_data', data);
}