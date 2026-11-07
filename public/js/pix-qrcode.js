// Gera o payload "BR Code" (QR Code Pix estático, padrão EMV do Banco
// Central do Brasil) a partir da chave Pix + nome/cidade do recebedor, e
// desenha o QR Code em um elemento da página usando a biblioteca vendorizada
// em /js/vendor/qrcode.js (kazuhikoarase/qrcode-generator, MIT).
//
// Referência do formato "Pix Copia e Cola" (BR Code):
//   00 Payload Format Indicator
//   01 Point of Initiation Method
//   26 Merchant Account Information (GUI BR.GOV.BCB.PIX + chave Pix)
//   52 Merchant Category Code
//   53 Transaction Currency (986 = BRL)
//   54 Transaction Amount (opcional — quando informado, o valor já vem
//      preenchido no app do banco de quem escaneia)
//   58 Country Code (BR)
//   59 Merchant Name (até 25 caracteres)
//   60 Merchant City (até 15 caracteres)
//   62 Additional Data Field Template (txid)
//   63 CRC16 (CCITT-FALSE), sempre o último campo
//
// O campo 54 (valor) é opcional por padrão: quando não é informado, o QR
// funciona para qualquer valor que a pessoa decidir digitar no banco. Ao
// passar "amount" para buildPixPayload/renderPixQrCode, o valor fica
// embutido no QR — a maioria dos apps de banco já abre com o valor
// preenchido (alguns ainda deixam a pessoa editar antes de confirmar, mas
// reduz bastante o risco de alguém escanear e pagar um valor diferente).

function pixTlv(id, value) {
  var str = String(value == null ? '' : value);
  var len = String(str.length).padStart(2, '0');
  return id + len + str;
}

function pixStripDiacritics(str) {
  return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Deixa o texto só com A-Z, 0-9 e espaço (exigido para nome/cidade no BR
// Code), em caixa alta, e corta no tamanho máximo permitido.
function sanitizePixField(str, maxLen) {
  var cleaned = pixStripDiacritics(str)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, maxLen);
}

// CRC-16/CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF) — o checksum
// exigido pelo padrão BR Code, calculado sobre o payload inteiro incluindo
// o próprio identificador+tamanho do campo 63 (mas sem o valor do CRC).
function crc16ccitt(payload) {
  var crc = 0xFFFF;
  for (var i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (var j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc & 0xFFFF;
}

// Formata o valor para o campo 54 do BR Code: número com ponto decimal,
// sem símbolo de moeda nem separador de milhar, até 2 casas (ex: 25.11).
// Retorna '' se o valor não for um número positivo válido.
function formatPixAmount(amount) {
  var n = Number(amount);
  if (!isFinite(n) || n <= 0) return '';
  return n.toFixed(2);
}

// Monta o payload completo (string "Pix Copia e Cola") pronto para virar
// QR Code. { key, merchantName, merchantCity, txid, amount }
// "amount" é opcional: quando informado (número positivo em reais),
// embute o valor exato no QR Code (campo 54).
function buildPixPayload(opts) {
  opts = opts || {};
  var key = String(opts.key || '').trim();
  var merchantName = sanitizePixField(opts.merchantName, 25) || 'NA';
  var merchantCity = sanitizePixField(opts.merchantCity, 15) || 'NA';
  var txid = sanitizePixField(opts.txid || '***', 25) || '***';
  var amountStr = formatPixAmount(opts.amount);

  var merchantAccountInfo = pixTlv('26', pixTlv('00', 'BR.GOV.BCB.PIX') + pixTlv('01', key));
  var additionalData = pixTlv('62', pixTlv('05', txid));

  var payloadNoCrc =
    pixTlv('00', '01') +
    pixTlv('01', '11') +
    merchantAccountInfo +
    pixTlv('52', '0000') +
    pixTlv('53', '986') +
    (amountStr ? pixTlv('54', amountStr) : '') +
    pixTlv('58', 'BR') +
    pixTlv('59', merchantName) +
    pixTlv('60', merchantCity) +
    additionalData +
    '6304';

  var crc = crc16ccitt(payloadNoCrc).toString(16).toUpperCase();
  while (crc.length < 4) crc = '0' + crc;

  return payloadNoCrc + crc;
}

// Desenha o QR Code (como SVG) dentro do elemento com o id informado.
// Retorna true se desenhou, false se não havia chave Pix suficiente.
function renderPixQrCode(containerId, opts) {
  var container = document.getElementById(containerId);
  if (!container) return false;
  if (!opts || !opts.key) {
    container.innerHTML = '';
    return false;
  }
  try {
    var payload = buildPixPayload(opts);
    var qr = qrcode(0, 'M'); // typeNumber 0 = auto, nível M de correção de erro
    qr.addData(payload);
    qr.make();
    container.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
    return true;
  } catch (err) {
    container.innerHTML = '';
    return false;
  }
}
