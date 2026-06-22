-- Tabela de feedback dos roteiros gerados pela IA
-- Rode este SQL uma vez no Supabase → SQL Editor

create table if not exists feedback_roteiros (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  duracao integer,
  briefing text not null,
  roteiro text not null,
  avaliacao text not null,   -- 'positivo' (👍) ou 'negativo' (👎)
  critica text,             -- o que faltou / o que melhorar (opcional)
  created_at timestamptz default now()
);

-- Índice para buscar rapidamente os exemplos aprovados (usados para "treinar" via exemplos)
create index if not exists idx_feedback_aprovados
  on feedback_roteiros (tipo, avaliacao, created_at desc);
