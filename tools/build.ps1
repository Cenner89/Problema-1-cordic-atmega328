param(
    [string]$Configuration = "CliBuild"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$projectDir = Join-Path $root "Problema 1"
$mainFile = Join-Path $projectDir "main.asm"
$outDir = Join-Path $root $Configuration

$avrasm = "C:\Program Files (x86)\Atmel\Studio\7.0\toolchain\avr8\avrassembler\avrasm2.exe"
$includeDir = "C:\Program Files (x86)\Atmel\Studio\7.0\packs\atmel\ATmega_DFP\1.7.374\avrasm\inc"

if (!(Test-Path $avrasm)) {
    throw "avrasm2.exe nao encontrado em: $avrasm"
}

if (!(Test-Path $includeDir)) {
    throw "Diretorio de includes nao encontrado em: $includeDir"
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$hexFile = Join-Path $outDir "Problema1.hex"
$listFile = Join-Path $outDir "Problema1.lss"
$mapFile = Join-Path $outDir "Problema1.map"

& $avrasm `
    -fI `
    -o $hexFile `
    -l $listFile `
    -m $mapFile `
    -I $includeDir `
    $mainFile

if ($LASTEXITCODE -ne 0) {
    throw "Falha ao montar o projeto. Codigo de saida: $LASTEXITCODE"
}

Write-Host "Build concluido com sucesso."
Write-Host "HEX: $hexFile"
Write-Host "LSS: $listFile"
Write-Host "MAP: $mapFile"
