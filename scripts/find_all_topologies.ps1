$rsc = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Raw -Encoding utf8

$idx = 0
$occ = 0
while (($idx = $rsc.IndexOf('"topology":', $idx)) -ge 0) {
    $occ++
    $start = $idx + 11
    $bracketCount = 0
    $end = -1
    for ($i = $start; $i -lt $rsc.Length; $i++) {
        if ($rsc[$i] -eq '[') { $bracketCount++ }
        elseif ($rsc[$i] -eq ']') {
            $bracketCount--
            if ($bracketCount -eq 0) {
                $end = $i
                break
            }
        }
    }
    if ($end -gt $start) {
        $jsonStr = $rsc.Substring($start, $end - $start + 1)
        try {
            $obj = $jsonStr | ConvertFrom-Json
            Write-Output "Topology block $occ at $idx : $($obj.Count) items"
            Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\topology_$occ.json" -Value $jsonStr -Encoding utf8
        } catch {
            Write-Output "Topology block $occ at $idx : JSON parse error - $($_.Exception.Message)"
        }
    }
    $idx += 11
}
