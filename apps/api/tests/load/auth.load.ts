import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // ramp to 20 users
    { duration: '1m',  target: 50 },   // hold 50 concurrent users
    { duration: '30s', target: 100 },  // spike to 100 (32 teams x ~3 admins)
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    errors: ['rate<0.01'],             // less than 1% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  // Test login endpoint
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, 
    JSON.stringify({ 
      username: 'test_admin', 
      password: 'TestPassword123!' 
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login status 200 or 401': (r) => 
      r.status === 200 || r.status === 401,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(loginRes.status >= 500);
  sleep(1);
}
