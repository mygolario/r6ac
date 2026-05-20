param(
  [string]$BaseUrl = "http://localhost:3001"
)

Write-Host "🚀 R6AC Load Test Suite" -ForegroundColor Cyan
Write-Host "Target: $BaseUrl" -ForegroundColor Yellow

$tests = @(
  @{ name = "Auth Endpoints";        file = "auth.load.ts" },
  @{ name = "Tournament API";        file = "tournament.load.ts" },
  @{ name = "Report Ingestion";      file = "reports.load.ts" }
)

$results = @()

foreach ($test in $tests) {
  Write-Host "`n▶ Running: $($test.name)" -ForegroundColor Green
  
  $output = k6 run `
    --env BASE_URL=$BaseUrl `
    --summary-export "results/$($test.file).json" `
    "apps/api/tests/load/$($test.file)" 2>&1
  
  $passed = $LASTEXITCODE -eq 0
  $results += @{ 
    name = $test.name
    passed = $passed 
    output = $output
  }
  
  if ($passed) {
    Write-Host "  ✅ PASSED" -ForegroundColor Green
  } else {
    Write-Host "  ❌ FAILED" -ForegroundColor Red
    Write-Host $output
  }
}

Write-Host "`n📊 Load Test Results:" -ForegroundColor Cyan
foreach ($r in $results) {
  $icon = if ($r.passed) { "✅" } else { "❌" }
  Write-Host "  $icon $($r.name)"
}

$failed = ($results | Where-Object { -not $_.passed }).Count
exit $failed
