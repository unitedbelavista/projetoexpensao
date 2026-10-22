-- Fase 6: campos editaveis adicionais para o painel admin ter controle
-- total sobre a pagina publica, sem precisar editar codigo.
-- Rode isso uma vez no SQL Editor do Supabase, depois de ja ter rodado
-- schema.sql e content_and_storage.sql.
--
-- Adiciona:
--   hero_background_url  -> foto de fundo da landing page (upload no admin)
--   heading_font/body_font -> fontes do Google Fonts usadas no site
--   pix_key / pix_merchant_name / pix_merchant_city -> dados usados tanto
--     no texto quanto no QR Code Pix (padrao BR Code / EMV do Banco Central)
--   pix_intro_text -> texto de introducao da secao de Pix na pagina publica
--   amount_warning_text -> aviso "Muito Importante" sobre os R$0,11 extras

alter table site_content
  add column if not exists hero_background_url text,
  add column if not exists hero_text_color text not null default '#f2ede8',
  add column if not exists heading_font text not null default 'Playfair Display',
  add column if not exists body_font text not null default 'Montserrat',
  add column if not exists pix_key text not null default 'belavista@igrejaunited.com',
  add column if not exists pix_merchant_name text not null default 'Igreja United Bela Vista',
  add column if not exists pix_merchant_city text not null default 'Sao Paulo',
  add column if not exists pix_intro_text text not null default 'Escolha um item abaixo, registre sua oferta e finalize o pagamento com a chave Pix abaixo, direto no app do seu banco — ou aponte a câmera para o QR Code.',
  add column if not exists amount_warning_text text not null default 'É necessário adicionar R$ 0,11 à sua oferta para que possamos identificar que o pagamento é para o Projeto de Expansão. Ou seja: se quiser ofertar R$ 1,00, ofereça R$ 1,11.';

-- Garante que a linha singleton (id = 1) ja exista com os novos valores
-- padrao, caso o insert original (em content_and_storage.sql) ja tenha
-- sido executado antes desta migracao.
update site_content
set
  hero_text_color = coalesce(hero_text_color, '#f2ede8'),
  heading_font = coalesce(heading_font, 'Playfair Display'),
  body_font = coalesce(body_font, 'Montserrat'),
  pix_key = coalesce(pix_key, 'belavista@igrejaunited.com'),
  pix_merchant_name = coalesce(pix_merchant_name, 'Igreja United Bela Vista'),
  pix_merchant_city = coalesce(pix_merchant_city, 'Sao Paulo')
where id = 1;
