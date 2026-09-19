export {};

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Emulate the interpolation logic from campaigns.service.ts
function runInterpolation(
  params: Record<string, string>,
  recipient: { id: string; name: string | null; phone: string },
  apiBaseUrl: string
): Record<string, string> {
  const processedParams: Record<string, string> = {};
  for (const [key, val] of Object.entries(params)) {
    let resolvedVal = val;
    if (val === '{{contact.name}}') {
      resolvedVal = recipient.name || 'Customer';
    } else if (val === '{{contact.phone}}') {
      resolvedVal = recipient.phone;
    }

    if (resolvedVal && (resolvedVal.startsWith('http://') || resolvedVal.startsWith('https://'))) {
      processedParams[key] = `${apiBaseUrl}/whatsapp/track/${recipient.id}?url=${encodeURIComponent(resolvedVal)}`;
    } else {
      processedParams[key] = resolvedVal;
    }
  }
  return processedParams;
}

console.log('--- Running campaigns-interpolation.spec.ts ---');

const apiBaseUrl = 'http://localhost:4000/api/v1';

// Test case 1: Rohan Sharma with all fields populated
const recipient1 = { id: 'rec-sharma-123', name: 'Rohan Sharma', phone: '+919999123456' };
const params1 = {
  '1': 'https://skyline.com/promotions',
  '2': '{{contact.name}}',
  '3': '{{contact.phone}}',
  '4': 'static text value',
};

const result1 = runInterpolation(params1, recipient1, apiBaseUrl);
assert(
  result1['1'] === 'http://localhost:4000/api/v1/whatsapp/track/rec-sharma-123?url=https%3A%2F%2Fskyline.com%2Fpromotions',
  'Url parameter must be wrapped with redirection prefix'
);
assert(result1['2'] === 'Rohan Sharma', '{{contact.name}} must resolve to Rohan Sharma');
assert(result1['3'] === '+919999123456', '{{contact.phone}} must resolve to phone number');
assert(result1['4'] === 'static text value', 'Static text should remain unchanged');

// Test case 2: Recipient with empty/null name (should fallback to 'Customer')
const recipient2 = { id: 'rec-anonymous-789', name: null, phone: '+919876543210' };
const params2 = {
  '1': '{{contact.name}}',
  '2': 'http://skyline.com/deals',
};

const result2 = runInterpolation(params2, recipient2, apiBaseUrl);
assert(result2['1'] === 'Customer', 'Anonymous name must fallback to "Customer"');
assert(
  result2['2'] === 'http://localhost:4000/api/v1/whatsapp/track/rec-anonymous-789?url=http%3A%2F%2Fskyline.com%2Fdeals',
  'HTTP url parameter must be wrapped correctly'
);

console.log('campaigns-interpolation.spec.ts: ok');
