$w = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\scripts\winston_sample.html" -Raw -Encoding utf8

# Check article or text in Winston page HTML
$w | Select-String -Pattern '(?s)<article.*?</article>' | ForEach-Object {
    $txt = $_.Matches[0].Value -replace '<[^>]+>', ' ' -replace '\s+', ' '
    Write-Output "Winston Article text sample (first 1000 chars):"
    Write-Output $txt.Substring(0, [Math]::Min(1000, $txt.Length))
}

$sf = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\scripts\storyflow_sample.html" -Raw -Encoding utf8
$sf | Select-String -Pattern '(?s)<main.*?</main>' | ForEach-Object {
    $txt2 = $_.Matches[0].Value -replace '<[^>]+>', ' ' -replace '\s+', ' '
    Write-Output "`nStoryFlow 1 Main text sample (first 1000 chars):"
    Write-Output $txt2.Substring(0, [Math]::Min(1000, $txt2.Length))
}
