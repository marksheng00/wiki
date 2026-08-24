$html = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\raw_page.html" -Raw -Encoding utf8
$pattern = 'self\.__next_f\.push\(\[1,"(.*?)"\]\)'
$matches = [regex]::Matches($html, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

$combined = ""
foreach ($m in $matches) {
    $str = $m.Groups[1].Value
    # Unescape js string
    $str = [System.Text.RegularExpressions.Regex]::Unescape($str)
    $combined += $str
}

Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Value $combined -Encoding utf8
Write-Output "Extracted RSC payload: $($combined.Length) chars"
