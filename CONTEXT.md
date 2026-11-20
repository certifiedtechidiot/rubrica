# Rubrica — Project Architecture & Context Window Reference

> **Repository:** [https://github.com/certifiedtechidiot/rubrica_main](https://github.com/certifiedtechidiot/rubrica_main)  
> **Production URL:** [https://www.rubrica.in](https://www.rubrica.in)  
> **Domain:** EdTech / AI Cognitive Automation / Automated Evaluation & Longitudinal Analytics  
> **Last Updated:** September 2026  

---

## 1. Executive Summary & Vision

**Rubrica** is an AI-powered, browser-based cognitive grading and longitudinal diagnostic learning platform designed for schools, coaching institutes (JEE/NEET/Boards), and independent educators. 

### The Core Problem Solved:
Teachers spend **15–20 hours per week** manually marking handwritten student exam sheets. Once papers are handed back, **critical learning signals are lost**—a teacher handling 200+ students cannot remember whether Student A made the exact same unit conversion error or algebra sign error across multiple tests over a semester.

### Rubrica's Solution:
1. **Multi-Modal Vision AI Evaluation:** Grades handwritten papers in <5 seconds using custom syllabus rubrics, extracting step-by-step mathematical/physical correctness, awarding partial marks, and producing actionable feedback.
2. **Longitudinal Learning Memory:** Tracks student error patterns across exams over months, isolating **Recurring Mistakes**, **Improving Skills**, and **Resolved Misconceptions**.
3. **Targeted Remedial Practice (DPP):** Automatically synthesizes custom **Daily Practice Problems** tailored directly to a student's recurring mistakes.
4. **Institutional B2B Infrastructure:** School and classroom isolation, student quotas, admin controls, and cost-effective multi-model architecture (<₹0.50 per scan).

---

## 2. Technology Stack & Tooling

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | **React 19** (`react@^19.2.0`), **TypeScript 5.8** |
| **Bundler & Build Tool** | **Vite 8** (`@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-tsconfig-paths`) |
| **Client Routing** | **Wouter** (`wouter@^3.10.0`) for lightweight SPA path matching; TanStack router dependencies configured |
| **State & Data Fetching** | **TanStack Query v5** (`@tanstack/react-query`), local state hooks, reactive `localStorage` fallback |
| **Styling & UI Kit** | **Tailwind CSS v4** (`@tailwindcss/typography`), **Radix UI** primitives, **Lucide React** icons |
| **Design Aesthetic** | **Neo-Brutalist Paper Theme:** Stark borders (`border-2 border-[#09090B]`), brutalist drop-shadows (`shadow-[4px_4px_0_#09090B]`), paper colorways (`#FF3366` Coral, `#10B981` Emerald, `#F59E0B` Amber, `#f2eee6` Parchment) |
| **Database & Auth** | **Supabase** (PostgreSQL 15), Postgres UUIDs, JSONB columns, Row-Level Security (RLS) policies |
| **AI Inference Gateway** | **AICredits.in API** (`https://api.aicredits.in/v1/chat/completions`) using OpenAI-compatible JSON mode |
| **Supported AI Vision Models** | `gpt-4o-mini` (Default), `gemini-1.5-flash`, `gemini-1.5-pro`, `claude-3-haiku-20240307`, `gpt-4o` |

---

## 3. Directory & File Structure

```
rubrica_main/
├── .lovable/
│   └── project.json                  # Lovable.dev cloud sync configuration
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── ui/                       # Radix-based UI building blocks (toast, dialog, select, tooltip, etc.)
│   │   ├── admin.tsx                 # Master Admin Panel for school quotas & AI key management
│   │   ├── automated-evaluate.tsx    # Multi-file/PDF AI paper evaluation upload and results screen
│   │   ├── classrooms.tsx            # Classroom list, creation modal, and classroom syllabus rubric editor
│   │   ├── contact.tsx               # Institutional sales and support contact page
│   │   ├── error-boundary.tsx        # React ErrorBoundary component catching runtime crashes
│   │   ├── landing-page.tsx          # Public neo-brutalist landing page with mobile marquee & CTA
│   │   ├── login.tsx                 # Auth modal: Email/Password, Google OAuth, Magic Link, Guest, and Beta Mode
│   │   ├── onboarding.tsx            # Post-signup teacher onboarding (Name, School selection)
│   │   ├── privacy-policy.tsx        # Compliance privacy policy
│   │   └── terms-of-service.tsx      # Terms of service
│   ├── hooks/
│   │   ├── use-mobile.tsx            # Viewport breakpoint detection hook
│   │   └── use-toast.ts              # Toast notification state hook
│   ├── lib/
│   │   ├── api.ts                    # Supabase API clients, auth helpers, mutation & query functions
│   │   ├── db.ts                     # Legacy sqlite helper (fallback)
│   │   ├── error-capture.ts          # Global window error capture and reporting
│   │   ├── error-page.ts             # Global error page formatting
│   │   ├── lovable-error-reporting.ts# Integration error telemetry
│   │   ├── storage.ts                # Data types, localStorage wrappers, longitudinal analytics engine, sample beta data
│   │   ├── supabase.ts               # Supabase JS client initialization with fallback credentials
│   │   └── utils.ts                  # Tailwind clsx / twMerge helpers
│   ├── Rubrica.tsx                   # Main SPA container, routing, shell navigation, dashboard, student profile
│   ├── router.tsx                    # Root application router wrapper
│   └── styles.css                    # Tailwind CSS imports and custom utility classes
├── supabase/
│   └── schema.sql                    # SQL migration script for all PostgreSQL tables and RLS policies
├── package.json                      # Dependency declarations and npm build scripts
├── vite.config.ts                    # Vite build configuration
└── tsconfig.json                     # TypeScript configuration with @/* path aliases
```

---

## 4. Database Schema (Supabase / PostgreSQL)

### 1. `institutions`
Represents an enrolled school or coaching center.
- `id` (uuid, primary key)
- `name` (text, not null)
- `max_students` (int, default: 50)
- `cost` (numeric, default: 0)
- `created_at` (timestamptz)

### 2. `institution_stats` (SQL View)
Computes live student consumption against quota.
- `id`, `name`, `max_students`, `current_students`, `cost`, `created_at`

### 3. `teacher_profiles`
Teacher metadata linked to Supabase authentication.
- `id` (uuid, references `auth.users`)
- `name` (text, not null)
- `email` (text)
- `institution_id` (uuid, references `institutions.id`)
- `created_at` (timestamptz)

### 4. `classrooms`
Classes managed by teachers with specific grading rubrics.
- `id` (uuid, primary key)
- `user_id` (uuid, references `auth.users`)
- `name` (text, e.g., "Grade 10 - Section A")
- `grade` (text, e.g., "10th")
- `subject` (text, e.g., "Physics")
- `rubric` (text, custom grading instructions for the AI)
- `created_at` (timestamptz)

### 5. `students`
Individual student records inside classrooms.
- `id` (uuid, primary key)
- `user_id` (uuid, references `auth.users`)
- `classroom_id` (uuid, references `classrooms.id` on delete cascade)
- `name` (text, not null)
- `grade` (text)
- `created_at` (timestamptz)

### 6. `evaluations`
Individual graded paper submissions.
- `id` (uuid, primary key)
- `user_id` (uuid, references `auth.users`)
- `student_id` (uuid, references `students.id` on delete cascade)
- `title` (text, e.g., "1D Kinematics Mid-term")
- `subject` (text)
- `score` (int)
- `max_score` (int)
- `percentage` (int)
- `file_name` (text)
- `overall_feedback` (text)
- `detailed_analysis` (text)
- `confirmed_strengths` (jsonb, array of string skills)
- `watch_out_areas` (jsonb, array of string mistakes)
- `raw_json_result` (jsonb)
- `created_at` (timestamptz)

### 7. `student_profiles`
Longitudinal learning memory cache per student.
- `student_id` (uuid, references `students.id` on delete cascade, primary key)
- `user_id` (uuid, references `auth.users`)
- `active_weaknesses` (jsonb, persistent recurring mistakes)
- `stable_strengths` (jsonb, persistent mastered skills)
- `dpps` (jsonb, array of generated practice problem worksheets)
- `updated_at` (timestamptz)

### 8. `system_settings`
Global system-wide configuration.
- `id` (int, primary key, row 1)
- `ai_model` (text, e.g., "gpt-4o-mini")
- `api_key` (text, master encrypted API key)

---

## 5. Key Workflows & Features

### A. Authentication & Session Types
1. **Email / Password & Google OAuth:** Standard institutional registration. Onboarding assigns the teacher to a selected school.
2. **Anonymous / Guest Session:** Allows instant zero-barrier trial. Automatically inherits valid database IDs to bypass PostgreSQL foreign key constraints.
3. **Explore Beta (Sample Data Mode):** Instant interactive sandbox. Preloads **4 students** (Maya, Alex, Sarah, David), **7 evaluated exams**, and pre-generated DPP worksheets completely in memory/localStorage without touching cloud quotas.
4. **Admin Bypass (`certifiedtechidiot@gmail.com`):** Dedicated administrative console with school creation, student quota enforcement, and global AI API key/model configuration.

### B. AI Vision Paper Evaluation Pipeline (`src/components/automated-evaluate.tsx`)
1. **Multi-Input Ingestion:** Accepts single/multiple images, PDFs, and slide files for both the **Question Paper** (optional) and **Student Answer Paper** (mandatory).
2. **Data URL Conversion:** Ingests files into memory, converts them to Base64 data URLs.
3. **Dynamic Prompt Assembly:**
   - Injects the classroom's custom syllabus rubric (e.g., *"Deduct 1 mark for missing units, award partial credit for quadratic formula substitution"*).
   - Injects strict OCR instructions to prevent hallucination.
   - Enforces JSON output matching the `VisionEvaluation` TypeScript schema (`score`, `maxScore`, `percentage`, `confirmedStrengths`, `watchOutAreas`, `overallFeedback`, `detailedAnalysis`).
4. **Instant Persistence & Auto-Navigation:** Saves the evaluation to `evaluations`, updates the student's `student_profiles` record, and immediately navigates directly to the student's profile page (`/students/:id`).

### C. Longitudinal Analytics Engine (`analyzeStudentHistory` in `storage.ts`)
Tracks student performance across multiple exams by indexing errors chronologically:
- **`recurring`:** A mistake that appeared in consecutive recent tests or has re-emerged.
- **`improving`:** A mistake present in the previous test that was avoided in the latest test.
- **`resolved`:** A mistake absent across the last 2+ consecutive tests.
- **`single` / `new`:** A mistake introduced for the first time on the latest test.
- **`stable` Strengths:** Core competencies confirmed across multiple exams.

### D. Daily Practice Problems (DPP) Generator
1. Accessed on `/students/:id`.
2. Inspects the student's active recurring mistakes from past evaluations.
3. Calls the vision/language AI model to construct a bespoke **3–5 question remedial worksheet** targeting those exact conceptual flaws, complete with hints and step-by-step solutions.
4. Persists the worksheet to Supabase inside `student_profiles.dpps`.

---

## 6. Development & Deployment Guidelines

### Critical Rules (from `AGENTS.md`)
- **Lovable.dev Integration:** Never force push (`git push -f`), rebase, or squash commits on `main`. It will corrupt the history on Lovable's sync bridge.
- **UUID Compliance:** All PostgreSQL entity IDs (`classrooms`, `students`, `evaluations`) must be valid RFC4122 UUID strings (`crypto.randomUUID()`). Plain strings like `class-1718` will trigger Postgres syntax error `22P02`.
- **Foreign Key Constraints:** The `user_id` on any inserted entity must exist in `auth.users`.

### Local Development Commands
```bash
# Install dependencies
bun install   # or npm install

# Start local dev server
npm run dev   # or vite dev (runs on http://localhost:5173)

# Build for production
npm run build # runs vite build -> generates .output/public bundle
```
