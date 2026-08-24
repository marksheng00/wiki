New-Item -ItemType Directory -Force -Path "c:\Users\marks\OneDrive\桌面\wiki\assets\vendor" | Out-Null

$vendors = @(
    @{ name = "force-graph.min.js"; url = "https://unpkg.com/force-graph@1.43.5/dist/force-graph.min.js" },
    @{ name = "popper.min.js"; url = "https://unpkg.com/@popperjs/core@2.11.8/dist/umd/popper.min.js" },
    @{ name = "tippy.bundle.min.js"; url = "https://unpkg.com/tippy.js@6.3.7/dist/tippy-bundle.umd.min.js" },
    @{ name = "tippy.css"; url = "https://unpkg.com/tippy.js@6.3.7/dist/tippy.css" },
    @{ name = "tippy-light.css"; url = "https://unpkg.com/tippy.js@6.3.7/themes/light.css" },
    @{ name = "fuse.basic.min.js"; url = "https://unpkg.com/fuse.js@7.0.0/dist/fuse.basic.min.js" },
    @{ name = "marked.min.js"; url = "https://unpkg.com/marked@12.0.2/marked.min.js" },
    @{ name = "lucide.min.js"; url = "https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" },
    @{ name = "medium-zoom.min.js"; url = "https://unpkg.com/medium-zoom@1.1.0/dist/medium-zoom.min.js" }
)

foreach ($v in $vendors) {
    $dest = Join-Path "c:\Users\marks\OneDrive\桌面\wiki\assets\vendor" $v.name
    try {
        Invoke-WebRequest -Uri $v.url -OutFile $dest -UseBasicParsing -TimeoutSec 15
        Write-Output "Downloaded $($v.name) ($((Get-Item $dest).Length) bytes)"
    } catch {
        Write-Output "Failed $($v.name): $($_.Exception.Message)"
    }
}
