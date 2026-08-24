$urls = @(
    "https://readifyai.com/books/%E4%B8%80%E4%B9%9D%E5%85%AB%E5%9B%9B",
    "https://readifyai.com/zh/books/%E4%B8%80%E4%B9%9D%E5%85%AB%E5%9B%9B",
    "https://readifyai.com/en/books/Nineteen%20Eighty-Four/wiki/Winston%20Smith",
    "https://readifyai.com/books/Nineteen%20Eighty-Four/storyflow/story-flow-doc-books-001-1984-1-87b0ec8f36ec"
)

foreach ($u in $urls) {
    try {
        $res = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 10
        Write-Output "[$($res.StatusCode)] $u (Length: $($res.Content.Length))"
    } catch {
        Write-Output "Failed $u : $($_.Exception.Message)"
    }
}
