$rsc = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Raw -Encoding utf8

# Look for JSON objects or arrays in rsc
Write-Output "Length: $($rsc.Length)"

# Let's search for category lists and entities
$categories = [regex]::Matches($rsc, '\{"id":"[^"]+","name":"[^"]+","count":\d+\}')
Write-Output "Found categories: $($categories.Count)"

# Let's search for timeline events or items in RSC
$timelineMatches = [regex]::Matches($rsc, '\{"id":"[^"]*","title":"[^"]*","date":"[^"]*"[^}]*\}')
Write-Output "Found timeline regex matches: $($timelineMatches.Count)"

# Let's see some sample strings
$rsc.Substring(0, [Math]::Min(2000, $rsc.Length))
