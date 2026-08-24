$rsc = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Raw -Encoding utf8

# Search for keys in RSC
$keywords = @("timeline", "storyflow", "graph", "character", "location", "organization", "events", "nodes", "edges", "categories")

foreach ($kw in $keywords) {
    $idx = 0
    $count = 0
    while (($idx = $rsc.IndexOf($kw, $idx, [System.StringComparison]::OrdinalIgnoreCase)) -ge 0) {
        $count++
        if ($count -le 3) {
            $start = [Math]::Max(0, $idx - 100)
            $len = [Math]::Min(300, $rsc.Length - $start)
            Write-Output "[$kw match $count at $idx]:"
            Write-Output $rsc.Substring($start, $len)
            Write-Output "----------------------------------"
        }
        $idx += $kw.Length
    }
    Write-Output "Total matches for '$kw': $count"
    Write-Output "=================================="
}
