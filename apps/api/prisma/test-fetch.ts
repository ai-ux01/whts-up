async function testFetch() {
  const url = 'https://graph.facebook.com/v21.0/me';
  try {
    console.log('Testing native fetch to Meta Graph API...');
    const res = await fetch(url);
    console.log('Response Status:', res.status);
    console.log('Response Status Text:', res.statusText);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err: any) {
    console.error('Fetch caught error:', err);
    console.error('Error properties:', Object.getOwnPropertyNames(err));
    if (err.cause) {
      console.error('Error cause:', err.cause);
      console.error('Error cause properties:', Object.getOwnPropertyNames(err.cause));
    }
  }
}

testFetch();
