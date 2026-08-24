Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

public class FastDownloader
{
    public static void DownloadUrls(string[] urls, string[] filePaths, int maxConcurrency)
    {
        var handler = new HttpClientHandler() { MaxConnectionsPerServer = maxConcurrency };
        var client = new HttpClient(handler);
        client.Timeout = TimeSpan.FromSeconds(15);
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

        var semaphore = new SemaphoreSlim(maxConcurrency);
        var tasks = new List<Task>();

        for (int i = 0; i < urls.Length; i++)
        {
            var url = urls[i];
            var path = filePaths[i];

            if (File.Exists(path) && new FileInfo(path).Length > 100) continue;

            tasks.Add(Task.Run(async () =>
            {
                await semaphore.WaitAsync();
                try
                {
                    var response = await client.GetAsync(url);
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsByteArrayAsync();
                        File.WriteAllBytes(path, content);
                        Console.WriteLine("Downloaded: " + Path.GetFileName(path));
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Failed: " + url + " - " + ex.Message);
                }
                finally
                {
                    semaphore.Release();
                }
            }));
        }

        Task.WaitAll(tasks.ToArray());
    }
}
"@ -ReferencedAssemblies "System.Net.Http"

$domain = "https://readifyai.com"

# Extract all entity labels from topologies and raw_page.html
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

$urls = @()
$paths = @()

foreach ($pair in $entityUrls.GetEnumerator()) {
    $name = $pair.Key
    $relUrl = $pair.Value
    $fullUrl = $domain + $relUrl
    $safeFileName = ($name -replace '[\\/:*?"<>|]', '_').Trim() + ".html"
    $dest = Join-Path "c:\Users\marks\OneDrive\桌面\wiki\data\entities_deep" $safeFileName
    $urls += $fullUrl
    $paths += $dest
}

Write-Output "Starting parallel download for $($urls.Count) entities..."
[FastDownloader]::DownloadUrls($urls, $paths, 12)
Write-Output "Parallel download complete! Total files: $((Get-ChildItem 'c:\Users\marks\OneDrive\桌面\wiki\data\entities_deep' -Filter '*.html').Count)"
