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
//   58 Country Code (BR)
//   59 Merchant Name (até 25 caracteres)
//   60 Merchant City (até 15 caracteres)
//   62 Additional Data Field Template (txid)
//   63 CRC16 (CCITT-FALSE), sempre o último campo
//
// Como nenhum valor é travado no campo 54 (Transaction Amount), o QR
// funciona para qualquer valor que a pessoa decidir digitar no banco.

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

// Monta o payload completo (string "Pix Copia e Cola") pronto para virar
// QR Code. { key, merchantName, merchantCity, txid }
function buildPixPayload(opts) {
  opts = opts || {};
  var key = String(opts.key || '').trim();
  var merchantName = sanitizePixField(opts.merchantName, 25) || 'NA';
  var merchantCity = sanitizePixField(opts.merchantCity, 15) || 'NA';
  var txid = sanitizePixField(opts.txid || '***', 25) || '***';

  var merchantAccountInfo = pixTlv('26', pixTlv('00', 'BR.GOV.BCB.PIX') + pixTlv('01', key));
  var additionalData = pixTlv('62', pixTlv('05', txid));

  var payloadNoCrc =
    pixTlv('00', '01') +
    pixTlv('01', '11') +
    merchantAccountInfo +
    pixTlv('52', '0000') +
    pixTlv('53', '986') +
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
