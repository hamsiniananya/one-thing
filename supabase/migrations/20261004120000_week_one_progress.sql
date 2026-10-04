create table if not exists public.topic_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  week integer not null check (week between 1 and 4),
  topic_index integer not null check (topic_index >= 0),
  topic text not null check (char_length(topic) between 1 and 300),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, week, topic_index)
);

alter table public.topic_progress enable row level security;

create policy "Users can read their own topic progress"
  on public.topic_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own topic progress"
  on public.topic_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own topic progress"
  on public.topic_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.topic_progress to authenticated;

create table if not exists public.topic_notes_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null check (char_length(email) <= 320),
  week integer not null check (week between 1 and 4),
  topic text not null check (char_length(topic) between 1 and 300),
  created_at timestamptz not null default now()
);

alter table public.topic_notes_requests enable row level security;

create policy "Users can create their own notes requests"
  on public.topic_notes_requests for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own notes requests"
  on public.topic_notes_requests for select
  using (auth.uid() = user_id);

grant select, insert on public.topic_notes_requests to authenticated;

create index if not exists topic_notes_requests_user_created_idx
  on public.topic_notes_requests (user_id, created_at desc);
