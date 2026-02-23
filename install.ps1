[CmdletBinding()]
param(
    [string]$AeVersion,
    [switch]$AllDetectedVersions,
    [switch]$Force,
    [switch]$Elevated
)

$ErrorActionPreference = 'Stop'

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-Elevated {
    if (Test-IsAdmin) { return }

    Write-Host '管理者権限が必要なため、昇格実行します...' -ForegroundColor Yellow

    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $PSCommandPath), '-Elevated')

    if ($AeVersion) { $argList += @('-AeVersion', ('"{0}"' -f $AeVersion)) }
    if ($AllDetectedVersions) { $argList += '-AllDetectedVersions' }
    if ($Force) { $argList += '-Force' }

    Start-Process -FilePath 'powershell.exe' -ArgumentList ($argList -join ' ') -Verb RunAs | Out-Null
    Write-Host '昇格したインストーラーを起動しました。' -ForegroundColor Cyan
    exit 0
}

function Get-AfterEffectsScriptUiPanelPath {
    param([Parameter(Mandatory = $true)][string]$Version)

    return Join-Path ${env:ProgramFiles} ("Adobe/Adobe After Effects {0}/Support Files/Scripts/ScriptUI Panels" -f $Version)
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

try {
    Ensure-Elevated

    $repoRoot = Split-Path -Parent $PSCommandPath
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

    $installedToAe = $false

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
        $installedToAe = $true
    }

    # 2) Documents 配下へフォルダをコピー
    $launcherRoot = Get-LauncherDataPath
    if (-not (Test-Path $launcherRoot)) {
        New-Item -Path $launcherRoot -ItemType Directory -Force | Out-Null
    }

    Copy-WithPrompt -Source (Join-Path $dataSource '*') -Destination $launcherRoot -ForceCopy:$Force

    Write-Host ''
    if (-not $installedToAe) {
        Write-Host '注意: After Effects 本体側へのコピーは行われていません。バージョン指定やインストール先をご確認ください。' -ForegroundColor Yellow
    }
    Write-Host 'インストール処理が完了しました。' -ForegroundColor Cyan
    Write-Host 'After Effects を起動し、[ウィンドウ] > [AE_SUGI_ScriptLancher] から開いてください。' -ForegroundColor Cyan
    exit 0
}
catch {
    Write-Host ''
    Write-Host 'インストール中にエラーが発生しました。' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
