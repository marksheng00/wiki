$indexHtml = Get-Content "c:\Users\marks\OneDrive\桌面\wiki\index.html" -Raw -Encoding utf8
$appJs = Get-Content "c:\Users\marks\OneDrive\桌面\wiki\app.js" -Raw -Encoding utf8
$wikiStore = Get-Content "c:\Users\marks\OneDrive\桌面\wiki\data\wiki_store.js" -Raw -Encoding utf8
$styleCss = Get-Content "c:\Users\marks\OneDrive\桌面\wiki\style.css" -Raw -Encoding utf8

Write-Output "index.html: $($indexHtml.Length) chars"
Write-Output "app.js: $($appJs.Length) chars"
Write-Output "wiki_store.js: $($wikiStore.Length) chars"
Write-Output "style.css: $($styleCss.Length) chars"

# Check all vendor files in assets/vendor
$vendorFiles = Get-ChildItem "c:\Users\marks\OneDrive\桌面\wiki\assets\vendor"
Write-Output "`nVendor Files ($($vendorFiles.Count)):"
$vendorFiles | Select-Object Name, Length | Format-Table -AutoSize

# Check assets/images
$imgCount = (Get-ChildItem "c:\Users\marks\OneDrive\桌面\wiki\assets\images").Count
Write-Output "Total local images: $imgCount"
