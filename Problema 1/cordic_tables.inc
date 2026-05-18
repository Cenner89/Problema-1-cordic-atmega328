; ============================================================
; Constantes e tabelas do projeto CORDIC
; Formato principal: Q2.14
; ============================================================

; -----------------------------
; Parametros gerais
; -----------------------------
.equ Q14_SHIFT              = 14
.equ Q14_ONE                = 0x4000
.equ Q14_HALF               = 0x2000
.equ Q14_MINUS_ONE          = 0xC000

.equ CORDIC_ITERATIONS      = 15

; Ganho circular do CORDIC:
; K ~= 0.607252935
.equ CORDIC_GAIN_Q14        = 9949

; Inverso do ganho circular:
; 1/K ~= 1.646760258
.equ CORDIC_INV_GAIN_Q14    = 26981

; Angulos uteis em radianos no formato Q2.14
.equ CORDIC_ANGLE_0_Q14     = 0
.equ CORDIC_ANGLE_30_Q14    = 8579
.equ CORDIC_ANGLE_45_Q14    = 12868
.equ CORDIC_ANGLE_60_Q14    = 17157
.equ CORDIC_ANGLE_90_Q14    = 25736

; Enderecos de SRAM reservados para depuracao e testes
.equ DBG_X_OUT              = 0x0100
.equ DBG_Y_OUT              = 0x0102
.equ DBG_Z_OUT              = 0x0104
.equ DBG_ITER               = 0x0106

; Variaveis internas usadas pela rotina CORDIC circular
.equ CORDIC_X               = 0x0110
.equ CORDIC_Y               = 0x0112
.equ CORDIC_Z               = 0x0114
.equ CORDIC_X_SHIFT         = 0x0116
.equ CORDIC_Y_SHIFT         = 0x0118
.equ CORDIC_ATAN            = 0x011A

; Resultados da bateria de testes circular
.equ TEST_ANGLE_0_RESULT    = 0x0120
.equ TEST_ANGLE_30_RESULT   = 0x0128
.equ TEST_ANGLE_45_RESULT   = 0x0130
.equ TEST_ANGLE_60_RESULT   = 0x0138
.equ TEST_ANGLE_90_RESULT   = 0x0140
.equ TEST_POLAR_45_HALF     = 0x0148

; Variaveis internas para polar -> retangular
.equ POLAR_RADIUS           = 0x0160
.equ POLAR_COS              = 0x0162
.equ POLAR_SIN              = 0x0164
.equ POLAR_X                = 0x0166
.equ POLAR_Y                = 0x0168

; -----------------------------
; Tabela atan(2^-i) em radianos
; Q2.14, uso no modo circular
; -----------------------------
.cseg
; --- NOVAS DEFINIÇÕES PARA A PRÓXIMA ETAPA ---
.equ TEST_VECT_RESULT       = 0x0170 ; Salva Angulo e Magnitude (8 bytes) 
.equ TEST_DIV_RESULT        = 0x0178 ; Salva Quociente (2 bytes) 

; Tabela atanh(2^-i) para modo hiperbolico (Q2.14)
; Necessária para calcular Raiz Quadrada e Funções Exponenciais 
cordic_atanh_table_q14:
    .dw 8989    ; atanh(2^-1)
    .dw 4145    ; atanh(2^-2)
    .dw 2055    ; atanh(2^-3)
    .dw 1025    ; atanh(2^-4) - Lembrar de repetir esta iteração!
    .dw 512     ; atanh(2^-5)
cordic_atan_table_q14:
    .dw 12868    ; atan(2^0)   = 0.7853981634
    .dw 7596     ; atan(2^-1)  = 0.4636476090
    .dw 4014     ; atan(2^-2)  = 0.2449786631
    .dw 2038     ; atan(2^-3)  = 0.1243549945
    .dw 1022     ; atan(2^-4)  = 0.0624188100
    .dw 512      ; atan(2^-5)  = 0.0312398334
    .dw 256      ; atan(2^-6)  = 0.0156237286
    .dw 128      ; atan(2^-7)  = 0.0078123411
    .dw 64       ; atan(2^-8)  = 0.0039062301
    .dw 32       ; atan(2^-9)  = 0.0019531225
    .dw 16       ; atan(2^-10) = 0.0009765622
    .dw 8        ; atan(2^-11) = 0.0004882812
    .dw 4        ; atan(2^-12) = 0.0002441406
    .dw 2        ; atan(2^-13) = 0.0001220703
    .dw 1        ; atan(2^-14) = 0.0000610352


; --- Complemento para Divisao (Modo Linear) ---


.cseg
; Tabela de potencias de 2^-i em Q2.14
cordic_linear_table_q14:
    .dw 16384   ; 2^0
    .dw 8192    ; 2^-1
    .dw 4096    ; 2^-2
    .dw 2048    ; 2^-3
    .dw 1024    ; 2^-4
    .dw 512     ; 2^-5
    .dw 256     ; 2^-6
    .dw 128     ; 2^-7
    .dw 64      ; 2^-8
    .dw 32      ; 2^-9
    .dw 16      ; 2^-10
    .dw 8       ; 2^-11
    .dw 4       ; 2^-12
    .dw 2       ; 2^-13
    .dw 1       ; 2^-14