$rsc = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Raw -Encoding utf8

$idx2 = $rsc.IndexOf("Arrival at Victory Mansions")
if ($idx2 -ge 0) {
    $start2 = [Math]::Max(0, $idx2 - 200)
    Write-Output "Found event text at $($idx2)"
    Write-Output $rsc.Substring($start2, 600)
}
