-- Permite exigir (ou nao) o nome de quem esta ofertando no formulario
-- publico. Controlado por um toggle no painel admin ("Exigir nome de
-- quem esta ofertando"). Padrao: true (nome obrigatorio), que e o
-- comportamento que a igreja pediu para comecar a usar agora.

alter table site_content
  add column if not exists require_payer_name boolean not null default true;

update site_content
set require_payer_name = coalesce(require_payer_name, true)
where id = 1;
