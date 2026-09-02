# App de Arrecadação — Projeto de Expansão Igreja United Bela Vista

App próprio para substituir a lista de casamento do iCasei usada hoje como
gambiarra. Duas partes:

1. **Página pública** (`/`): lista os itens que a igreja precisa comprar,
   mostra quanto já foi arrecadado x meta de cada um, e deixa qualquer
   pessoa ofertar o valor que quiser **via Pix**, pelo checkout do Mercado
   Pago.
2. **Painel administrativo** (`/admin`): login com senha única
   compartilhada; mostra o total arrecadado/pendente/faltante por item e no
   geral, e permite cadastrar, editar, ocultar ou excluir itens.

Chave Pix oficial da igreja (já configurada no app): `belavista@igrejaunited.com`.

## Como funciona por baixo dos panos

- **Frontend**: HTML/CSS/JS puro (sem framework), na pasta `public/`,
  seguindo a identidade visual da United (terracota `#7D3E2E`, marrom
  escuro `#3D2B1F`, tons de creme/taupe, fontes Cambria + Calibri — o
  mesmo padrão usado em `Membros_United_Bela_Vista.pptx`).
- **Backend**: Netlify Functions (Node.js, serverless), na pasta
  `netlify/functions/`.
- **Banco de dados**: Supabase (Postgres gratuito na nuvem).
- **Pagamentos**: Mercado Pago Checkout Pro, configurado para aceitar
  **somente Pix** (cartão fica desativado na tela de checkout, a pedido da
  igreja). O app nunca manuseia dado de cartão nem precisaria, já que só
  Pix está habilitado. Quando o pagamento é confirmado, o Mercado Pago
  avisa o app via webhook e o valor entra automaticamente no progresso do
  item — sem precisar mandar comprovante manualmente.

> **Sobre o gateway de pagamento**: este projeto usa o Mercado Pago (mais
> usado no Brasil, fácil de configurar), restrito a Pix. Se a liderança da
> igreja decidir usar o Asaas ou outro gateway depois, é uma troca
> isolada: só os arquivos `netlify/functions/_shared/mercadopago.js`,
> `create-preference.js` e `mp-webhook.js` precisam mudar — o resto do app
> (banco, painel admin, página pública) continua igual. A restrição a
> "somente Pix" está no bloco `payment_methods.excluded_payment_types` de
> `create-preference.js` — se um dia quiserem reativar cartão, é só
> remover esse bloco.

## Passo a passo para colocar no ar

### 1. Criar o banco de dados (Supabase)

1. Crie uma conta gratuita em https://supabase.com e um novo projeto.
2. Vá em **SQL Editor > New query**, cole o conteúdo de `sql/schema.sql` e
   rode.
3. (Opcional) Rode também `sql/seed.sql` para já cadastrar os 2 itens que
   estão hoje no iCasei (Projetor Epson e Lente Sigma). Se preferir, pode
   cadastrar tudo depois pelo próprio Painel Admin.
4. Em **Project Settings > API**, copie:
   - `Project URL` → variável `SUPABASE_URL`
   - `service_role` key (não é a `anon` key!) → variável
     `SUPABASE_SERVICE_ROLE_KEY`

### 2. Criar a conta no Mercado Pago

1. Crie/acesse uma conta Mercado Pago em nome da igreja (para o dinheiro
   cair na conta certa).
2. Acesse https://www.mercadopago.com.br/developers/panel/app e crie uma
   aplicação.
3. Copie o **Access Token de produção** → variável `MP_ACCESS_TOKEN`
   (use o de teste primeiro, se quiser simular pagamentos antes de ir ao
   ar de verdade).

### 3. Configurar o Painel Admin

Defina duas variáveis:

- `ADMIN_PASSWORD`: a senha única que a liderança vai usar para entrar em
  `/admin`.
- `ADMIN_JWT_SECRET`: uma string aleatória longa (ex: gere uma em
  https://generate-secret.vercel.app/32) — é só para assinar a sessão de
  login, ninguém precisa saber ou guardar isso além do servidor.

### 4. Publicar no Netlify

1. Suba esta pasta para um repositório no GitHub (ou arraste a pasta
   direto no painel do Netlify, em "Deploy manually").
2. No Netlify, **New site from Git**, aponte para o repositório. O
   `netlify.toml` já diz onde estão o site (`public/`) e as functions
   (`netlify/functions/`) — não precisa de comando de build.
3. Em **Site settings > Environment variables**, cadastre todas as
   variáveis do `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MP_ACCESS_TOKEN`
   - `ADMIN_PASSWORD`
   - `ADMIN_JWT_SECRET`
   - `SITE_URL` → depois do primeiro deploy, preencha com a URL que o
     Netlify gerou (ex: `https://expansao-united.netlify.app`), sem barra
     no final. Se for usar domínio próprio, atualize aqui quando o domínio
     estiver ativo.
4. Faça o deploy (o Netlify já dispara um automaticamente depois de salvar
   as variáveis, ou clique em "Trigger deploy").

### 5. Domínio próprio da igreja

Quando quiser usar o domínio da igreja, vá em **Domain settings** no
Netlify e siga o passo a passo de adicionar um domínio customizado
(aponta o DNS do domínio para o Netlify). Depois de ativo, atualize a
variável `SITE_URL` para o novo domínio.

### 6. Testar antes de divulgar

1. Acesse a página pública e clique em "Ofertar" em um item — você deve
   cair no checkout do Mercado Pago já mostrando só a opção de Pix.
2. Se estiver usando o Access Token de **teste**, use as
   [contas de teste / Pix de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/accounts)
   para simular uma oferta aprovada e confirmar que o valor aparece como
   arrecadado.
3. Acesse `/admin`, entre com a senha, confirme que o item mostra o valor
   certo e que dá para cadastrar/editar/ocultar/excluir itens.
4. Quando tudo estiver certo, troque o `MP_ACCESS_TOKEN` para o de
   **produção** e recomece a arrecadação zerada (ou apague as ofertas de
   teste direto no Supabase, tabela `contributions`).

## Estrutura de pastas

```
public/                  → site estático (página pública + admin)
  index.html
  admin.html
  css/
  js/
netlify/functions/       → backend (serverless)
  items.js               → GET público: lista itens + valor arrecadado
  create-preference.js   → POST público: cria a oferta + checkout Mercado Pago
  mp-webhook.js          → recebe a confirmação de pagamento do Mercado Pago
  admin-login.js         → POST: login do painel (senha única)
  admin-logout.js        → POST: logout
  admin-session.js       → GET: verifica se a sessão admin está válida
  admin-items.js         → GET/POST/PUT/DELETE protegidos: gerenciar itens
  admin-summary.js       → GET protegido: totais e lista de ofertas
  _shared/                → código compartilhado entre as functions acima
sql/
  schema.sql              → cria as tabelas no Supabase
  seed.sql                → (opcional) já cadastra os 2 itens atuais
```

## Segurança

- A `SUPABASE_SERVICE_ROLE_KEY` e o `MP_ACCESS_TOKEN` só existem dentro das
  Netlify Functions (rodam no servidor) — nunca aparecem no navegador do
  visitante.
- O app nunca recebe, processa ou armazena número de cartão — e como o
  checkout está restrito a Pix, nem chega a mostrar essa opção para quem
  vai ofertar.
- O login do admin usa um cookie de sessão assinado (`HttpOnly`, `Secure`),
  válido por 12 horas.
