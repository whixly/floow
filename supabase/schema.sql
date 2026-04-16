-- ============================================================
-- FLOOW - Supabase Database Schema
-- Run this in your Supabase SQL Editor (supabase.com > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  accent_color text default 'Blue',
  theme text default 'light',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks
create table if not exists tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notebooks
create table if not exists notebooks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text default 'Blue',
  created_at timestamptz default now()
);

-- Notes
create table if not exists notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  notebook_id uuid references notebooks on delete set null,
  title text not null default 'Untitled Note',
  content text default '',
  is_pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Calendar Events
create table if not exists events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  color text default 'Blue',
  location text,
  created_at timestamptz default now()
);

-- Habits
create table if not exists habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  frequency text default 'daily' check (frequency in ('daily', 'weekly')),
  color text default 'Green',
  streak int default 0,
  created_at timestamptz default now()
);

-- Habit Logs
create table if not exists habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references habits on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  completed_date date not null,
  created_at timestamptz default now(),
  unique(habit_id, completed_date)
);

-- Goals
create table if not exists goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  target_date date,
  progress int default 0 check (progress >= 0 and progress <= 100),
  status text default 'active' check (status in ('active', 'completed', 'paused')),
  color text default 'Indigo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Milestones
create table if not exists milestones (
  id uuid default uuid_generate_v4() primary key,
  goal_id uuid references goals on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  is_completed boolean default false,
  created_at timestamptz default now()
);

-- Pomodoro Sessions
create table if not exists pomodoro_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  task_id uuid references tasks on delete set null,
  duration_minutes int not null,
  session_type text default 'work' check (session_type in ('work', 'short_break', 'long_break')),
  completed_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table tasks enable row level security;
alter table notebooks enable row level security;
alter table notes enable row level security;
alter table events enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table goals enable row level security;
alter table milestones enable row level security;
alter table pomodoro_sessions enable row level security;

-- Profiles
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Tasks
drop policy if exists "Users can manage own tasks" on tasks;
create policy "Users can manage own tasks" on tasks for all using (auth.uid() = user_id);

-- Notebooks
drop policy if exists "Users can manage own notebooks" on notebooks;
create policy "Users can manage own notebooks" on notebooks for all using (auth.uid() = user_id);

-- Notes
drop policy if exists "Users can manage own notes" on notes;
create policy "Users can manage own notes" on notes for all using (auth.uid() = user_id);

-- Events
drop policy if exists "Users can manage own events" on events;
create policy "Users can manage own events" on events for all using (auth.uid() = user_id);

-- Habits
drop policy if exists "Users can manage own habits" on habits;
create policy "Users can manage own habits" on habits for all using (auth.uid() = user_id);

-- Habit Logs
drop policy if exists "Users can manage own habit logs" on habit_logs;
create policy "Users can manage own habit logs" on habit_logs for all using (auth.uid() = user_id);

-- Goals
drop policy if exists "Users can manage own goals" on goals;
create policy "Users can manage own goals" on goals for all using (auth.uid() = user_id);

-- Milestones
drop policy if exists "Users can manage own milestones" on milestones;
create policy "Users can manage own milestones" on milestones for all using (auth.uid() = user_id);

-- Pomodoro Sessions
drop policy if exists "Users can manage own pomodoro sessions" on pomodoro_sessions;
create policy "Users can manage own pomodoro sessions" on pomodoro_sessions for all using (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
