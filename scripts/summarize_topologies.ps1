for ($i = 1; $i -le 12; $i++) {
    $path = "c:\Users\marks\OneDrive\桌面\wiki\topology_$i.json"
    if (Test-Path $path) {
        $json = Get-Content -Path $path -Raw -Encoding utf8 | ConvertFrom-Json
        $types = ($json | Select-Object -ExpandProperty type -Unique) -join ", "
        $first = $json[0].label
        Write-Output "Topology $i : $($json.Count) items | Types: $types | First Item: $first"
    }
}
