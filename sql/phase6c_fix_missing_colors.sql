-- As colunas de cor do hero (hero_title_color, hero_eyebrow_color,
-- hero_lead_color) foram removidas acidentalmente da tabela site_content
-- (provavelmente durante uma edicao manual no Table Editor do Supabase).
-- Isso fazia o salvamento no painel admin falhar com erro 500 sempre que
-- qualquer campo era salvo junto com essas colunas, mesmo sem alterar as
-- cores.
--
-- Este script recria as 3 colunas (se nao existirem) com os mesmos
-- valores padrao originais, sem afetar nenhum outro dado da tabela.

alter table site_content
  add column if not exists hero_title_color text not null default '#f2ede8',
  add column if not exists hero_eyebrow_color text not null default '#b09080',
  add column if not exists hero_lead_color text not null default '#f2ede8';

update site_content
set
  hero_title_color = coalesce(hero_title_color, '#f2ede8'),
  hero_eyebrow_color = coalesce(hero_eyebrow_color, '#b09080'),
  hero_lead_color = coalesce(hero_lead_color, '#f2ede8')
where id = 1;
