$rsc = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Raw -Encoding utf8

$idx = $rsc.IndexOf('"timeline":')
if ($idx -ge 0) {
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
        Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\timeline_extracted.json" -Value $jsonStr -Encoding utf8
        $obj = $jsonStr | ConvertFrom-Json
        Write-Output "Successfully extracted timeline: $($obj.Count) items. File size: $($jsonStr.Length) bytes"
    }
}
