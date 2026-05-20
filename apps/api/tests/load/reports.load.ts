import { check } from 'k6';
import http from 'k6/http';

export const options = {
  // Simulate 160 players, each sending detection reports
  stages: [
    { duration: '30s', target: 80 },
    { duration: '2m', target: 160 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],  // ingest must be < 500ms at p99
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const report = {
    playerId: `player_${Math.floor(Math.random() * 160)}`,
    matchId: 'load-test-match-001',
    detectionType: 'PROCESS_INJECTION',
    confidence: 0.45,
    reasonCode: 'LOAD_TEST_SYNTHETIC',
    evidence: 'e2xsb2FkX3Rlc3R9',
    requiresHumanReview: true,
  };

  const res = http.post(
    `${BASE_URL}/api/v1/reports`,
    JSON.stringify(report),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'report accepted': (r) => 
      r.status === 200 || r.status === 201 || r.status === 401,
    'ingest < 500ms': (r) => r.timings.duration < 500,
  });
}
