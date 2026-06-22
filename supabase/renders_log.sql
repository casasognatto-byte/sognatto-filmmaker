-- Tabela de registro de renders, para acompanhar o consumo de créditos do Creatomate
-- Rode este SQL uma vez no Supabase → SQL Editor

create table if not exists renders_log (
  id uuid primary key default gen_random_uuid(),
  render_id text,
  width integer,
  height integer,
  frame_rate integer,
  duracao numeric,        -- duração do vídeo em segundos
  creditos numeric,       -- créditos estimados (fórmula oficial Creatomate)
  titulo text,
  created_at timestamptz default now()
);

create index if not exists idx_renders_mes
  on renders_log (created_at desc);
