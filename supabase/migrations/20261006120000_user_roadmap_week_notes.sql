create table if not exists public.user_roadmaps (
  user_id uuid primary key references auth.users (id) on delete cascade,
  roadmap jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_roadmaps enable row level security;

create policy "Users can read their own roadmap"
  on public.user_roadmaps for select
  using (auth.uid() = user_id);

create policy "Users can insert their own roadmap"
  on public.user_roadmaps for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own roadmap"
  on public.user_roadmaps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.user_roadmaps to authenticated;

create table if not exists public.topic_notes_week_prompts (
  user_id uuid not null references auth.users (id) on delete cascade,
  week integer not null check (week between 1 and 4),
  status text not null check (status in ('requested', 'deferred')),
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);

alter table public.topic_notes_week_prompts enable row level security;

create policy "Users can read their own week notes prompt state"
  on public.topic_notes_week_prompts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own week notes prompt state"
  on public.topic_notes_week_prompts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own week notes prompt state"
  on public.topic_notes_week_prompts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.topic_notes_week_prompts to authenticated;
