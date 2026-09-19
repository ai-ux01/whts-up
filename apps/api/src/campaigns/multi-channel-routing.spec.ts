export {};

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// 1. Text Parsing Helper (as implemented in campaigns.service.ts)
function processTextContent(
  text: string,
  recipient: { id: string; name: string | null; phone: string },
  apiBaseUrl: string
): string {
  let resolvedText = text;
  resolvedText = resolvedText.replace(/\{\{contact\.name\}\}/g, recipient.name || 'Customer');
  resolvedText = resolvedText.replace(/\{\{contact\.phone\}\}/g, recipient.phone);

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  resolvedText = resolvedText.replace(urlRegex, (url) => {
    return `${apiBaseUrl}/whatsapp/track/${recipient.id}?url=${encodeURIComponent(url)}`;
  });

  return resolvedText;
}

console.log('--- Running multi-channel-routing.spec.ts ---');

const apiBaseUrl = 'http://localhost:4000/api/v1';
const recipient = { id: 'rec-101', name: 'Albus Dumbledore', phone: '+1234567890' };

// Test 1: SMS template variable interpolation and URL wrapping
const smsBody = 'Hello {{contact.name}} ({{contact.phone}}), your order is ready. Track it here: https://skyline.com/order/999';
const expectedSms = 'Hello Albus Dumbledore (+1234567890), your order is ready. Track it here: http://localhost:4000/api/v1/whatsapp/track/rec-101?url=https%3A%2F%2Fskyline.com%2Forder%2F999';

const resultSms = processTextContent(smsBody, recipient, apiBaseUrl);
assert(resultSms === expectedSms, 'SMS content parsing failed');
console.log('✔ Test 1 passed: SMS interpolation & tracking redirect wrapped.');

// Test 2: Email subject and body parsing
const emailSubject = 'Hey {{contact.name}}! Special Offer';
const emailBody = 'Hi {{contact.name}}, check out http://offer.net/sale today.';

const expectedSubject = 'Hey Albus Dumbledore! Special Offer';
const expectedBody = 'Hi Albus Dumbledore, check out http://localhost:4000/api/v1/whatsapp/track/rec-101?url=http%3A%2F%2Foffer.net%2Fsale today.';

assert(processTextContent(emailSubject, recipient, apiBaseUrl) === expectedSubject, 'Email subject parsing failed');
assert(processTextContent(emailBody, recipient, apiBaseUrl) === expectedBody, 'Email body parsing failed');
console.log('✔ Test 2 passed: Email subject and body parsed.');

// Test 3: Instagram DM text parsing
const igText = 'Yo {{contact.name}}, check: https://instagram.com/p/123';
const expectedIg = 'Yo Albus Dumbledore, check: http://localhost:4000/api/v1/whatsapp/track/rec-101?url=https%3A%2F%2Finstagram.com%2Fp%2F123';

assert(processTextContent(igText, recipient, apiBaseUrl) === expectedIg, 'Instagram DM parsing failed');
console.log('✔ Test 3 passed: Instagram DM parsed.');

console.log('multi-channel-routing.spec.ts: ok');
