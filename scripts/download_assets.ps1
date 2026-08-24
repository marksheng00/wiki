# Create directories
New-Item -ItemType Directory -Force -Path "c:\Users\marks\OneDrive\桌面\wiki\data" | Out-Null
New-Item -ItemType Directory -Force -Path "c:\Users\marks\OneDrive\桌面\wiki\assets\images" | Out-Null
New-Item -ItemType Directory -Force -Path "c:\Users\marks\OneDrive\桌面\wiki\assets\icons" | Out-Null

$domain = "https://readifyai.com"
$rsc = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\rsc_payload.txt" -Raw -Encoding utf8
$html = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\raw_page.html" -Raw -Encoding utf8

# Extract all image URLs from rsc and html
$imgPattern = '(/wiki-file/[^"\)\\]+|\bhttps?://[^"\s\)]+\.(?:jpg|jpeg|png|svg|webp))'
$imgs = @()
$imgs += [regex]::Matches($rsc, $imgPattern) | ForEach-Object { $_.Value }
$imgs += [regex]::Matches($html, $imgPattern) | ForEach-Object { $_.Value }
$imgs = $imgs | Select-Object -Unique

Write-Output "Total unique images to process: $($imgs.Count)"

$downloaded = 0
$failed = 0

foreach ($img in $imgs) {
    $cleanImg = $img.Trim()
    if ($cleanImg.StartsWith("/")) {
        $fullUrl = $domain + $cleanImg
    } else {
        $fullUrl = $cleanImg
    }
    
    $fileName = [System.IO.Path]::GetFileName($cleanImg.Split('?')[0])
    $destPath = Join-Path "c:\Users\marks\OneDrive\桌面\wiki\assets\images" $fileName
    
    if (-not (Test-Path $destPath)) {
        try {
            Invoke-WebRequest -Uri $fullUrl -OutFile $destPath -UseBasicParsing -TimeoutSec 15
            $downloaded++
            if ($downloaded % 10 -eq 0) {
                Write-Output "Downloaded $downloaded images..."
            }
        } catch {
            $failed++
            Write-Output "Failed to download $fullUrl : $($_.Exception.Message)"
        }
    } else {
        $downloaded++
    }
}

Write-Output "Image download complete: $downloaded downloaded/cached, $failed failed."
