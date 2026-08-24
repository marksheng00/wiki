$bytes = [System.IO.File]::ReadAllBytes("c:\Users\marks\OneDrive\桌面\wiki\data\pdf_news_ux_playbook.pdf")
$pdfText = [System.Text.Encoding]::ASCII.GetString($bytes)

# Find bookmarks or outline
$titleMatches = [regex]::Matches($pdfText, '/Title\s*\((.*?)\)')
Write-Output "=== Found Titles ($($titleMatches.Count)) ==="
$titleMatches | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique

# Search for sections in Google UX Playbooks:
# Usually: 1. Homepage & Landing 2. Menu & Navigation 3. Exploration & Search 4. Article Page & Readability 5. Registration & Subscriptions 6. Speed & Optimization
$sections = @(
    "Homepage", "Navigation", "Search", "Article Page", "Article", "Readability", 
    "Subscription", "Registration", "Form", "Speed", "F-shape", "Scannability",
    "Social Share", "Related Content", "Progress", "Sticky", "Typography", "Hierarchy"
)

Write-Output "`n=== Keyword matches ==="
foreach ($s in $sections) {
    $c = ([regex]::Matches($pdfText, $s, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
    Write-Output "$s : $c"
}
