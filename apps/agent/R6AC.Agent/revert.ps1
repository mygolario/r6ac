$files = Get-ChildItem -Path "c:\R6AC-Project\apps\agent\R6AC.Agent" -Recurse -Filter "*.cs"
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, "\r\n\s*Severity: R6AC\.Agent\.Core\.DetectionSeverity\.Flag,", "")
    if ($content -ne $newContent) {
        Set-Content $f.FullName $newContent -NoNewline
        Write-Host "Reverted Severity $($f.Name)"
    }
}
