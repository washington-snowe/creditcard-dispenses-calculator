const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
function prepareScript(config) {
  return `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = ${quote(config.zip)}
$stage = ${quote(config.stage)}
$destination = ${quote(config.destination)}
$expected = ${quote(config.version)}
$hashStream = [IO.File]::OpenRead($zip)
$sha = [Security.Cryptography.SHA256]::Create()
try { $actualHash = [BitConverter]::ToString($sha.ComputeHash($hashStream)).Replace('-', '').ToLowerInvariant() }
finally { $hashStream.Dispose(); $sha.Dispose() }
if ($actualHash -ne ${quote(config.hash)}) { throw 'Checksum da atualização divergente.' }
New-Item -ItemType Directory -Force $stage | Out-Null
$archive = [IO.Compression.ZipFile]::OpenRead($zip)
try {
  $prefix = [IO.Path]::GetFullPath($stage).TrimEnd('\\') + '\\'
  $size = [long]0
  $names = New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
  if ($archive.Entries.Count -gt 20000) { throw 'Arquivo com entradas demais.' }
  foreach ($entry in $archive.Entries) {
    $name = $entry.FullName.Replace('/', '\\')
    $target = [IO.Path]::GetFullPath((Join-Path $stage $name))
    if (!$target.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::IsPathRooted($name) -or $name.Contains(':') -or !$names.Add($name)) { throw 'Caminho inválido no ZIP.' }
    if ((($entry.ExternalAttributes -shr 16) -band 61440) -eq 40960) { throw 'Links simbólicos não são permitidos.' }
    $size += $entry.Length
    if ($size -gt 1600000000) { throw 'Atualização grande demais.' }
  }
} finally { $archive.Dispose() }
[IO.Compression.ZipFile]::ExtractToDirectory($zip, $stage)
$candidate = Join-Path $stage 'Saldo-win32-x64'
if (!(Test-Path -LiteralPath (Join-Path $candidate 'saldo.exe'))) { throw 'Executável ausente.' }
$asarPath = Join-Path $candidate 'resources/app.asar'
$reader = New-Object IO.BinaryReader ([IO.File]::OpenRead($asarPath))
try {
  if ($reader.ReadUInt32() -ne 4) { throw 'Cabeçalho ASAR inválido.' }
  $headerSize = $reader.ReadUInt32()
  $null = $reader.ReadUInt32()
  $jsonSize = $reader.ReadUInt32()
  if ($headerSize -gt 8388608 -or $jsonSize -gt $headerSize -or $jsonSize -lt 2) { throw 'ASAR inválido.' }
  $header = [Text.Encoding]::UTF8.GetString($reader.ReadBytes($jsonSize)) | ConvertFrom-Json
  $metadata = $header.files.'package.json'
  if (!$metadata -or $metadata.unpacked -or $metadata.size -gt 1048576) { throw 'Metadados ausentes.' }
  $offset = [long]8 + $headerSize + [long]$metadata.offset
  if ($offset -lt 0 -or ($offset + $metadata.size) -gt $reader.BaseStream.Length) { throw 'Metadados fora do arquivo.' }
  $null = $reader.BaseStream.Seek($offset, [IO.SeekOrigin]::Begin)
  $package = [Text.Encoding]::UTF8.GetString($reader.ReadBytes($metadata.size)) | ConvertFrom-Json
  if ($package.name -ne 'saldo-desktop' -or $package.version -ne $expected) { throw 'A versão do pacote não corresponde à atualização.' }
} finally { $reader.Dispose() }
if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Recurse -Force }
New-Item -ItemType Directory -Force (Split-Path $destination) | Out-Null
Move-Item -LiteralPath $stage -Destination $destination
Write-Output 'Atualização verificada e preparada.'
`;
}
function applyScript(config) {
  return `$ErrorActionPreference = 'Stop'
$oldPid = ${Number(config.pid)}
$active = ${quote(config.active)}
$exe = ${quote(config.executable)}
$original = ${quote(config.original)}
$ack = ${quote(config.ack)}
$log = ${quote(config.log)}
[IO.File]::AppendAllText($log + '.progress.log', 'Helper started.' + [Environment]::NewLine)
$previous = if (Test-Path -LiteralPath $active) { [IO.File]::ReadAllText($active) } else { $null }
$newProcess = $null
try {
  for ($i = 0; $i -lt 120; $i++) {
    if (!(Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Milliseconds 500
  }
  if (Get-Process -Id $oldPid -ErrorAction SilentlyContinue) { throw 'A versão anterior não fechou.' }
  [IO.File]::AppendAllText($log + '.progress.log', 'Previous process closed.' + [Environment]::NewLine)
  $newProcess = Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe) -ArgumentList ${quote("--saldo-update-ack=" + config.nonce)} -PassThru
  [IO.File]::AppendAllText($log + '.progress.log', 'New process started.' + [Environment]::NewLine)
  $ready = $false
  for ($i = 0; $i -lt 90; $i++) {
    if (Test-Path -LiteralPath $ack) {
      $message = [IO.File]::ReadAllText($ack) | ConvertFrom-Json
      if ($message.version -eq ${quote(config.version)}) { $ready = $true; break }
    }
    if ($newProcess.HasExited) { throw 'A nova versão não conseguiu abrir.' }
    Start-Sleep -Milliseconds 500
    $newProcess.Refresh()
  }
  if (!$ready) { throw 'A nova versão não confirmou a leitura dos dados.' }
  $temporary = $active + '.tmp'
  [IO.File]::WriteAllText($temporary, ${quote(JSON.stringify({ version: config.version }))}, (New-Object Text.UTF8Encoding $false))
  Move-Item -LiteralPath $temporary -Destination $active -Force
  @{ success = $true; version = ${quote(config.version)}; processId = $newProcess.Id } | ConvertTo-Json | Set-Content -LiteralPath $log -Encoding UTF8
} catch {
  $reason = $_.Exception.Message
  if ($newProcess -and !$newProcess.HasExited) { & taskkill.exe /PID $newProcess.Id /T /F | Out-Null }
  if ($null -eq $previous) { if (Test-Path -LiteralPath $active) { Remove-Item -LiteralPath $active -Force } }
  else { [IO.File]::WriteAllText($active, $previous, (New-Object Text.UTF8Encoding $false)) }
  @{ success = $false; version = ${quote(config.version)}; message = $reason } | ConvertTo-Json | Set-Content -LiteralPath $log -Encoding UTF8
  Start-Process -FilePath $original -WorkingDirectory (Split-Path $original)
  exit 1
}
`;
}
module.exports = { prepareScript, applyScript };
