$rsc = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Raw -Encoding utf8

# Find all image paths
$imgPattern = '(/wiki-file/[^"\\]+|\bhttps?://[^"\s]+\.(?:jpg|jpeg|png|svg|webp))'
$imgs = [regex]::Matches($rsc, $imgPattern) | ForEach-Object { $_.Value } | Select-Object -Unique

Write-Output "=== Found Images ($($imgs.Count)) ==="
$imgs | ForEach-Object { Write-Output $_ }

# Let's find sections, props or JSON in the RSC payload
