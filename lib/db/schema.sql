-- Saicere Holdings — project management schema
-- Run this in the Supabase SQL Editor to bootstrap the database.

-- -------------------------------------------------------
-- Enum-like check constraints are enforced inline so we
-- stay compatible with Supabase migrations and pg_dump.
-- -------------------------------------------------------

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists tasks (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  title               text not null,
  description         text,
  status              text not null default 'backlog'
    check (status in ('backlog', 'todo', 'in_progress', 'review', 'done')),
  assignee            text,
  priority            text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  estimated_hours     real,
  acceptance_criteria text,
  source              text not null default 'manual'
    check (source in ('manual', 'brain_dump', 'github', 'slack', 'ai')),
  context             jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references tasks(id) on delete set null,
  project_id  uuid references projects(id) on delete set null,
  event_type  text not null,
  content     text not null,
  source      text not null default 'manual'
    check (source in ('manual', 'brain_dump', 'github', 'slack', 'ai')),
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists brain_dumps (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  raw_input         text not null,
  processed_actions jsonb,
  created_at        timestamptz not null default now()
);

create table if not exists briefings (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete set null,
  date            date not null default current_date,
  summary         text not null,
  accomplishments jsonb not null default '[]'::jsonb,
  blockers        jsonb not null default '[]'::jsonb,
  next_steps      jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create table if not exists integration_configs (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null unique,
  config      jsonb not null default '{}'::jsonb,
  enabled     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -------------------------------------------------------
-- Indexes
-- -------------------------------------------------------

create index if not exists idx_tasks_project_id    on tasks(project_id);
create index if not exists idx_tasks_status         on tasks(status);
create index if not exists idx_activity_project_id  on activity_log(project_id);
create index if not exists idx_activity_created_at  on activity_log(created_at);
create index if not exists idx_briefings_date       on briefings(date);

-- -------------------------------------------------------
-- Auto-update updated_at trigger
-- -------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create trigger trg_integration_configs_updated_at
  before update on integration_configs
  for each row execute function set_updated_at();
