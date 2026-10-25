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

create or replace function match_books(
  query_embedding vector(768),
  match_count int default 10,
  filter_genre text default null,
  filter_level text default null
) returns table (id uuid, similarity float)
language sql stable as $$
  select b.id, 1 - (b.embedding <=> query_embedding) as similarity
  from books b
  where (filter_genre is null or filter_genre = any(b.genres))
    and (filter_level is null or b.level = filter_level)
  order by b.embedding <=> query_embedding
  limit match_count;
$$;

-- Enable Row Level Security
alter table books enable row level security;
alter table reading_ladders enable row level security;
alter table queries_log enable row level security;

-- RLS policies: only service role can access (no anon access)
create policy "Service role full access on books"
  on books for all
  using (auth.role() = 'service_role');

create policy "Service role full access on reading_ladders"
  on reading_ladders for all
  using (auth.role() = 'service_role');

create policy "Service role full access on queries_log"
  on queries_log for all
  using (auth.role() = 'service_role');
