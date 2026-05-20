import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '30s', target: 30 },
    { duration: '2m',  target: 80 },   // simulate 16 teams browsing
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // tournament list must be fast
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  // Get tournaments list
  const tourRes = http.get(`${BASE_URL}/api/v1/tournaments`);
  check(tourRes, {
    'tournaments 200': (r) => r.status === 200,
    'response < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(0.5);
}
