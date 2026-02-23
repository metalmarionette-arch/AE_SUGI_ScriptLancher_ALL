[CmdletBinding()]
param(
    [string]$AeVersion,
    [switch]$AllDetectedVersions,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Get-AfterEffectsScriptUiPanelPath {
    param([Parameter(Mandatory = $true)][string]$Version)

    $base = Join-Path ${env:ProgramFiles} ("Adobe/Adobe After Effects {0}/Support Files/Scripts/ScriptUI Panels" -f $Version)
    return $base
}

function Get-LauncherDataPath {
    return Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Adobe/After Effects/AE_SUGI_ScriptLancher'
}

function Copy-WithPrompt {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination,
        [switch]$ForceCopy
    )

    if ((Test-Path $Destination) -and -not $ForceCopy) {
        $ans = Read-Host "既に存在します: $Destination`n上書きしますか? (y/N)"
        if ($ans -notin @('y', 'Y')) {
            Write-Host "スキップしました: $Destination" -ForegroundColor Yellow
            return
        }
    }

    Copy-Item -Path $Source -Destination $Destination -Recurse -Force
    Write-Host "コピー完了: $Destination" -ForegroundColor Green
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$jsxSource = Join-Path $repoRoot 'AE_SUGI_ScriptLancher.jsx'
$dataSource = Join-Path $repoRoot 'AE_SUGI_ScriptLancher'

if (-not (Test-Path $jsxSource)) {
    throw "見つかりません: $jsxSource"
}
if (-not (Test-Path $dataSource)) {
    throw "見つかりません: $dataSource"
}

$versions = @()
if ($AeVersion) {
    $versions = @($AeVersion)
} elseif ($AllDetectedVersions) {
    $versions = Get-ChildItem -Path ${env:ProgramFiles} -Directory -Filter 'Adobe After Effects *' |
        ForEach-Object {
            if ($_.Name -match '^Adobe After Effects (\d{4})$') { $matches[1] }
        } |
        Sort-Object -Unique

    if (-not $versions -or $versions.Count -eq 0) {
        throw "After Effects のインストールが見つかりません。-AeVersion 2024 のように明示指定してください。"
    }
} else {
    $inputVer = Read-Host 'After Effects のバージョンを入力してください (例: 2024)'
    if (-not $inputVer) {
        throw 'バージョンが入力されていません。'
    }
    $versions = @($inputVer)
}

# 1) ScriptUI Panels へ jsx をコピー
foreach ($ver in $versions) {
    $panelDir = Get-AfterEffectsScriptUiPanelPath -Version $ver
    if (-not (Test-Path $panelDir)) {
        Write-Host "見つかりません: $panelDir" -ForegroundColor Yellow
        Write-Host "After Effects $ver が未インストールか、インストール先が標準ではありません。" -ForegroundColor Yellow
        continue
    }

    $panelTarget = Join-Path $panelDir 'AE_SUGI_ScriptLancher.jsx'
    Copy-WithPrompt -Source $jsxSource -Destination $panelTarget -ForceCopy:$Force
}

# 2) Documents 配下へフォルダをコピー
$launcherRoot = Get-LauncherDataPath
if (-not (Test-Path $launcherRoot)) {
    New-Item -Path $launcherRoot -ItemType Directory -Force | Out-Null
}

Copy-WithPrompt -Source (Join-Path $dataSource '*') -Destination $launcherRoot -ForceCopy:$Force

Write-Host ''
Write-Host 'インストール処理が完了しました。' -ForegroundColor Cyan
Write-Host 'After Effects を起動し、[ウィンドウ] > [AE_SUGI_ScriptLancher] から開いてください。' -ForegroundColor Cyan
