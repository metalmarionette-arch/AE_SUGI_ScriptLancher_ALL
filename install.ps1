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

    Write-Host 'Administrator rights are required. Restarting as admin...' -ForegroundColor Yellow

    $argList = @('-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $PSCommandPath), '-Elevated')

    if ($AeVersion) { $argList += @('-AeVersion', ('"{0}"' -f $AeVersion)) }
    if ($AllDetectedVersions) { $argList += '-AllDetectedVersions' }
    if ($Force) { $argList += '-Force' }

    Start-Process -FilePath 'powershell.exe' -ArgumentList ($argList -join ' ') -Verb RunAs | Out-Null
    Write-Host 'Elevated installer started.' -ForegroundColor Cyan
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
        $ans = Read-Host "Already exists: $Destination`nOverwrite? (y/N)"
        if ($ans -notin @('y', 'Y')) {
            Write-Host "Skipped: $Destination" -ForegroundColor Yellow
            return
        }
    }

    Copy-Item -Path $Source -Destination $Destination -Recurse -Force
    Write-Host "Copied: $Destination" -ForegroundColor Green
}

try {
    Ensure-Elevated

    $repoRoot = Split-Path -Parent $PSCommandPath
    $jsxSource = Join-Path $repoRoot 'AE_SUGI_ScriptLancher.jsx'
    $dataSource = Join-Path $repoRoot 'AE_SUGI_ScriptLancher'

    if (-not (Test-Path $jsxSource)) {
        throw "Missing file: $jsxSource"
    }
    if (-not (Test-Path $dataSource)) {
        throw "Missing folder: $dataSource"
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
            throw 'No After Effects installations detected. Use -AeVersion 2024 (or similar).'
        }
    } else {
        $inputVer = Read-Host 'Enter After Effects version (example: 2024)'
        if (-not $inputVer) {
            throw 'No version was entered.'
        }
        $versions = @($inputVer)
    }

    $installedToAe = $false

    foreach ($ver in $versions) {
        $panelDir = Get-AfterEffectsScriptUiPanelPath -Version $ver
        if (-not (Test-Path $panelDir)) {
            Write-Host "Not found: $panelDir" -ForegroundColor Yellow
            Write-Host "After Effects $ver may be missing or installed to a non-default location." -ForegroundColor Yellow
            continue
        }

        $panelTarget = Join-Path $panelDir 'AE_SUGI_ScriptLancher.jsx'
        Copy-WithPrompt -Source $jsxSource -Destination $panelTarget -ForceCopy:$Force
        $installedToAe = $true
    }

    $launcherRoot = Get-LauncherDataPath
    if (-not (Test-Path $launcherRoot)) {
        New-Item -Path $launcherRoot -ItemType Directory -Force | Out-Null
    }

    Copy-WithPrompt -Source (Join-Path $dataSource '*') -Destination $launcherRoot -ForceCopy:$Force

    Write-Host ''
    if (-not $installedToAe) {
        Write-Host 'Warning: JSX was not copied to After Effects program folder.' -ForegroundColor Yellow
        Write-Host 'Check AE version or custom installation path.' -ForegroundColor Yellow
    }
    Write-Host 'Install process completed.' -ForegroundColor Cyan
    Write-Host 'Open After Effects > Window > AE_SUGI_ScriptLancher' -ForegroundColor Cyan
    exit 0
}
catch {
    Write-Host ''
    Write-Host 'Installation error.' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
