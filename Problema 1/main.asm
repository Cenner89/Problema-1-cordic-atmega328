.include "m328pdef.inc"

; ============================================================
; Problema 1 - CORDIC em assembly para ATmega328P
; Formato numerico adotado: Q2.14
; Arquivo principal:
; - inicializa pilha
; - prepara um ponto de entrada limpo
; - executa a bateria de testes do CORDIC
; ============================================================

.cseg
.org 0x0000
    rjmp RESET

RESET:
    rcall init_stack
    rcall init_test_state
    rcall run_test_suite

main_loop:
    rjmp main_loop

; ============================================================
; Bateria geral de testes
; ============================================================

run_test_suite:
    rcall run_circular_rotation_tests
    rcall run_polar_to_rect_tests
    ret

; -----------------------------
; Testes CORDIC circular
; Saida de cada teste:
;   byte 0 e 1 = x = cos(angulo)
;   byte 2 e 3 = y = sin(angulo)
;   byte 4 e 5 = z final
;   byte 6     = numero de iteracoes
; -----------------------------
run_circular_rotation_tests:
    ; 0 graus -> TEST_ANGLE_0_RESULT
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

    ; 30 graus -> TEST_ANGLE_30_RESULT
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

    ; 45 graus -> TEST_ANGLE_45_RESULT
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

    ; 60 graus -> TEST_ANGLE_60_RESULT
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

    ; 90 graus -> TEST_ANGLE_90_RESULT
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
    ret

; -----------------------------
; Testes polar -> retangular
; Saida de cada teste:
;   byte 0 e 1 = x = r * cos(angulo)
;   byte 2 e 3 = y = r * sin(angulo)
; -----------------------------
run_polar_to_rect_tests:
    ; r = 0,5 | angulo = 45 graus -> TEST_POLAR_45_HALF
    ldi r18, low(Q14_HALF)
    ldi r19, high(Q14_HALF)
    ldi r20, low(CORDIC_ANGLE_45_Q14)
    ldi r21, high(CORDIC_ANGLE_45_Q14)
    rcall cordic_polar_to_rect_q214
    sts TEST_POLAR_45_HALF, r22
    sts TEST_POLAR_45_HALF + 1, r23
    sts TEST_POLAR_45_HALF + 2, r24
    sts TEST_POLAR_45_HALF + 3, r25

    ; r = 1,0 | angulo = 0 graus -> TEST_POLAR_0_ONE
    ldi r18, low(Q14_ONE)
    ldi r19, high(Q14_ONE)
    ldi r20, low(CORDIC_ANGLE_0_Q14)
    ldi r21, high(CORDIC_ANGLE_0_Q14)
    rcall cordic_polar_to_rect_q214
    sts TEST_POLAR_0_ONE, r22
    sts TEST_POLAR_0_ONE + 1, r23
    sts TEST_POLAR_0_ONE + 2, r24
    sts TEST_POLAR_0_ONE + 3, r25

    ; r = 1,0 | angulo = 90 graus -> TEST_POLAR_90_ONE
    ldi r18, low(Q14_ONE)
    ldi r19, high(Q14_ONE)
    ldi r20, low(CORDIC_ANGLE_90_Q14)
    ldi r21, high(CORDIC_ANGLE_90_Q14)
    rcall cordic_polar_to_rect_q214
    sts TEST_POLAR_90_ONE, r22
    sts TEST_POLAR_90_ONE + 1, r23
    sts TEST_POLAR_90_ONE + 2, r24
    sts TEST_POLAR_90_ONE + 3, r25

    ; r = 0,5 | angulo = 30 graus -> TEST_POLAR_30_HALF
    ldi r18, low(Q14_HALF)
    ldi r19, high(Q14_HALF)
    ldi r20, low(CORDIC_ANGLE_30_Q14)
    ldi r21, high(CORDIC_ANGLE_30_Q14)
    rcall cordic_polar_to_rect_q214
    sts TEST_POLAR_30_HALF, r22
    sts TEST_POLAR_30_HALF + 1, r23
    sts TEST_POLAR_30_HALF + 2, r24
    sts TEST_POLAR_30_HALF + 3, r25

    ; r = 0,5 | angulo = 60 graus -> TEST_POLAR_60_HALF
    ldi r18, low(Q14_HALF)
    ldi r19, high(Q14_HALF)
    ldi r20, low(CORDIC_ANGLE_60_Q14)
    ldi r21, high(CORDIC_ANGLE_60_Q14)
    rcall cordic_polar_to_rect_q214
    sts TEST_POLAR_60_HALF, r22
    sts TEST_POLAR_60_HALF + 1, r23
    sts TEST_POLAR_60_HALF + 2, r24
    sts TEST_POLAR_60_HALF + 3, r25
    ret

.include "cordic_tables.inc"
.include "cordic_core.inc"
