$rsc = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Raw -Encoding utf8

$idx = $rsc.IndexOf('"storyflow"')
if ($idx -ge 0) {
    Write-Output "Found 'storyflow' around $idx"
}

# Let's find links containing storyflow
$pattern = '\{[^{}]*"title":"[^"]*","description":"[^"]*"[^{}]*\}'
$matches = [regex]::Matches($rsc, $pattern)
Write-Output "Matching story items: $($matches.Count)"
foreach ($m in $matches) {
    if ($m.Value -match "Winston Smith's Rebellion|Brotherhood Trap|Ministry of Truth") {
        Write-Output "StoryFlow item: $($m.Value)"
    }
}
