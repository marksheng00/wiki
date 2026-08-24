# Check if python or any tool can read the PDF text
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Let's search inside the PDF raw stream for text objects or chapters
$bytes = [System.IO.File]::ReadAllBytes("c:\Users\marks\OneDrive\桌面\wiki\data\pdf_news_ux_playbook.pdf")
$pdfText = [System.Text.Encoding]::ASCII.GetString($bytes)

# Extract stream text
$matches = [regex]::Matches($pdfText, '\((.*?)\)\s*Tj')
$extracted = ($matches | ForEach-Object { $_.Groups[1].Value }) -join " "

if ($extracted.Length -gt 100) {
    Write-Output "Extracted raw text snippet ($($extracted.Length) chars):"
    $extracted.Substring(0, [Math]::Min(2000, $extracted.Length))
    Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\pdf_extracted_text.txt" -Value $extracted -Encoding utf8
} else {
    Write-Output "PDF might use compressed streams or fonts. Searching for strings..."
    $strings = [regex]::Matches($pdfText, '[A-Za-z0-9 ,.\-\/]{4,}') | ForEach-Object { $_.Value }
    $filtered = $strings | Where-Object { $_ -match "UX|Homepage|Article|Navigation|Header|Search|Reader|Content|Speed|Layout|Playbook|Google" }
    Write-Output "Found $($filtered.Count) relevant keyword strings in PDF."
    $filtered | Select-Object -First 30
}
