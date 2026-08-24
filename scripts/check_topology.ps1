$json = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\topology_extracted.json" -Raw -Encoding utf8 | ConvertFrom-Json
Write-Output "Total nodes in topology: $($json.Count)"
$json | Group-Object type | Select-Object Name, Count | Format-Table -AutoSize
Write-Output "Sample node:"
$json[0] | ConvertTo-Json -Depth 5
