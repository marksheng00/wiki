$w = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\scripts\winston_sample.html" -Raw -Encoding utf8
$pattern = 'self\.__next_f\.push\(\[1,"(.*?)"\]\)'
$matches = [regex]::Matches($w, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
$wRsc = ""
foreach ($m in $matches) {
    $wRsc += [System.Text.RegularExpressions.Regex]::Unescape($m.Groups[1].Value)
}
Write-Output "Winston RSC length: $($wRsc.Length)"

# Check what props Winston has
if ($wRsc -match '"profile":|\bWinston Smith\b') {
    Write-Output "Found character profile in Winston page!"
}

$sf = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\scripts\storyflow_sample.html" -Raw -Encoding utf8
$matches2 = [regex]::Matches($sf, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
$sfRsc = ""
foreach ($m in $matches2) {
    $sfRsc += [System.Text.RegularExpressions.Regex]::Unescape($m.Groups[1].Value)
}
Write-Output "StoryFlow 1 RSC length: $($sfRsc.Length)"
