# Fix assoCAIte back to associate
$files = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx,*.js,*.jsx | Where-Object { $_.FullName -notlike '*node_modules*' }
$count = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { continue }

    $newContent = $content -replace 'assoCAIte', 'associate'

    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        $count++
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host "`nTotal files updated: $count"
