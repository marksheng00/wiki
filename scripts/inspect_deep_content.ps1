$winston = (Invoke-WebRequest -Uri "https://readifyai.com/en/books/Nineteen%20Eighty-Four/wiki/Winston%20Smith" -UseBasicParsing).Content
Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\scripts\winston_sample.html" -Value $winston -Encoding utf8

$sf1 = (Invoke-WebRequest -Uri "https://readifyai.com/books/Nineteen%20Eighty-Four/storyflow/story-flow-doc-books-001-1984-1-87b0ec8f36ec" -UseBasicParsing).Content
Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\scripts\storyflow_sample.html" -Value $sf1 -Encoding utf8

$zh = (Invoke-WebRequest -Uri "https://readifyai.com/zh/books/%E4%B8%80%E4%B9%9D%E5%85%AB%E5%9B%9B" -UseBasicParsing).Content
Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\scripts\zh_main_page.html" -Value $zh -Encoding utf8

Write-Output "Downloaded samples successfully!"
