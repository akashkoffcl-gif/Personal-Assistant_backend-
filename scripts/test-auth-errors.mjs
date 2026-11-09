async function testAuthErrors() {
  console.log('Testing with NO auth header:');
  const res1 = await fetch('http://localhost:3001/api/v1/tasks');
  console.log('No token => status:', res1.status, await res1.text());

  console.log('Testing with invalid token:');
  const res2 = await fetch('http://localhost:3001/api/v1/tasks', {
    headers: { Authorization: 'Bearer bad_token_123' }
  });
  console.log('Bad token => status:', res2.status, await res2.text());
}
testAuthErrors();
