# Problema 1 - CORDIC no ATmega328P

Projeto da disciplina ENGC50 - Sistemas Microprocessados.

O objetivo e implementar variacoes do algoritmo CORDIC em assembly para o
microcontrolador ATmega328P, usando formato numerico Q2.14.

## Estado atual

- Estrutura do projeto organizada em arquivos separados.
- Rotina CORDIC circular implementada para seno e cosseno.
- Bateria de testes para 0, 30, 45, 60 e 90 graus.
- Rotina de multiplicacao assinada em Q2.14.
- Inicio da conversao polar para retangular.
- Arquivo `EXPLICACAO_DO_PROJETO.txt` mantem o registro didatico do que foi feito.

## Arquivos principais

- `Problema 1/main.asm`: ponto de entrada e testes.
- `Problema 1/cordic_tables.inc`: constantes, enderecos e tabelas.
- `Problema 1/cordic_core.inc`: rotinas CORDIC e auxiliares.
- `Problema 1/EXPLICACAO_DO_PROJETO.txt`: explicacao passo a passo do projeto.

## Como abrir

Abra a solucao/projeto no Microchip Studio a partir da pasta do projeto e compile
em modo Debug usando o simulador do ATmega328P.

## Build e testes por terminal

Para compilar usando o assembler oficial do Microchip/Atmel Studio:

```powershell
powershell -ExecutionPolicy Bypass -File tools/build.ps1
```

Para compilar e validar automaticamente os resultados principais na SRAM:

```powershell
node tools/test-cordic.js
```

O teste automatico valida os casos de seno/cosseno e polar para retangular
ja definidos em `main.asm`.

## Observacao sobre Git

Este repositorio deve versionar os arquivos fonte e de documentacao.
Arquivos temporarios do Microchip Studio e saidas de compilacao ficam ignorados
pelo `.gitignore`.
