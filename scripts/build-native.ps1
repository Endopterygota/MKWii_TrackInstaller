$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot "native\TrackInstallerBackend.cs"
$outputDirectory = Join-Path $projectRoot "native\bin"
$output = Join-Path $outputDirectory "MKWiiBackend.exe"
$frameworkRoot = Join-Path $env:WINDIR "Microsoft.NET\Framework64"
$compilerFile = Get-ChildItem -Path $frameworkRoot -Filter "csc.exe" -Recurse -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1
if (-not $compilerFile) { throw "Kein 64-Bit-.NET-Framework-C#-Compiler unter $frameworkRoot gefunden." }
$compiler = $compilerFile.FullName
$framework = Split-Path -Parent $compiler
$wpf = Join-Path $framework "WPF"

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

& $compiler /nologo /target:exe /platform:x64 /optimize+ "/out:$output" `
  /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll `
  "/r:$(Join-Path $wpf 'UIAutomationClient.dll')" `
  "/r:$(Join-Path $wpf 'UIAutomationTypes.dll')" `
  "/r:$(Join-Path $wpf 'WindowsBase.dll')" `
  $source

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
