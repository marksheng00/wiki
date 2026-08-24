# Build wiki_store.js
$masterData = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\complete_wiki_dataset.json" -Raw -Encoding utf8
$articlesManifest = Get-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\wiki_articles_manifest.json" -Raw -Encoding utf8

# Load all markdown contents into the store
$articlesMap = @{}
$mdFiles = Get-ChildItem -Path "c:\Users\marks\OneDrive\桌面\wiki\data\wiki_articles" -Filter "*.md"
foreach ($m in $mdFiles) {
    $content = Get-Content -Path $m.FullName -Raw -Encoding utf8
    $articlesMap[$m.BaseName] = $content
}

$articlesJson = $articlesMap | ConvertTo-Json -Depth 5 -Compress

# Chinese Timeline
$zhTimelinePath = "c:\Users\marks\OneDrive\桌面\wiki\data\zh_version\zh_storylines.json"
$zhTimelineJson = if (Test-Path $zhTimelinePath) { Get-Content -Path $zhTimelinePath -Raw -Encoding utf8 } else { "[]" }

$jsContent = @"
// Auto-generated 1984 Wiki Master Store
window.WIKI_STORE = {
    master: $masterData,
    articlesManifest: $articlesManifest,
    articlesContent: $articlesJson,
    zhTimeline: $zhTimelineJson
};
console.log("1984 Wiki Store Loaded Successfully!", Object.keys(window.WIKI_STORE));
"@

Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\wiki_store.js" -Value $jsContent -Encoding utf8
Write-Output "Successfully built data/wiki_store.js! File size: $((Get-Item 'c:\Users\marks\OneDrive\桌面\wiki\data\wiki_store.js').Length) bytes"
