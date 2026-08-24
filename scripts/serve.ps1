$port = 8080
$root = "c:\Users\marks\OneDrive\桌面\wiki"

$portsToTry = @(8080, 8081, 3000, 5000, 8000)
$listener = New-Object System.Net.HttpListener

foreach ($p in $portsToTry) {
    try {
        $listener.Prefixes.Clear()
        $listener.Prefixes.Add("http://localhost:$p/")
        $listener.Start()
        $port = $p
        Write-Output "HTTP Server successfully started at http://localhost:$port/"
        break
    } catch {
        # Port busy, try next
    }
}

if (-not $listener.IsListening) {
    Write-Error "Failed to bind to any local port."
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".webp" = "image/webp"
    ".txt"  = "text/plain; charset=utf-8"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or [string]::IsNullOrEmpty($urlPath)) {
            $urlPath = "/index.html"
        }

        # Clean URL decoding using built-in System.Uri
        $decodedPath = [System.Uri]::UnescapeDataString($urlPath)
        $relativePath = $decodedPath.TrimStart('/').Replace('/', '\')
        $filePath = [System.IO.Path]::Combine($root, $relativePath)

        if ([System.IO.File]::Exists($filePath)) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }

            $response.ContentType = $mime
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache")

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.ContentLength64 = $msg.Length
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
