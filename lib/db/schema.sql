-- BookCompass Database Schema
-- Run this in your Supabase SQL editor

create extension if not exists vector;

create table books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  genres text[] not null,
  level text not null check (level in ('beginner','intermediate','advanced')),
  complexity smallint check (complexity between 1 and 5),
  pacing text check (pacing in ('slow','medium','fast')),
  tone text[] default '{}',
  page_count int,
  description text,
  cover_url text,
  avg_rating numeric(3,2),
  google_books_id text unique,
  isbn text,
  why_start_here text,
  embedding vector(768),
  created_at timestamptz default now()
);

create index on books using gin (genres);
create index on books (level);
create index on books using hnsw (embedding vector_cosine_ops);

create table reading_ladders (
  id uuid primary key default gen_random_uuid(),
  genre text not null,
  step smallint not null,
  book_id uuid references books(id) on delete cascade,
  note text
);

create table queries_log (
  id bigint generated always as identity primary key,
  genre text,
  level text,
  created_at timestamptz default now()
);

-- User chat sessions for email-based history
create table if not exists user_chats (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  title text not null,
  genre text,
  level text,
  user_message text not null,
  books jsonb default '[]'::jsonb,
  ladder jsonb default '[]'::jsonb,
  explanation text default '',
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure messages column exists if table was created in an earlier migration
alter table user_chats add column if not exists messages jsonb default '[]'::jsonb;

create index if not exists user_chats_email_idx on user_chats (email);
create index if not exists user_chats_created_at_idx on user_chats (created_at desc);

create or replace function match_books(
  query_embedding vector(768),
  match_count int default 10,
  filter_genre text default null,
  filter_level text default null
) returns table (id uuid, similarity float)
language plpgsql
stable
as $$
begin
  return query
  select b.id, (1 - (b.embedding <=> query_embedding))::float as similarity
  from books b
  where (filter_genre is null or filter_genre = any(b.genres))
    and (filter_level is null or b.level = filter_level)
  order by b.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Enable Row Level Security
alter table books enable row level security;
alter table reading_ladders enable row level security;
alter table queries_log enable row level security;
alter table user_chats enable row level security;

-- RLS policies: allow public / anon / publishable read access on catalog
create policy "Allow public read access on books"
  on books for select
  using (true);

create policy "Allow public read access on reading_ladders"
  on reading_ladders for select
  using (true);

-- Allow inserting into queries_log
create policy "Allow insert on queries_log"
  on queries_log for insert
  with check (true);

-- Allow all operations on user_chats for anon/authenticated
create policy "Allow all on user_chats"
  on user_chats for all
  using (true)
  with check (true);

-- Allow inserting and updating books when using publishable/anon key or service role
create policy "Allow all on books for authenticated and anon"
  on books for all
  using (true)
  with check (true);

create policy "Allow all on reading_ladders for authenticated and anon"
  on reading_ladders for all
  using (true)
  with check (true);
