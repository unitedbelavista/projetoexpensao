# App de Arrecadação — Projeto de Expansão Igreja United Bela Vista

App próprio para substituir a lista de casamento do iCasei usada hoje como
gambiarra. Duas partes:

1. **Página pública** (`/`): mostra o texto de apresentação do projeto e os
   pilares da igreja, lista os itens que a igreja precisa comprar (com
   foto), mostra quanto já foi arrecadado x meta de cada um, e deixa
   qualquer pessoa registrar uma oferta do valor que quiser e pagar **via
   Pix**, direto pelo app do banco.
2. **Painel administrativo** (`/admin`): login com senha única
   compartilhada; permite editar **tudo** da página inicial sem precisar de
   código — textos, foto de fundo, fontes, pilares, chave Pix (com QR
   Code), aviso de valor e itens (com upload de foto) — confirma
   manualmente as ofertas depois que o Pix cair na conta da igreja, e
   mostra o total arrecadado/pendente/faltante por item e no geral.

Chave Pix oficial da igreja (editável no painel admin, já configurada como
padrão): `belavista@igrejaunited.com`.

> **Aviso dos R$ 0,11**: para a igreja conseguir identificar que um Pix é
> referente a este projeto (já que não há gateway de pagamento avisando
> automaticamente), a página pede para quem for ofertar somar R$ 0,11 ao
> valor pretendido (ex: para ofertar R$ 1,00, pagar R$ 1,11). Esse aviso e
> os botões de valor sugerido já vêm com os centavos inclusos, e o texto do
> aviso é editável no painel.

## Como funciona por baixo dos panos

- **Frontend**: HTML/CSS/JS puro (sem framework), na pasta `public/`,
  seguindo a identidade visual da United (terracota `#7D3E2E`, marrom
  escuro `#3D2B1F`, tons de creme/taupe). Fontes padrão: **Playfair
  Display** (títulos) e **Montserrat** (corpo) — carregadas do Google
  Fonts e trocáveis pelo painel admin (ver "Editar o texto, as fontes, o
  fundo e as fotos" abaixo).
- **Backend**: Netlify Functions (Node.js, serverless), na pasta
  `netlify/functions/`.
- **Banco de dados**: Supabase (Postgres gratuito na nuvem).
- **Conteúdo editável**: título, texto de introdução, foto de fundo,
  pilares, fontes, chave Pix (+ nome/cidade do recebedor para o QR Code) e
  texto do aviso de valor — tudo fica guardado na tabela `site_content`
  (uma linha só) e é editado na seção "Conteúdo da página inicial" do
  painel admin.
- **Fotos e foto de fundo**: o painel admin faz upload direto da imagem
  (sem precisar hospedar em outro lugar) para o Supabase Storage, no
  bucket público `item-images` — fotos de item ficam em `item-images/items/`
  e a foto de fundo da página em `item-images/site/`.
- **QR Code Pix**: gerado no navegador (sem depender de API externa) a
  partir da chave Pix + nome/cidade do recebedor, seguindo o padrão **BR
  Code / EMV do Banco Central** — o mesmo formato que qualquer app de
  banco reconhece ao escanear. A biblioteca de geração do QR Code
  (`qrcode-generator`, MIT, de Kazuhiko Arase) está vendorizada localmente
  em `public/js/vendor/qrcode.js`, sem depender de CDN.
- **Efeito 3D dos pilares**: puramente visual (CSS + JS em
  `public/js/main.js`), sem nenhuma configuração — os cards inclinam
  suavemente acompanhando o mouse.
- **Pagamentos**: **Pix manual, sem gateway de pagamento**. Quando alguém
  clica em "Ofertar", o app só registra a intenção de oferta como
  "pendente" no banco e mostra a chave Pix da igreja para a pessoa copiar e
  pagar direto pelo app do banco dela. Como não existe integração com
  banco/gateway nenhum, ninguém confirma o pagamento automaticamente — é o
  **administrador que confere o Pix na conta da igreja e confirma a oferta
  no painel** (botão "Confirmar recebimento"). Só depois dessa confirmação
  o valor entra no total arrecadado do item.

> **Por que não usar um gateway de pagamento (Mercado Pago, etc.)?** A
> igreja decidiu não abrir conta em gateway nenhum por enquanto, então o
> app foi simplificado para não depender disso: sem gateway, sem taxas por
> transação, sem token de API para gerenciar. A única "manutenção" extra é
> o administrador clicar em "Confirmar recebimento" depois de ver o Pix
> cair na conta do banco — leva poucos segundos por oferta. Se um dia a
> igreja quiser voltar a ter confirmação automática, dá para reintroduzir
> um gateway (Mercado Pago, Asaas, etc.) trocando só o endpoint
> `netlify/functions/register-offer.js` por uma versão que crie a cobrança
> no gateway escolhido — o resto do app (banco, painel admin, página
> pública) continua igual.

## Passo a passo para colocar no ar

### 1. Criar o banco de dados (Supabase)

1. Crie uma conta gratuita em https://supabase.com e um novo projeto.
2. Vá em **SQL Editor > New query**, cole o conteúdo de `sql/schema.sql` e
   rode.
3. (Opcional) Rode também `sql/seed.sql` para já cadastrar os 2 itens que
   estão hoje no iCasei (Projetor Epson e Lente Sigma). Se preferir, pode
   cadastrar tudo depois pelo próprio Painel Admin.
4. Volte no **SQL Editor > New query**, cole o conteúdo de
   `sql/content_and_storage.sql` e rode. Isso cria a tabela com os textos
   editáveis da página inicial (já com os pilares preenchidos) e o bucket
   `item-images` onde as fotos dos itens são guardadas.
5. Rode também `sql/phase6_editable_branding.sql` (só uma vez) — adiciona
   os campos novos de foto de fundo, fontes, Pix (chave, nome e cidade do
   recebedor) e o texto do aviso de valor na tabela `site_content`. Se
   você já tinha rodado esse app antes da Fase 6, é só rodar este arquivo
   a mais; não precisa refazer os passos anteriores.
6. Em **Project Settings > API**, copie:
   - `Project URL` → variável `SUPABASE_URL`
   - `service_role` key (não é a `anon` key!) → variável
     `SUPABASE_SERVICE_ROLE_KEY`

### 2. Configurar o Painel Admin

Defina duas variáveis:

- `ADMIN_PASSWORD`: a senha única que a liderança vai usar para entrar em
  `/admin`.
- `ADMIN_JWT_SECRET`: uma string aleatória longa (ex: gere uma em
  https://generate-secret.vercel.app/32) — é só para assinar a sessão de
  login, ninguém precisa saber ou guardar isso além do servidor.

### 3. Publicar no Netlify

1. Suba esta pasta para um repositório no GitHub (ou arraste a pasta
   direto no painel do Netlify, em "Deploy manually").
2. No Netlify, **New site from Git**, aponte para o repositório. O
   `netlify.toml` já diz onde estão o site (`public/`) e as functions
   (`netlify/functions/`) — não precisa de comando de build.
3. Em **Site settings > Environment variables**, cadastre as 4 variáveis
   do `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `ADMIN_JWT_SECRET`
4. Faça o deploy (o Netlify já dispara um automaticamente depois de salvar
   as variáveis, ou clique em "Trigger deploy").

### 4. Domínio próprio da igreja

Quando quiser usar o domínio da igreja, vá em **Domain settings** no
Netlify e siga o passo a passo de adicionar um domínio customizado (aponta
o DNS do domínio para o Netlify).

### 5. Testar antes de divulgar

1. Acesse a página pública e clique em "Ofertar" em um item, preencha um
   valor e registre a oferta — você deve ver a tela de sucesso com a chave
   Pix e o botão de copiar.
2. Acesse `/admin`, entre com a senha, confirme que a oferta aparece como
   "pending" na tabela de ofertas.
3. Clique em "Confirmar recebimento" nessa oferta de teste e veja o valor
   entrar no total arrecadado do item. Depois pode excluir essa oferta de
   teste direto no Supabase (tabela `contributions`) ou deixar como
   histórico.
4. Confirme que dá para cadastrar/editar/ocultar/excluir itens pelo
   painel, incluindo enviar uma foto pelo campo "Foto do item".
5. Na seção "Conteúdo da página inicial" do painel, altere um texto (ou
   adicione um pilar), clique em "Salvar conteúdo" e recarregue a página
   pública para confirmar que a mudança apareceu.
6. Ainda nessa seção, envie uma foto de fundo, troque as fontes e/ou
   edite a chave Pix, nome e cidade do recebedor — salve e recarregue a
   página pública para ver o fundo, as fontes e o novo QR Code do Pix.
7. Abra a página pública num celular e escaneie o QR Code do Pix com o
   app do seu banco, só para confirmar que ele reconhece a chave
   corretamente antes de divulgar para a congregação.

## Rotina do administrador (confirmar ofertas)

Sempre que alguém registrar uma oferta no site, ela aparece em `/admin`
com status **pending**. O fluxo esperado é:

1. Verificar os Pix recebidos na conta do banco da igreja.
2. Para cada Pix que bater com uma oferta pendente (mesmo valor,
   aproximadamente na mesma data), clicar em **"Confirmar recebimento"**
   ao lado dela na tabela "Últimas ofertas".
3. Se uma oferta pendente nunca for paga (a pessoa desistiu, por exemplo),
   pode clicar em **"Rejeitar"** para tirá-la da lista de pendências —
   isso não conta nem como arrecadado nem como pendente.

Só ofertas com status **approved** entram no valor arrecadado mostrado na
página pública e nos totais do painel.

## Editar o texto, as fontes, o fundo e as fotos

Tudo isso é feito pelo painel `/admin`, sem precisar mexer em código:

- **Texto de apresentação e pilares**: na seção "Conteúdo da página
  inicial", edite o título, o texto de introdução e o título/texto de cada
  pilar. Dá para adicionar ou remover pilares com os botões "+ Adicionar
  pilar" / "Remover pilar".
- **Foto de fundo da página inicial**: no campo "Foto de fundo da página
  inicial", escolha uma imagem do computador (JPG, PNG, WEBP ou GIF, até
  4MB). Se quiser voltar para a cor terracota padrão, clique em "Remover
  foto de fundo".
- **Fontes do site**: escolha a fonte dos títulos e a fonte do corpo de
  texto nos campos "Fonte dos títulos" / "Fonte do corpo de texto" — a
  lista já vem com Playfair Display, Montserrat e outras opções do Google
  Fonts. A troca vale tanto para a página pública quanto para o painel.
- **Chave Pix e QR Code**: no bloco "Pix", edite a chave Pix, o nome e a
  cidade do recebedor (esses dois últimos aparecem dentro do QR Code, por
  exigência do padrão do Banco Central — até 25 e 15 caracteres
  respectivamente) e o texto de introdução da seção de Pix. A página
  pública e a tela de sucesso da oferta atualizam a chave, o texto e o QR
  Code automaticamente.
- **Aviso sobre o valor da oferta**: edite o texto do aviso "Muito
  Importante" que aparece acima do campo de valor no formulário de oferta
  (por padrão, pede para somar R$ 0,11 ao valor pretendido).
- Depois de qualquer alteração acima, clique em "Salvar conteúdo" para
  publicar — a mudança aparece na hora na página pública (é só
  recarregar).
- **Fotos dos itens**: ao criar ou editar um item, use o campo "Foto do
  item" para escolher uma imagem do computador (JPG, PNG, WEBP ou GIF, até
  4MB) — ela é enviada automaticamente e uma prévia aparece antes de você
  salvar. Se preferir, ainda dá para colar o link de uma imagem já
  hospedada em outro lugar no campo "URL da imagem" logo abaixo.

## Estrutura de pastas

```
public/                  → site estático (página pública + admin)
  index.html
  admin.html
  css/
  js/
    fonts.js              → lista de fontes do Google Fonts + helpers de carregamento
    pix-qrcode.js          → gera o payload BR Code/EMV do Pix + desenha o QR Code
    main.js
    admin.js
    vendor/
      qrcode.js            → biblioteca vendorizada (qrcode-generator, MIT) usada pelo pix-qrcode.js
netlify/functions/       → backend (serverless)
  items.js               → GET público: lista itens + valor arrecadado
  site-content.js         → GET público: título, texto, fundo, fontes, pilares e dados do Pix
  register-offer.js      → POST público: registra a oferta como "pending"
  admin-login.js         → POST: login do painel (senha única)
  admin-logout.js        → POST: logout
  admin-session.js       → GET: verifica se a sessão admin está válida
  admin-items.js         → GET/POST/PUT/DELETE protegidos: gerenciar itens
  admin-contributions.js → PUT/DELETE protegidos: confirmar/rejeitar/excluir ofertas
  admin-summary.js       → GET protegido: totais e lista de ofertas
  admin-site-content.js   → PUT protegido: editar título/texto/fundo/fontes/pilares/Pix
  admin-upload-image.js   → POST protegido: envia foto de item ou de fundo pro Storage
  _shared/                → código compartilhado entre as functions acima
sql/
  schema.sql                     → cria as tabelas items/contributions no Supabase
  seed.sql                       → (opcional) já cadastra os 2 itens atuais
  content_and_storage.sql        → cria a tabela site_content + o bucket item-images
  phase6_editable_branding.sql   → adiciona os campos de fundo/fontes/Pix/aviso
```

## Segurança

- A `SUPABASE_SERVICE_ROLE_KEY` só existe dentro das Netlify Functions
  (roda no servidor) — nunca aparece no navegador do visitante.
- O app nunca recebe, processa ou armazena número de cartão, senha
  bancária ou qualquer dado sensível de pagamento — a pessoa que oferta
  paga direto no app do banco dela, usando só a chave Pix pública da
  igreja.
- O login do admin usa um cookie de sessão assinado (`HttpOnly`, `Secure`),
  válido por 12 horas.
- Como a confirmação é manual, vale reforçar com quem for administrar: só
  confirmar uma oferta depois de ver o Pix correspondente realmente
  chegar na conta do banco da igreja.
- O upload de fotos e a edição do texto/pilares também exigem estar
  logado no painel — visitantes da página pública não conseguem alterar
  nada, só ver o conteúdo já publicado.
