import { api, ApiAbortError, ApiTimeoutError } from '../apps/web/src/lib/api.js';

console.log('Testing api client exports:');
console.log('ApiTimeoutError exists:', typeof ApiTimeoutError === 'function');
console.log('ApiAbortError exists:', typeof ApiAbortError === 'function');
console.log('API methods available:', Object.keys(api).length);

