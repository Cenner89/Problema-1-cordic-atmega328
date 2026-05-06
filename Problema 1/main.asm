.include "m328pdef.inc"

; ============================================================
; Problema 1 - CORDIC em assembly para ATmega328P
; Formato numerico adotado: Q2.14
; Arquivo principal:
; - inicializa pilha
; - prepara um ponto de entrada limpo
; - chama rotinas de teste do CORDIC
; ============================================================

.cseg
.org 0x0000
    rjmp RESET

RESET:
    rcall init_stack
    rcall init_test_state

    ; Bateria inicial de testes da rotina circular.
    ; Cada teste grava x, y, z e numero de iteracoes na SRAM.
    ldi r20, low(CORDIC_ANGLE_0_Q14)
    ldi r21, high(CORDIC_ANGLE_0_Q14)
    rcall cordic_rotate_q214
    sts TEST_ANGLE_0_RESULT, r22
    sts TEST_ANGLE_0_RESULT + 1, r23
    sts TEST_ANGLE_0_RESULT + 2, r24
    sts TEST_ANGLE_0_RESULT + 3, r25
    sts TEST_ANGLE_0_RESULT + 4, r20
    sts TEST_ANGLE_0_RESULT + 5, r21
    lds r16, DBG_ITER
    sts TEST_ANGLE_0_RESULT + 6, r16

    ldi r20, low(CORDIC_ANGLE_30_Q14)
    ldi r21, high(CORDIC_ANGLE_30_Q14)
    rcall cordic_rotate_q214
    sts TEST_ANGLE_30_RESULT, r22
    sts TEST_ANGLE_30_RESULT + 1, r23
    sts TEST_ANGLE_30_RESULT + 2, r24
    sts TEST_ANGLE_30_RESULT + 3, r25
    sts TEST_ANGLE_30_RESULT + 4, r20
    sts TEST_ANGLE_30_RESULT + 5, r21
    lds r16, DBG_ITER
    sts TEST_ANGLE_30_RESULT + 6, r16

    ldi r20, low(CORDIC_ANGLE_45_Q14)
    ldi r21, high(CORDIC_ANGLE_45_Q14)
    rcall cordic_rotate_q214
    sts TEST_ANGLE_45_RESULT, r22
    sts TEST_ANGLE_45_RESULT + 1, r23
    sts TEST_ANGLE_45_RESULT + 2, r24
    sts TEST_ANGLE_45_RESULT + 3, r25
    sts TEST_ANGLE_45_RESULT + 4, r20
    sts TEST_ANGLE_45_RESULT + 5, r21
    lds r16, DBG_ITER
    sts TEST_ANGLE_45_RESULT + 6, r16

    ldi r20, low(CORDIC_ANGLE_60_Q14)
    ldi r21, high(CORDIC_ANGLE_60_Q14)
    rcall cordic_rotate_q214
    sts TEST_ANGLE_60_RESULT, r22
    sts TEST_ANGLE_60_RESULT + 1, r23
    sts TEST_ANGLE_60_RESULT + 2, r24
    sts TEST_ANGLE_60_RESULT + 3, r25
    sts TEST_ANGLE_60_RESULT + 4, r20
    sts TEST_ANGLE_60_RESULT + 5, r21
    lds r16, DBG_ITER
    sts TEST_ANGLE_60_RESULT + 6, r16

    ldi r20, low(CORDIC_ANGLE_90_Q14)
    ldi r21, high(CORDIC_ANGLE_90_Q14)
    rcall cordic_rotate_q214
    sts TEST_ANGLE_90_RESULT, r22
    sts TEST_ANGLE_90_RESULT + 1, r23
    sts TEST_ANGLE_90_RESULT + 2, r24
    sts TEST_ANGLE_90_RESULT + 3, r25
    sts TEST_ANGLE_90_RESULT + 4, r20
    sts TEST_ANGLE_90_RESULT + 5, r21
    lds r16, DBG_ITER
    sts TEST_ANGLE_90_RESULT + 6, r16

    ; Teste polar -> retangular:
    ; r = 0,5 em Q2.14 e angulo = 45 graus.
    ; Resultado esperado: x ~= 0,3535 e y ~= 0,3535.
    ldi r18, low(Q14_HALF)
    ldi r19, high(Q14_HALF)
    ldi r20, low(CORDIC_ANGLE_45_Q14)
    ldi r21, high(CORDIC_ANGLE_45_Q14)
    rcall cordic_polar_to_rect_q214
    sts TEST_POLAR_45_HALF, r22
    sts TEST_POLAR_45_HALF + 1, r23
    sts TEST_POLAR_45_HALF + 2, r24
    sts TEST_POLAR_45_HALF + 3, r25

main_loop:
    rjmp main_loop

.include "cordic_tables.inc"
.include "cordic_core.inc"
