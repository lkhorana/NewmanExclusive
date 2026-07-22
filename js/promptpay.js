/**
 * PromptPay QR payload generator (Thai QR Payment standard / EMVCo).
 * Works entirely client-side — no backend needed to generate the QR.
 *
 * Usage:
 *   const payload = generatePromptPayPayload('0812345678', 1500.00);
 *   // then render `payload` as a QR code with the qrcode.js library
 */

function formatPromptPayTarget(id) {
  const digits = id.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    // Mobile number -> country code 66 + number without leading 0, padded to 13
    const local = digits.substring(1);
    const withCountry = ('66' + local).padStart(13, '0');
    return { tag: '01', value: withCountry };
  }
  if (digits.length === 13) {
    // National ID or Tax ID
    return { tag: '02', value: digits };
  }
  throw new Error('PromptPay ID must be a 10-digit mobile number or 13-digit Tax/National ID');
}

function tlv(tag, value) {
  const length = value.length.toString().padStart(2, '0');
  return `${tag}${length}${value}`;
}

function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * @param {string} promptPayId - phone number (10 digit) or Tax/National ID (13 digit)
 * @param {number|null} amount - amount in THB, or null/undefined for an open-amount QR
 * @returns {string} the full PromptPay payload string to encode as a QR code
 */
function generatePromptPayPayload(promptPayId, amount) {
  const target = formatPromptPayTarget(promptPayId);
  const merchantAccountInfo =
    tlv('00', 'A000000677010111') + tlv(target.tag, target.value);

  let payload = '';
  payload += tlv('00', '01');                          // Payload Format Indicator
  payload += tlv('01', amount ? '12' : '11');           // 12 = dynamic (has amount), 11 = static
  payload += tlv('29', merchantAccountInfo);            // Merchant account info (PromptPay)
  payload += tlv('53', '764');                          // Currency: THB
  if (amount) {
    payload += tlv('54', Number(amount).toFixed(2));    // Transaction amount
  }
  payload += tlv('58', 'TH');                           // Country code
  payload += '6304';                                    // CRC tag + length placeholder
  const crc = crc16(payload);
  return payload + crc;
}

/**
 * Renders a PromptPay QR into a container element.
 * Requires the qrcode.js library (loaded via CDN in the HTML page).
 */
function renderPromptPayQR(containerEl, promptPayId, amount) {
  containerEl.innerHTML = '';
  const payload = generatePromptPayPayload(promptPayId, amount);
  new QRCode(containerEl, {
    text: payload,
    width: 220,
    height: 220,
    correctLevel: QRCode.CorrectLevel.M
  });
  return payload;
}
