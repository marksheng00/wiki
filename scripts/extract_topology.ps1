$rsc = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Raw -Encoding utf8

# Let's find "topology":[ ... ]
$topIdx = $rsc.IndexOf('"topology":')
if ($topIdx -ge 0) {
    Write-Output "Found topology at $topIdx"
    # Find matching closing bracket for array
    $start = $topIdx + 11
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
        Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\topology_extracted.json" -Value $jsonStr -Encoding utf8
        Write-Output "Successfully saved topology. Length: $($jsonStr.Length)"
    }
}
