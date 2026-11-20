import { supabase } from './supabase';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const getInstitutions = async () => {
  const { data, error } = await supabase.from('institutions').select('id, name').order('name');
  if (error) throw new Error(error.message);
  return data;
};

export const createInstitution = async ({ data }: any) => {
  const { name, maxStudents, cost } = data;
  const { data: newInst, error } = await supabase.from('institutions').insert({ name, max_students: maxStudents, cost: cost || 0 }).select().single();
  if (error) throw new Error(error.message);
  return newInst;
};

/**
 * Admin status is verified by the database (`public.is_admin()`), never by an
 * email address in localStorage. The server-side RLS policies enforce the same
 * check, so this call only controls what the UI renders.
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
};

export const getInstitutionStats = async () => {
  const { data, error } = await supabase.from('institution_stats').select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn("View institution_stats failed, falling back to raw institutions table", error.message);
    const { data: fallbackData, error: fallbackError } = await supabase.from('institutions').select('*').order('created_at', { ascending: false });
    if (fallbackError) throw new Error(fallbackError.message);
    return fallbackData.map((inst: any) => ({ ...inst, current_students: 0 }));
  }
  return data;
};

export const registerUser = async ({ data }: any) => {
  const { name, institutionId, email, password, role = 'student' } = data;
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, institution: institutionId, role }
    }
  });

  if (authError) throw new Error(authError.message);
  
  if (authData.user) {
    try {
      await supabase.from('teacher_profiles').upsert({
        id: authData.user.id,
        email: email,
        name: name,
        institution_id: institutionId || null
      });
    } catch {}
  }
  
  return { 
    id: authData.user?.id, 
    name, 
    institution: institutionId, 
    email, 
    role,
    session: authData.session 
  };
};

export const loginUser = async ({ data }: any) => {
  const { email, password, role: intendedRole } = data;
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  
  if (authError) throw new Error(authError.message);
  
  // Try to fetch teacher profile to ensure it exists, upsert if admin logging in for first time since update
  if (email === 'certifiedtechidiot@gmail.com' && authData.user) {
    await supabase.from('teacher_profiles').upsert({
      id: authData.user.id,
      email: email,
      name: authData.user.user_metadata?.name || 'Admin',
      institution_id: null
    }, { onConflict: 'id' });
  }

  const effectiveRole = intendedRole || authData.user?.user_metadata?.role || (typeof localStorage !== 'undefined' ? localStorage.getItem('rubrica_intended_role') : null) || 'student';

  return { 
    id: authData.user?.id, 
    name: authData.user?.user_metadata?.name || (effectiveRole === 'student' ? 'Student' : 'Teacher'), 
    role: effectiveRole as 'student' | 'teacher',
    institution: authData.user?.user_metadata?.institution || (effectiveRole === 'student' ? 'Self-Prep' : 'Academy'),
    email: email
  };
};

export const signInAnonymously = async () => {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(error.message);
  return data;
};

export const signInWithGoogle = async (role: 'student' | 'teacher' = 'student') => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('rubrica_intended_role', role);
      localStorage.setItem('rubrica_app_mode', 'true');
    } catch {}
  }

  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  if (isNative) {
    const customSchemeRedirect = `in.rubrica.app://auth-callback?role=${role}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: customSchemeRedirect,
        skipBrowserRedirect: true,
      }
    });

    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error('No OAuth URL returned by authentication provider.');

    // Open inside Chrome Custom Tab overlay in-app
    await Browser.open({ url: data.url, windowName: '_self' });
    return data;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rubrica.in';
  const redirectUrl = `${origin}/app?app=true&role=${role}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });
  if (error) throw new Error(error.message);
  return data;
};

export const getTeacherProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('teacher_profiles')
      .select('id, name, email, institution_id, institutions(name)')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      console.warn("getTeacherProfile non-fatal notice:", error.message);
      return null;
    }

    // Retrieve role and exam from user metadata if table does not contain role column
    let metaRole: 'teacher' | 'student' = 'teacher';
    let metaGradeOrExam: string | undefined = undefined;
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user) {
        metaRole = (authUser.user.user_metadata?.role as any) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('rubrica_intended_role') as any) : 'teacher');
        metaGradeOrExam = authUser.user.user_metadata?.gradeOrExam;
      }
    } catch {
      // ignore
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      institutionId: data.institution_id,
      institution: (data.institutions as any)?.name,
      role: metaRole || 'teacher',
      gradeOrExam: metaGradeOrExam
    };
  } catch (err) {
    console.warn("getTeacherProfile catch notice:", err);
    return null;
  }
};

export const completeOnboarding = async ({ data }: any) => {
  const { userId, email, name, institutionId, role, gradeOrExam } = data;

  // 1. Update Supabase Auth user metadata so role and gradeOrExam are always preserved
  try {
    await supabase.auth.updateUser({
      data: {
        name,
        institution: institutionId,
        role: role || 'teacher',
        gradeOrExam: gradeOrExam || null
      }
    });
  } catch (metaErr) {
    console.warn("Could not update auth user metadata:", metaErr);
  }

  // 2. Also persist locally in browser / app
  if (typeof localStorage !== 'undefined') {
    if (role) localStorage.setItem('rubrica_intended_role', role);
  }

  // 3. Base profile columns guaranteed in standard Supabase schema (id, email, name, institution_id)
  // NEVER send role or grade_or_exam to teacher_profiles as they do not exist in the remote table
  const baseProfile: Record<string, any> = {
    id: userId,
    email: email || '',
    name: name || (role === 'student' ? 'Student' : 'Teacher'),
    institution_id: institutionId && institutionId !== 'independent' && institutionId !== 'general' && institutionId !== 'custom' ? institutionId : null
  };

  try {
    const { error } = await supabase.from('teacher_profiles').upsert(baseProfile, { onConflict: 'id' });
    if (error) {
      console.warn("teacher_profiles upsert notice (non-fatal):", error.message);
    }
  } catch (dbErr) {
    console.warn("teacher_profiles non-fatal catch:", dbErr);
  }

  return { success: true };
};

export const getDashboardData = async ({ data }: any) => {
  const { userId } = data;
  
  const [classrooms, students, evaluations, profiles] = await Promise.all([
    supabase.from('classrooms').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('students').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('evaluations').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('student_profiles').select('*').eq('user_id', userId)
  ]);

  return {
    classrooms: classrooms.data?.map(c => ({ ...c, id: c.id, name: c.name, grade: c.grade, subject: c.subject, rubric: c.rubric, createdAt: c.created_at })) || [],
    students: students.data?.map(s => ({ ...s, id: s.id, name: s.name, grade: s.grade, classroomId: s.classroom_id, createdAt: s.created_at })) || [],
    evaluations: evaluations.data?.map(e => ({
      id: e.id, studentId: e.student_id, title: e.title, subject: e.subject, score: e.score, maxScore: e.max_score, percentage: e.percentage,
      fileName: e.file_name, overallFeedback: e.overall_feedback, detailedAnalysis: e.detailed_analysis,
      confirmedStrengths: typeof e.confirmed_strengths === 'string' ? JSON.parse(e.confirmed_strengths) : e.confirmed_strengths,
      watchOutAreas: typeof e.watch_out_areas === 'string' ? JSON.parse(e.watch_out_areas) : e.watch_out_areas,
      rawJsonResult: typeof e.raw_json_result === 'string' ? JSON.parse(e.raw_json_result) : e.raw_json_result,
      createdAt: e.created_at
    })) || [],
    profiles: profiles.data?.map(p => ({
      studentId: p.student_id,
      activeWeaknesses: typeof p.active_weaknesses === 'string' ? JSON.parse(p.active_weaknesses) : (p.active_weaknesses || []),
      stableStrengths: typeof p.stable_strengths === 'string' ? JSON.parse(p.stable_strengths) : (p.stable_strengths || []),
      dpps: typeof p.dpps === 'string' ? JSON.parse(p.dpps) : (p.dpps || []),
      updatedAt: p.updated_at
    })) || []
  };
};

export const addClassroomFn = async ({ data }: any) => {
  const { error } = await supabase.from('classrooms').insert({
    id: data.id, user_id: data.userId, name: data.name, grade: data.grade, subject: data.subject, rubric: data.rubric || null, created_at: data.createdAt
  });
  if (error) {
    console.error("Supabase insert error (classrooms):", error);
  }
  return { success: true };
};

export const updateClassroomRubricFn = async ({ data }: any) => {
  await supabase.from('classrooms').update({ rubric: data.rubric }).eq('id', data.id).eq('user_id', data.userId);
  return { success: true };
};

export const addStudentFn = async ({ data }: any) => {
  // Check institution quota
  const { data: profile } = await supabase.from('teacher_profiles').select('institution_id').eq('id', data.userId).single();
  if (profile?.institution_id) {
    const { data: stats } = await supabase.from('institution_stats').select('current_students, max_students').eq('id', profile.institution_id).single();
    if (stats && stats.current_students >= stats.max_students) {
      throw new Error(`Institution quota reached (${stats.max_students} students). Please contact your administrator.`);
    }
  }

  await supabase.from('students').insert({
    id: data.id, user_id: data.userId, classroom_id: data.classroomId || null, name: data.name, grade: data.grade, created_at: data.createdAt
  });
  return { success: true };
};

export const saveEvaluationFn = async ({ data }: any) => {
  await supabase.from('evaluations').upsert({
    id: data.id, user_id: data.userId, student_id: data.studentId, title: data.title, subject: data.subject, score: data.score, max_score: data.maxScore, percentage: data.percentage,
    file_name: data.fileName, overall_feedback: data.overallFeedback, detailed_analysis: data.detailedAnalysis,
    confirmed_strengths: data.confirmedStrengths, watch_out_areas: data.watchOutAreas, raw_json_result: data.rawJsonResult, created_at: data.createdAt
  });
  return { success: true };
};

export const saveStudentProfileFn = async ({ data }: any) => {
  await supabase.from('student_profiles').upsert({
    student_id: data.studentId, 
    user_id: data.userId, 
    active_weaknesses: data.activeWeaknesses, 
    stable_strengths: data.stableStrengths, 
    dpps: data.dpps || [],
    updated_at: data.updatedAt
  });
  return { success: true };
};

export const deleteStudentFn = async ({ data }: any) => {
  await supabase.from('students').delete().eq('id', data.id).eq('user_id', data.userId);
  return { success: true };
};

export const deleteClassroomFn = async ({ data }: any) => {
  await supabase.from('classrooms').delete().eq('id', data.id).eq('user_id', data.userId);
  return { success: true };
};

export const deleteEvaluationFn = async ({ data }: any) => {
  await supabase.from('evaluations').delete().eq('id', data.id).eq('user_id', data.userId);
  return { success: true };
};

export const resetPassword = async (email: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rubrica.in';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/login`,
  });
  if (error) throw new Error(error.message);
  return { success: true };
};

export const signInWithOtp = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });
  if (error) throw new Error(error.message);
  return { success: true };
};

export const verifyOtp = async (
  email: string, 
  token: string, 
  metadata?: {
    name?: string;
    role?: 'teacher' | 'student';
    gradeOrExam?: string;
    institutionId?: string;
    institutionName?: string;
  }
) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });
  if (error) throw new Error(error.message);
  
  const userId = data.user?.id;
  if (!userId) throw new Error("No user returned from verification");

  // Attempt to fetch existing profile from database
  let profile = await getTeacherProfile(userId);

  if (!profile) {
    const name = metadata?.name || data.user?.user_metadata?.name || email.split('@')[0];
    const role = metadata?.role || 'teacher';
    const gradeOrExam = metadata?.gradeOrExam;
    const institutionId = metadata?.institutionId;
    const institution = metadata?.institutionName || (role === 'student' ? (gradeOrExam || 'Self-Prep') : 'Independent Academy');

    try {
      await supabase.from('teacher_profiles').upsert({
        id: userId,
        email,
        name,
        institution_id: institutionId && institutionId !== 'independent' ? institutionId : null
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn("Could not upsert profile after OTP verification:", err);
    }

    profile = {
      id: userId,
      name,
      email,
      institution,
      institutionId,
      role,
      gradeOrExam
    };
  } else {
    // If returning user profile exists but lacked role, adopt role from current session
    if (metadata?.role && !profile.role) {
      profile.role = metadata.role;
    }
    if (metadata?.gradeOrExam && !profile.gradeOrExam) {
      profile.gradeOrExam = metadata.gradeOrExam;
    }
  }

  return profile;
};
