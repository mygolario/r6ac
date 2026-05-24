$files = Get-ChildItem -Path "c:\R6AC-Project\apps\agent\R6AC.Agent" -Recurse -Filter "*.cs"
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    if ($content -match "new DetectionResult\(") {
        $modified = $false
        
        # Regex to add Severity after Type if missing
        $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, "(Type:\s*.*?,)\s*(?!Severity:)", "`$1`r`n                        Severity: R6AC.Agent.Core.DetectionSeverity.Flag,`r`n                        ")
        
        if ($content -ne $newContent) {
            $content = $newContent
            $modified = $true
        }
        
        # In AgentService.cs, Evidence might be missing
        if ($f.Name -eq "AgentService.cs") {
            $newContent2 = [System.Text.RegularExpressions.Regex]::Replace($content, "(DescriptionFA:\s*.*?)\r\n\s*\)", "`$1,`r`n                        Evidence: new System.Collections.Generic.Dictionary<string, object>()`r`n                    )")
            if ($content -ne $newContent2) {
                $content = $newContent2
                $modified = $true
            }
        }
        
        if ($modified) {
            Set-Content $f.FullName $content -NoNewline
            Write-Host "Updated $($f.Name)"
        }
    }
}
