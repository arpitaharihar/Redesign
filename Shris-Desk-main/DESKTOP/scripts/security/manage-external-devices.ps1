[CmdletBinding()]
param(
  [ValidateSet("Lockdown", "Restore", "Status")]
  [string]$Mode = "Status"
)

$ErrorActionPreference = "Stop"

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)

  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script from an elevated PowerShell window."
  }
}

function Ensure-RegistryValue {
  param(
    [string]$Path,
    [string]$Name,
    [Object]$Value,
    [Microsoft.Win32.RegistryValueKind]$Type = [Microsoft.Win32.RegistryValueKind]::DWord
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -Force | Out-Null
  }

  New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force | Out-Null
}

function Set-Lockdown {
  Ensure-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USBSTOR" -Name "Start" -Value 4
  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "NoDriveTypeAutoRun" -Value 255

  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices" -Name "Deny_All" -Value 1
  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices" -Name "Deny_Read" -Value 1
  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices" -Name "Deny_Write" -Value 1

  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PortableDevices" -Name "Deny_Devices" -Value 1
  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeviceInstall\Restrictions" -Name "DenyRemovableDevices" -Value 1

  Write-Host "Device Lockdown Enabled" -ForegroundColor Green
}

function Set-Restore {
  Ensure-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USBSTOR" -Name "Start" -Value 3
  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "NoDriveTypeAutoRun" -Value 145

  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices" -Name "Deny_All" -Value 0
  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices" -Name "Deny_Read" -Value 0
  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices" -Name "Deny_Write" -Value 0

  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PortableDevices" -Name "Deny_Devices" -Value 0
  Ensure-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeviceInstall\Restrictions" -Name "DenyRemovableDevices" -Value 0

  Write-Host "Device Restrictions Removed" -ForegroundColor Green
}

function Show-Status {
  $usbStor = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USBSTOR" -Name "Start" -ErrorAction SilentlyContinue
  $policy = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices" -ErrorAction SilentlyContinue
  $mtp = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PortableDevices" -ErrorAction SilentlyContinue

  [pscustomobject]@{
    USB_Storage = if ($usbStor.Start -eq 4) { "Disabled" } else { "Enabled" }
    Removable   = if ($policy.Deny_All -eq 1) { "Blocked" } else { "Allowed" }
    MTP_Devices = if ($mtp.Deny_Devices -eq 1) { "Blocked" } else { "Allowed" }
  } | ConvertTo-Json -Depth 2
}

Assert-Administrator

switch ($Mode) {
  "Lockdown" { Set-Lockdown }
  "Restore"  { Set-Restore }
  default    { Show-Status }
}

Write-Host "Restart system for full effect." -ForegroundColor Cyan