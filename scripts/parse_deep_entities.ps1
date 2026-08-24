# Parse all downloaded deep entities, storyflows, and Chinese hub
$entitiesDir = "c:\Users\marks\OneDrive\桌面\wiki\data\entities_deep"
$storyflowsDir = "c:\Users\marks\OneDrive\桌面\wiki\data\storyflows_deep"
$zhHubPath = "c:\Users\marks\OneDrive\桌面\wiki\data\zh_version\zh_main_page.html"

# 1. Parse Chinese Hub
$zhData = @{}
if (Test-Path $zhHubPath) {
    $zhHtml = Get-Content -Path $zhHubPath -Raw -Encoding utf8
    $pattern = 'self\.__next_f\.push\(\[1,"(.*?)"\]\)'
    $matches = [regex]::Matches($zhHtml, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    $zhRsc = ""
    foreach ($m in $matches) {
        $zhRsc += [System.Text.RegularExpressions.Regex]::Unescape($m.Groups[1].Value)
    }
    
    # Extract Chinese timeline if present
    $tIdx = $zhRsc.IndexOf('"timeline":')
    if ($tIdx -ge 0) {
        $start = $tIdx + 11
        $bracketCount = 0
        $end = -1
        for ($i = $start; $i -lt $zhRsc.Length; $i++) {
            if ($zhRsc[$i] -eq '[') { $bracketCount++ }
            elseif ($zhRsc[$i] -eq ']') {
                $bracketCount--
                if ($bracketCount -eq 0) {
                    $end = $i
                    break
                }
            }
        }
        if ($end -gt $start) {
            $zhTimelineJson = $zhRsc.Substring($start, $end - $start + 1)
            $zhData.timeline = $zhTimelineJson | ConvertFrom-Json
            Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\zh_version\zh_storylines.json" -Value $zhTimelineJson -Encoding utf8
            Write-Output "Extracted Chinese timeline: $($zhData.timeline.Count) items"
        }
    }
}

# 2. Parse StoryFlows
$parsedStoryflows = @()
$sfFiles = Get-ChildItem -Path $storyflowsDir -Filter "*.html"
foreach ($sfFile in $sfFiles) {
    $html = Get-Content -Path $sfFile.FullName -Raw -Encoding utf8
    $pattern = 'self\.__next_f\.push\(\[1,"(.*?)"\]\)'
    $matches = [regex]::Matches($html, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    $sfRsc = ""
    foreach ($m in $matches) {
        $sfRsc += [System.Text.RegularExpressions.Regex]::Unescape($m.Groups[1].Value)
    }
    
    # Look for flowData, steps, or nodes
    $titleMatch = [regex]::Match($html, '<h1[^>]*>(.*?)</h1>')
    $sfTitle = if ($titleMatch.Success) { $titleMatch.Groups[1].Value -replace '<[^>]+>', '' } else { $sfFile.BaseName }
    
    $parsedStoryflows += @{
        id = $sfFile.BaseName
        title = $sfTitle
        file = $sfFile.Name
        size = $sfFile.Length
    }
}
$parsedStoryflows | ConvertTo-Json -Depth 5 | Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\storyflows_deep\storyflows_index.json" -Encoding utf8
Write-Output "Parsed $($parsedStoryflows.Count) deep storyflows."

# 3. Parse Deep Entities
$entityFiles = Get-ChildItem -Path $entitiesDir -Filter "*.html"
$entitiesIndex = @()
foreach ($ef in $entityFiles) {
    $html = Get-Content -Path $ef.FullName -Raw -Encoding utf8
    
    # Extract Article Title
    $titleMatch = [regex]::Match($html, '<h1[^>]*>(.*?)</h1>')
    $eTitle = if ($titleMatch.Success) { $titleMatch.Groups[1].Value -replace '<[^>]+>', '' } else { $ef.BaseName }
    
    # Extract Article Text
    $articleMatch = [regex]::Match($html, '(?s)<article[^>]*>(.*?)</article>')
    $articleText = ""
    if ($articleMatch.Success) {
        $articleText = $articleMatch.Groups[1].Value -replace '<script.*?</script>', '' -replace '<style.*?</style>', '' -replace '<[^>]+>', ' ' -replace '\s+', ' '
    }
    
    $entitiesIndex += @{
        name = $ef.BaseName
        title = $eTitle
        article_snippet = $articleText.Substring(0, [Math]::Min(300, $articleText.Length))
        file = $ef.Name
        has_content = ($articleText.Length -gt 50)
    }
}

$entitiesIndex | ConvertTo-Json -Depth 5 | Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\entities_deep\entities_index.json" -Encoding utf8
Write-Output "Parsed $($entitiesIndex.Count) deep entities ($(($entitiesIndex | Where-Object { $_.has_content }).Count) with full wiki articles)."
