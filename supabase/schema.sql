-- Create tables for the Rubrica application
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Classrooms
create table public.classrooms (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  grade text not null,
  subject text not null,
  rubric text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Students
create table public.students (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  classroom_id uuid references public.classrooms(id) on delete cascade,
  name text not null,
  grade text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Evaluations
create table public.evaluations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  student_id uuid references public.students(id) on delete cascade not null,
  title text not null,
  subject text not null,
  score integer not null,
  max_score integer not null,
  percentage integer not null,
  file_name text not null,
  overall_feedback text,
  detailed_analysis text,
  confirmed_strengths jsonb default '[]'::jsonb,
  watch_out_areas jsonb default '[]'::jsonb,
  raw_json_result jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Student Profiles (Long-term tracking)
create table public.student_profiles (
  student_id uuid references public.students(id) on delete cascade primary key,
  user_id uuid references auth.users not null,
  active_weaknesses jsonb default '[]'::jsonb,
  stable_strengths jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) Policies
alter table public.classrooms enable row level security;
alter table public.students enable row level security;
alter table public.evaluations enable row level security;
alter table public.student_profiles enable row level security;

-- Policies for Classrooms
create policy "Users can view own classrooms" on public.classrooms for select using (auth.uid() = user_id);
create policy "Users can insert own classrooms" on public.classrooms for insert with check (auth.uid() = user_id);
create policy "Users can update own classrooms" on public.classrooms for update using (auth.uid() = user_id);
create policy "Users can delete own classrooms" on public.classrooms for delete using (auth.uid() = user_id);

-- Policies for Students
create policy "Users can view own students" on public.students for select using (auth.uid() = user_id);
create policy "Users can insert own students" on public.students for insert with check (auth.uid() = user_id);
create policy "Users can update own students" on public.students for update using (auth.uid() = user_id);
create policy "Users can delete own students" on public.students for delete using (auth.uid() = user_id);

-- Policies for Evaluations
create policy "Users can view own evaluations" on public.evaluations for select using (auth.uid() = user_id);
create policy "Users can insert own evaluations" on public.evaluations for insert with check (auth.uid() = user_id);
create policy "Users can update own evaluations" on public.evaluations for update using (auth.uid() = user_id);
create policy "Users can delete own evaluations" on public.evaluations for delete using (auth.uid() = user_id);

-- Policies for Student Profiles
create policy "Users can view own student profiles" on public.student_profiles for select using (auth.uid() = user_id);
create policy "Users can insert own student profiles" on public.student_profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own student profiles" on public.student_profiles for update using (auth.uid() = user_id);
create policy "Users can delete own student profiles" on public.student_profiles for delete using (auth.uid() = user_id);
