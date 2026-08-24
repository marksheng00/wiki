Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Collections.Generic;

public class PdfStreamExtractor
{
    public static string ExtractText(string pdfPath)
    {
        byte[] bytes = File.ReadAllBytes(pdfPath);
        string raw = Encoding.ASCII.GetString(bytes);
        StringBuilder sb = new StringBuilder();

        int pos = 0;
        while (true)
        {
            int streamStart = raw.IndexOf("stream\r\n", pos);
            if (streamStart == -1) streamStart = raw.IndexOf("stream\n", pos);
            if (streamStart == -1) break;

            int dataStart = streamStart + (raw[streamStart + 6] == '\r' ? 8 : 7);
            int streamEnd = raw.IndexOf("endstream", dataStart);
            if (streamEnd == -1) break;

            int length = streamEnd - dataStart;
            byte[] streamBytes = new byte[length];
            Array.Copy(bytes, dataStart, streamBytes, 0, length);

            try
            {
                using (var ms = new MemoryStream(streamBytes))
                {
                    // Skip 2-byte zlib header (usually 0x78 0x9C or 0x78 0xDA)
                    if (streamBytes.Length > 2 && streamBytes[0] == 0x78)
                    {
                        ms.ReadByte();
                        ms.ReadByte();
                        using (var ds = new DeflateStream(ms, CompressionMode.Decompress))
                        using (var reader = new StreamReader(ds, Encoding.UTF8))
                        {
                            string decompressed = reader.ReadToEnd();
                            sb.AppendLine(decompressed);
                        }
                    }
                }
            }
            catch {}

            pos = streamEnd + 9;
        }

        return sb.ToString();
    }
}
"@

$pdfPath = "c:\Users\marks\OneDrive\桌面\wiki\data\pdf_news_ux_playbook.pdf"
$extracted = [PdfStreamExtractor]::ExtractText($pdfPath)

# Extract human-readable text from PDF drawing operators (Tj, TJ, etc.)
$lines = $extracted -split "`n"
$humanText = @()
foreach ($line in $lines) {
    if ($line -match '\((.*?)\)\s*Tj') {
        $humanText += $matches[1]
    }
    elseif ($line -match '\[(.*?)\]\s*TJ') {
        $arr = $matches[1]
        $subMatches = [regex]::Matches($arr, '\((.*?)\)')
        $combined = ($subMatches | ForEach-Object { $_.Groups[1].Value }) -join ""
        if ($combined.Length -gt 0) {
            $humanText += $combined
        }
    }
}

$fullHumanDoc = $humanText -join "`n"
Set-Content -Path "c:\Users\marks\OneDrive\桌面\wiki\data\google_playbook_full_text.txt" -Value $fullHumanDoc -Encoding utf8
Write-Output "Successfully extracted $($humanText.Count) text lines from PDF! ($($fullHumanDoc.Length) chars)"
Write-Output "`n=== Sample Extracted Headers / Rules ==="
$humanText | Where-Object { $_.Length -gt 20 -and $_ -notmatch '^\s*$' } | Select-Object -First 40
