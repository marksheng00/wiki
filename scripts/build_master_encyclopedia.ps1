New-Item -ItemType Directory -Force -Path "c:\Users\marks\OneDrive\桌面\wiki\data\wiki_articles" | Out-Null

$entitiesDir = "c:\Users\marks\OneDrive\桌面\wiki\data\entities_deep"
$storyflowsDir = "c:\Users\marks\OneDrive\桌面\wiki\data\storyflows_deep"

$htmlFiles = Get-ChildItem -Path $entitiesDir -Filter "*.html"
$articles = @()

foreach ($f in $htmlFiles) {
    $c = Get-Content -Path $f.FullName -Raw -Encoding utf8
    
    # Title
    $titleMatch = [regex]::Match($c, '<h1[^>]*>(.*?)</h1>')
    $title = if ($titleMatch.Success) { $titleMatch.Groups[1].Value -replace '<[^>]+>', '' } else { $f.BaseName }
    
    # Subtitle / category
    $subMatch = [regex]::Match($c, '<header[^>]*>.*?<span[^>]*>(.*?)</span>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    $subtitle = if ($subMatch.Success) { $subMatch.Groups[1].Value -replace '<[^>]+>', '' } else { "" }
    
    # Full article markdown / text
    $artMatch = [regex]::Match($c, '(?s)<article[^>]*>(.*?)</article>')
    $artHtml = if ($artMatch.Success) { $artMatch.Groups[1].Value } else { "" }
    
    # Clean text to markdown
    # Replace headers
    $artMd = $artHtml -replace '<h1[^>]*>(.*?)</h1>', "`n# `$1`n"
    $artMd = $artMd -replace '<h2[^>]*>(.*?)</h2>', "`n## `$1`n"
    $artMd = $artMd -replace '<h3[^>]*>(.*?)</h3>', "`n### `$1`n"
    $artMd = $artMd -replace '<h4[^>]*>(.*?)</h4>', "`n#### `$1`n"
    $artMd = $artMd -replace '<p[^>]*>(.*?)</p>', "`n`$1`n"
    $artMd = $artMd -replace '<li[^>]*>(.*?)</li>', "`n- `$1"
    $artMd = $artMd -replace '<script.*?</script>', ''
    $artMd = $artMd -replace '<style.*?</style>', ''
    $artMd = $artMd -replace '<[^>]+>', ''
    $artMd = [System.Net.WebUtility]::HtmlDecode($artMd)
    $artMd = ($artMd -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }) -join "`n`n"
    
    # Save standalone markdown for this entity
    $mdFileName = ($title -replace '[\\/:*?"<>|]', '_').Trim() + ".md"
    $mdPath = Join-Path "c:\Users\marks\OneDrive\桌面\wiki\data\wiki_articles" $mdFileName
    
    $mdHeader = "# $title`n`n> **分类/标签**: $subtitle  `n> **源文件**: $($f.Name)`n`n---`n`n"
    Set-Content -Path $mdPath -Value ($mdHeader + $artMd) -Encoding utf8
    
    $articles += @{
        title = $title
        subtitle = $subtitle
        content_length = $artMd.Length
        md_file = "data/wiki_articles/$mdFileName"
        sample = $artMd.Substring(0, [Math]::Min(300, $artMd.Length))
    }
}

$articles | ConvertTo-Json -Depth 5 | Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\wiki_articles_manifest.json" -Encoding utf8
Write-Output "Successfully compiled $($articles.Count) full deep wiki articles into data/wiki_articles/!"
