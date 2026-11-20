import { db } from './src/lib/db';

console.log("Seeding database...");

// Insert Rehkan Khan User
const userId = 'user-rehankhan';
try {
  db.query(`INSERT OR REPLACE INTO users (id, name, institution, email, password) VALUES ($id, $name, $inst, $email, $pwd)`).run({
    $id: userId,
    $name: 'Rehan Khan',
    $inst: 'Rubrica Academy',
    $email: 'rehankhan',
    $pwd: '123456789'
  });
} catch (e) {
  console.log("User may already exist or error:", e);
}

// Clear existing fake data for this user to avoid duplicates if re-run
db.query(`DELETE FROM classrooms WHERE user_id = $userId`).run({ $userId: userId });

const now = Date.now();
const ago = (days: number) => new Date(now - days * 86400000).toISOString();

const classrooms = [
  { id: 'class-demo-1', name: 'Year 8 Science A', grade: 'Year 8', subject: 'Science', rubric: 'Deduct 1 mark for missing units (e.g. kg, m/s).', createdAt: ago(20) },
  { id: 'class-demo-2', name: 'Year 8 Science B', grade: 'Year 8', subject: 'Science', rubric: '', createdAt: ago(20) }
];

classrooms.forEach(c => {
  db.query(`INSERT INTO classrooms (id, user_id, name, grade, subject, rubric, created_at) VALUES ($id, $userId, $name, $grade, $subject, $rubric, $createdAt)`).run({
    $id: c.id, $userId: userId, $name: c.name, $grade: c.grade, $subject: c.subject, $rubric: c.rubric, $createdAt: c.createdAt
  });
});

const students = [
  { id: 'demo-student-1', classroomId: 'class-demo-1', name: 'Maya Robinson', grade: 'Year 8', createdAt: ago(15) },
  { id: 'demo-student-2', classroomId: 'class-demo-1', name: 'Alex Chen', grade: 'Year 8', createdAt: ago(10) },
  { id: 'demo-student-3', classroomId: 'class-demo-2', name: 'Sarah Connor', grade: 'Year 8', createdAt: ago(5) },
];

students.forEach(s => {
  db.query(`INSERT INTO students (id, user_id, classroom_id, name, grade, created_at) VALUES ($id, $userId, $classroomId, $name, $grade, $createdAt)`).run({
    $id: s.id, $userId: userId, $classroomId: s.classroomId, $name: s.name, $grade: s.grade, $createdAt: s.createdAt
  });
});

const evaluations = [
  {
    id: 'eval-demo-1', studentId: 'demo-student-1', title: 'Mid-term Science', subject: 'Science', score: 65, maxScore: 100, percentage: 65, fileName: 'test1.jpg', createdAt: ago(14),
    confirmedStrengths: ['Identifying reaction types'],
    watchOutAreas: ['Balancing chemical equations', 'Unit conversion'],
    summary: 'Good understanding of concepts, but lost marks on calculation details.',
    detailedAnalysis: 'Maya demonstrated a solid grasp of reaction types. However, she needs to practice balancing complex chemical equations.'
  },
  {
    id: 'eval-demo-2', studentId: 'demo-student-1', title: 'Weekly Quiz', subject: 'Science', score: 72, maxScore: 100, percentage: 72, fileName: 'quiz1.jpg', createdAt: ago(7),
    confirmedStrengths: ['Identifying reaction types', 'Writing chemical formulas'],
    watchOutAreas: ['Balancing chemical equations'],
    summary: 'Improvement in formulas, but still struggling to balance complex equations.',
    detailedAnalysis: 'Great job writing formulas this week! Just keep working on those balancing coefficients.'
  },
  {
    id: 'eval-demo-3', studentId: 'demo-student-1', title: 'Pop Quiz 2', subject: 'Science', score: 85, maxScore: 100, percentage: 85, fileName: 'quiz2.jpg', createdAt: ago(2),
    confirmedStrengths: ['Identifying reaction types', 'Writing chemical formulas', 'Unit conversion'],
    watchOutAreas: ['Significant figures'],
    summary: 'Excellent progress. The balancing equations issue seems mostly resolved!',
    detailedAnalysis: 'A massive improvement. The unit conversions were flawless.'
  },
  {
    id: 'eval-demo-4', studentId: 'demo-student-2', title: 'Mid-term Science', subject: 'Science', score: 55, maxScore: 100, percentage: 55, fileName: 'test1.jpg', createdAt: ago(9),
    confirmedStrengths: ['Labeling diagrams'],
    watchOutAreas: ['Explaining concepts in detail', 'Unit conversion'],
    summary: 'Needs to provide more detail in long-form answers.',
    detailedAnalysis: 'Alex draws excellent diagrams but needs to focus on adding explanatory text.'
  },
  {
    id: 'eval-demo-5', studentId: 'demo-student-2', title: 'Weekly Quiz', subject: 'Science', score: 58, maxScore: 100, percentage: 58, fileName: 'quiz1.jpg', createdAt: ago(3),
    confirmedStrengths: ['Labeling diagrams'],
    watchOutAreas: ['Explaining concepts in detail', 'Balancing chemical equations'],
    summary: 'Still missing marks on explanation questions due to lack of detail.',
    detailedAnalysis: 'Continue working on expanding answers with more "why" and "how".'
  }
];

evaluations.forEach(e => {
  db.query(`
    INSERT INTO evaluations (id, user_id, student_id, title, subject, score, max_score, percentage, file_name, overall_feedback, detailed_analysis, confirmed_strengths, watch_out_areas, raw_json_result, created_at)
    VALUES ($id, $userId, $studentId, $title, $subject, $score, $maxScore, $percentage, $fileName, $summary, $detailedAnalysis, $strengths, $weaknesses, $raw, $createdAt)
  `).run({
    $id: e.id, $userId: userId, $studentId: e.studentId, $title: e.title, $subject: e.subject, $score: e.score, $maxScore: e.maxScore, $percentage: e.percentage,
    $fileName: e.fileName, $summary: e.summary, $detailedAnalysis: e.detailedAnalysis,
    $strengths: JSON.stringify(e.confirmedStrengths), $weaknesses: JSON.stringify(e.watchOutAreas),
    $raw: JSON.stringify({}), $createdAt: e.createdAt
  });
});

const profiles = [
  { studentId: 'demo-student-1', activeWeaknesses: ['Significant figures', 'Balancing chemical equations'], stableStrengths: ['Identifying reaction types', 'Writing chemical formulas'], updatedAt: ago(2) },
  { studentId: 'demo-student-2', activeWeaknesses: ['Explaining concepts in detail', 'Balancing chemical equations'], stableStrengths: ['Labeling diagrams'], updatedAt: ago(3) }
];

profiles.forEach(p => {
  db.query(`INSERT INTO student_profiles (student_id, user_id, active_weaknesses, stable_strengths, updated_at) VALUES ($studentId, $userId, $aw, $ss, $updatedAt)`).run({
    $studentId: p.studentId, $userId: userId, $aw: JSON.stringify(p.activeWeaknesses), $ss: JSON.stringify(p.stableStrengths), $updatedAt: p.updatedAt
  });
});

console.log("Seeding complete!");
