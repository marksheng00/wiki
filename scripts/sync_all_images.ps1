Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

public class FastImageDownloader
{
    public static void Download(string[] urls, string[] filePaths, int maxConcurrency)
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
                        Console.WriteLine("Downloaded img: " + Path.GetFileName(path));
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Failed img: " + url + " - " + ex.Message);
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
$allHtmlFiles = Get-ChildItem -Path "c:\Users\marks\OneDrive\桌面\wiki\data" -Recurse -Filter "*.html"

$imgPattern = '(/wiki-file/[^"\)\\]+|\bhttps?://[^"\s\)]+\.(?:jpg|jpeg|png|svg|webp))'
$imgs = @()

foreach ($f in $allHtmlFiles) {
    $c = Get-Content -Path $f.FullName -Raw -Encoding utf8
    $imgs += [regex]::Matches($c, $imgPattern) | ForEach-Object { $_.Value }
}

$imgs = $imgs | Select-Object -Unique
Write-Output "Total unique images found across all deep pages: $($imgs.Count)"

$urls = @()
$paths = @()
foreach ($img in $imgs) {
    $cleanImg = $img.Trim()
    $fullUrl = if ($cleanImg.StartsWith("/")) { $domain + $cleanImg } else { $cleanImg }
    $fileName = [System.IO.Path]::GetFileName($cleanImg.Split('?')[0])
    $destPath = Join-Path "c:\Users\marks\OneDrive\桌面\wiki\assets\images" $fileName
    if (-not (Test-Path $destPath)) {
        $urls += $fullUrl
        $paths += $destPath
    }
}

Write-Output "New images to download: $($urls.Count)"
if ($urls.Count -gt 0) {
    [FastImageDownloader]::Download($urls, $paths, 12)
}
Write-Output "Total images in assets/images: $((Get-ChildItem 'c:\Users\marks\OneDrive\桌面\wiki\assets\images').Count)"
