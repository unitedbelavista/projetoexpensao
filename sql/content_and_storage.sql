-- Conteudo editavel da pagina publica (titulo, texto de introducao e os
-- pilares da igreja) + bucket de storage publico para as fotos dos itens.
-- Rode isso uma vez no SQL Editor do Supabase, depois de ja ter rodado
-- schema.sql.

create table if not exists site_content (
  id int primary key default 1,
  hero_title text not null default 'Projeto de Expansão',
  hero_lead text not null default 'Criado por herança, fruto e verdade, este é o Projeto de Expansão da Igreja United Bela Vista. Aqui você encontra os itens que a igreja precisa para essa próxima etapa e pode ofertar diretamente, em quantas cotas quiser — cada oferta é uma semente para o que Deus está construindo nesta casa.',
  pillars_title text not null default 'Nossos Pilares',
  pillars jsonb not null default '[
    {"title": "Nossa Fé é Fundamentada", "text": "Nossa fé é baseada na Palavra e no Espírito de Deus, e nunca poderá ser abalada. O ensino da Palavra infalível de Deus é primordial em nossos cultos."},
    {"title": "Nossa Expectativa é Excelência", "text": "Excelência é a chave para tudo que fazemos na UNITED, e sempre nos empenhamos a ir além do que é esperado, promovendo o padrão do Reino."},
    {"title": "Nosso Centro é Cristo", "text": "Ele é o foco principal, agora e sempre. Nosso propósito como igreja está enraizado nesta verdade."},
    {"title": "Nossa Generosidade é Genuína", "text": "Acreditamos que, quando todos trabalham juntos e cada um faz sua parte, não apenas o corpo é abençoado, mas almas são ganhas (Atos 2 e 4). Cada oferta para esta expansão é um reflexo desse pilar."},
    {"title": "Nosso Mandamento é Multiplicação", "text": "Deus se importa com o perdido, e nós também. Faremos tudo que pudermos para alcançar ainda mais almas para Jesus Cristo."}
  ]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_content_singleton check (id = 1)
);

insert into site_content (id) values (1) on conflict (id) do nothing;

-- Bucket publico usado pelo upload de fotos dos itens no painel admin.
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;
