-- Fase 6b: valores sugeridos editaveis no botao de oferta.
-- Rode isso no SQL Editor do Supabase, depois de ja ter rodado
-- phase6_editable_branding.sql. Seguro rodar de novo (idempotente).
--
-- Adiciona:
--   suggested_amounts -> lista de valores (R$) que aparecem como botoes
--     de atalho no formulario de oferta (ex: 25,11 / 50,11 / 100,11 /
--     250,11), editavel na secao "Conteudo da pagina inicial" do admin.

alter table site_content
  add column if not exists suggested_amounts jsonb not null default '[25.11, 50.11, 100.11, 250.11]'::jsonb;

update site_content
set suggested_amounts = coalesce(suggested_amounts, '[25.11, 50.11, 100.11, 250.11]'::jsonb)
where id = 1;
