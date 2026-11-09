const fs = require('fs');
const dotenv = fs.readFileSync('.env', 'utf8');
const secretLine = dotenv.split('\n').find(l => l.startsWith('SUPABASE_JWT_SECRET='));
const secret = secretLine.replace('SUPABASE_JWT_SECRET=', '').trim().replace(/^"/, '').replace(/"$/, '');

const jwt = require('jsonwebtoken');
const http = require('http');

async function testJwt() {
  console.log('Testing Production JWT Lifecycle...');

  // 1. Valid Token
  const validToken = jwt.sign({
    sub: '00000000-0000-0000-0000-000000000001',
    email: '00000000-0000-0000-0000-000000000001@assistant.local',
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'supabase'
  }, secret, { algorithm: 'HS256', expiresIn: '1h' });

  const res1 = await makeRequest('/api/v1/auth/me', validToken);
  console.log('1. Valid JWT access to /auth/me -> Status:', res1.status, '(Passed:', res1.status === 200, ')');

  // 2. Expired Token
  const expiredToken = jwt.sign({
    sub: '00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    iss: 'supabase',
    exp: Math.floor(Date.now() / 1000) - 60 // expired 1 min ago
  }, secret, { algorithm: 'HS256' });

  const res2 = await makeRequest('/api/v1/auth/me', expiredToken);
  console.log('2. Expired JWT rejected -> Status:', res2.status, '(Passed:', res2.status === 401, ')');

  // 3. Bad Signature Token
  const badSigToken = jwt.sign({
    sub: '00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    iss: 'supabase'
  }, 'wrong-secret-key-12345', { algorithm: 'HS256', expiresIn: '1h' });

  const res3 = await makeRequest('/api/v1/auth/me', badSigToken);
  console.log('3. Invalid Signature JWT rejected -> Status:', res3.status, '(Passed:', res3.status === 401, ')');

  // 4. Bad Audience Token
  const badAudToken = jwt.sign({
    sub: '00000000-0000-0000-0000-000000000001',
    aud: 'unauthorized-audience',
    iss: 'supabase'
  }, secret, { algorithm: 'HS256', expiresIn: '1h' });

  const res4 = await makeRequest('/api/v1/auth/me', badAudToken);
  console.log('4. Invalid Audience JWT rejected -> Status:', res4.status, '(Passed:', res4.status === 401, ')');

  // 5. Bad Issuer Token
  const badIssToken = jwt.sign({
    sub: '00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    iss: 'attacker-issuer'
  }, secret, { algorithm: 'HS256', expiresIn: '1h' });

  const res5 = await makeRequest('/api/v1/auth/me', badIssToken);
  console.log('5. Invalid Issuer JWT rejected -> Status:', res5.status, '(Passed:', res5.status === 401, ')');

  // 6. Access Protected Domain Route /tasks with Valid JWT
  const res6 = await makeRequest('/api/v1/tasks', validToken);
  console.log('6. Valid JWT access to /tasks -> Status:', res6.status, '(Passed:', res6.status === 200, ')');
}

function makeRequest(path, bearerToken) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', err => resolve({ status: 500, error: err.message }));
    req.end();
  });
}

testJwt();

