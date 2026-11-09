-- Cor de fundo de todo o site (diferente da cor do cabecalho/hero, que
-- ja existia). Fica por tras de tudo: pilares, secao de Pix, cards de
-- item e rodape. Padrao: o mesmo creme/offwhite que ja era usado como
-- fundo fixo no CSS (#f2ede8).

alter table site_content
  add column if not exists site_background_color text not null default '#f2ede8';

update site_content
set site_background_color = coalesce(site_background_color, '#f2ede8')
where id = 1;
