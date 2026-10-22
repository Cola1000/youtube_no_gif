# Builds dist/youtube-no-gif-<version>.zip, usable for both the Chrome Web Store and addons.mozilla.org.
# Uses ZipArchive directly because Compress-Archive on Windows PowerShell 5.1 writes backslash paths,
# which Firefox rejects.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json).version
$dist = Join-Path $root 'dist'
$zipPath = Join-Path $dist "youtube-no-gif-$version.zip"

New-Item -ItemType Directory -Force $dist | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath }

$files = @(Get-Item (Join-Path $root 'manifest.json'))
foreach ($dir in 'src', 'popup', 'icons') {
  $files += Get-ChildItem (Join-Path $root $dir) -Recurse -File
}

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  foreach ($file in $files) {
    $entry = $file.FullName.Substring($root.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entry) | Out-Null
  }
} finally {
  $zip.Dispose()
}

Write-Host "Created $zipPath"
