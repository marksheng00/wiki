New-Item -ItemType Directory -Force -Path "c:\Users\marks\OneDrive\桌面\wiki\data\entities_deep" | Out-Null
New-Item -ItemType Directory -Force -Path "c:\Users\marks\OneDrive\桌面\wiki\data\storyflows_deep" | Out-Null
New-Item -ItemType Directory -Force -Path "c:\Users\marks\OneDrive\桌面\wiki\data\zh_version" | Out-Null

$domain = "https://readifyai.com"

# 1. Fetch Chinese Main Hub
Write-Output "=== 1. Fetching Chinese Main Hub ==="
$zhUrl = "$domain/zh/books/%E4%B8%80%E4%B9%9D%E5%85%AB%E5%9B%9B"
try {
    $zhHtml = (Invoke-WebRequest -Uri $zhUrl -UseBasicParsing -TimeoutSec 15).Content
    Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\zh_version\zh_main_page.html" -Value $zhHtml -Encoding utf8
    Write-Output "Chinese Hub fetched: $($zhHtml.Length) bytes"
} catch {
    Write-Output "Error fetching Chinese Hub: $($_.Exception.Message)"
}

# 2. Fetch all 3 StoryFlows
Write-Output "`n=== 2. Fetching All 3 StoryFlows ==="
$storyflows = @(
    @{ id = "story-flow-doc-books-001-1984-1-87b0ec8f36ec"; name = "Winston_Smith_Rebellion_and_Fall" },
    @{ id = "story-flow-doc-books-001-1984-2-1f158cedb3a4"; name = "The_Brotherhood_Trap" },
    @{ id = "story-flow-doc-books-001-1984-3-c77bef829093"; name = "The_Ministry_of_Truth_Falsification_Machine" }
)

foreach ($sf in $storyflows) {
    $url = "$domain/books/Nineteen%20Eighty-Four/storyflow/$($sf.id)"
    try {
        $html = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15).Content
        Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\storyflows_deep\$($sf.name).html" -Value $html -Encoding utf8
        Write-Output "Saved StoryFlow $($sf.name) ($($html.Length) bytes)"
    } catch {
        Write-Output "Failed StoryFlow $($sf.name): $($_.Exception.Message)"
    }
}

# 3. Fetch all Entities across 12 categories
Write-Output "`n=== 3. Extracting and Fetching Deep Wiki Entities ==="
# Get list of entity names from HTML links in raw_page.html
$rawHtml = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\scripts\raw_page.html" -Raw -Encoding utf8
$linkPattern = 'href="(/en/books/Nineteen%20Eighty-Four/wiki/([^"]+))"'
$matches = [regex]::Matches($rawHtml, $linkPattern)
$entityUrls = @{}

foreach ($m in $matches) {
    $relUrl = $m.Groups[1].Value
    $entityName = [System.Uri]::UnescapeDataString($m.Groups[2].Value)
    if (-not $entityUrls.ContainsKey($entityName)) {
        $entityUrls[$entityName] = $relUrl
    }
}

# Also let's extract entity labels from topologies
for ($i = 1; $i -le 12; $i++) {
    $topoPath = "c:\Users\marks\OneDrive\桌面\wiki\scripts\topology_$i.json"
    if (Test-Path $topoPath) {
        $topo = Get-Content -Path $topoPath -Raw -Encoding utf8 | ConvertFrom-Json
        foreach ($node in $topo) {
            if ($node.label -and (-not $entityUrls.ContainsKey($node.label))) {
                $encoded = [System.Uri]::EscapeDataString($node.label)
                $entityUrls[$node.label] = "/en/books/Nineteen%20Eighty-Four/wiki/$encoded"
            }
        }
    }
}

Write-Output "Found $($entityUrls.Count) total unique Wiki Entities to fetch deep content for."

$fetchedCount = 0
$failedCount = 0

foreach ($pair in $entityUrls.GetEnumerator()) {
    $name = $pair.Key
    $relUrl = $pair.Value
    $fullUrl = $domain + $relUrl
    $safeFileName = ($name -replace '[\\/:*?"<>|]', '_').Trim()
    $savePath = "c:\Users\marks\OneDrive\桌面\wiki\data\entities_deep\$safeFileName.html"
    
    if (-not (Test-Path $savePath)) {
        try {
            $eHtml = (Invoke-WebRequest -Uri $fullUrl -UseBasicParsing -TimeoutSec 10).Content
            Set-Content -Path $savePath -Value $eHtml -Encoding utf8
            $fetchedCount++
            if ($fetchedCount % 10 -eq 0) {
                Write-Output "Fetched $fetchedCount entities..."
            }
        } catch {
            $failedCount++
            # write-output "Notice: $name might not have a dedicated sub-article: $($_.Exception.Message)"
        }
    } else {
        $fetchedCount++
    }
}

Write-Output "Entities fetch finished: $fetchedCount fetched, $failedCount without dedicated pages."
