; ============================================================
; Base das rotinas CORDIC
; Este arquivo concentra as rotinas e o esqueleto de implementacao
; ============================================================

; -----------------------------
; Convencao inicial de registradores
; -----------------------------
; r20:r21 -> z de entrada / trabalho
; r22:r23 -> x de trabalho / saida
; r24:r25 -> y de trabalho / saida
; r16:r19 -> temporarios
; r28     -> contador de iteracoes
; r26:r27 -> X pointer
; r30:r31 -> Z pointer

; -----------------------------
; Inicializacao basica
; -----------------------------
init_stack:
    ldi r16, high(RAMEND)
    out SPH, r16
    ldi r16, low(RAMEND)
    out SPL, r16
    ret

init_test_state:
    clr r16
    sts DBG_X_OUT, r16
    sts DBG_X_OUT + 1, r16
    sts DBG_Y_OUT, r16
    sts DBG_Y_OUT + 1, r16
    sts DBG_Z_OUT, r16
    sts DBG_Z_OUT + 1, r16
    sts DBG_ITER, r16
    ret

; -----------------------------
; cordic_rotate_q214
; Modo circular de rotacao
; Entrada:
;   r20:r21 = z0 em Q2.14
; Saida:
;   r22:r23 = x_final
;   r24:r25 = y_final
;   r20:r21 = z_final
; -----------------------------
cordic_rotate_q214:
    ; Estado inicial para calcular cos/sin:
    ; x0 = K, y0 = 0, z0 = angulo de entrada.
    ldi r22, low(CORDIC_GAIN_Q14)
    ldi r23, high(CORDIC_GAIN_Q14)
    clr r24
    clr r25

    sts CORDIC_X, r22
    sts CORDIC_X + 1, r23
    sts CORDIC_Y, r24
    sts CORDIC_Y + 1, r25
    sts CORDIC_Z, r20
    sts CORDIC_Z + 1, r21

    ; Z pointer aponta para a tabela atan(2^-i) em memoria de programa.
    ldi r30, low(cordic_atan_table_q14 * 2)
    ldi r31, high(cordic_atan_table_q14 * 2)
    clr r28

cordic_rotate_loop:
    ; Carrega atan(2^-i) da tabela.
    lpm r16, Z+
    lpm r17, Z+
    sts CORDIC_ATAN, r16
    sts CORDIC_ATAN + 1, r17

    ; x_shift = x >> i
    lds r18, CORDIC_X
    lds r19, CORDIC_X + 1
    mov r16, r28
    rcall arithmetic_shift_right_16
    sts CORDIC_X_SHIFT, r18
    sts CORDIC_X_SHIFT + 1, r19

    ; y_shift = y >> i
    lds r18, CORDIC_Y
    lds r19, CORDIC_Y + 1
    mov r16, r28
    rcall arithmetic_shift_right_16
    sts CORDIC_Y_SHIFT, r18
    sts CORDIC_Y_SHIFT + 1, r19

    ; Se z >= 0: rotacao positiva.
    ; Se z < 0: rotacao negativa.
    lds r21, CORDIC_Z + 1
    sbrc r21, 7
    rjmp cordic_rotate_negative

cordic_rotate_positive:
    ; x = x - y_shift
    lds r22, CORDIC_X
    lds r23, CORDIC_X + 1
    lds r18, CORDIC_Y_SHIFT
    lds r19, CORDIC_Y_SHIFT + 1
    sub r22, r18
    sbc r23, r19
    sts CORDIC_X, r22
    sts CORDIC_X + 1, r23

    ; y = y + x_shift
    lds r24, CORDIC_Y
    lds r25, CORDIC_Y + 1
    lds r18, CORDIC_X_SHIFT
    lds r19, CORDIC_X_SHIFT + 1
    add r24, r18
    adc r25, r19
    sts CORDIC_Y, r24
    sts CORDIC_Y + 1, r25

    ; z = z - atan
    lds r20, CORDIC_Z
    lds r21, CORDIC_Z + 1
    lds r18, CORDIC_ATAN
    lds r19, CORDIC_ATAN + 1
    sub r20, r18
    sbc r21, r19
    sts CORDIC_Z, r20
    sts CORDIC_Z + 1, r21
    rjmp cordic_rotate_next

cordic_rotate_negative:
    ; x = x + y_shift
    lds r22, CORDIC_X
    lds r23, CORDIC_X + 1
    lds r18, CORDIC_Y_SHIFT
    lds r19, CORDIC_Y_SHIFT + 1
    add r22, r18
    adc r23, r19
    sts CORDIC_X, r22
    sts CORDIC_X + 1, r23

    ; y = y - x_shift
    lds r24, CORDIC_Y
    lds r25, CORDIC_Y + 1
    lds r18, CORDIC_X_SHIFT
    lds r19, CORDIC_X_SHIFT + 1
    sub r24, r18
    sbc r25, r19
    sts CORDIC_Y, r24
    sts CORDIC_Y + 1, r25

    ; z = z + atan
    lds r20, CORDIC_Z
    lds r21, CORDIC_Z + 1
    lds r18, CORDIC_ATAN
    lds r19, CORDIC_ATAN + 1
    add r20, r18
    adc r21, r19
    sts CORDIC_Z, r20
    sts CORDIC_Z + 1, r21

cordic_rotate_next:
    inc r28
    sts DBG_ITER, r28
    cpi r28, CORDIC_ITERATIONS
    brsh cordic_rotate_done
    rjmp cordic_rotate_loop

cordic_rotate_done:
    ; Copia o resultado final para registradores e area de debug.
    lds r22, CORDIC_X
    lds r23, CORDIC_X + 1
    lds r24, CORDIC_Y
    lds r25, CORDIC_Y + 1
    lds r20, CORDIC_Z
    lds r21, CORDIC_Z + 1

    sts DBG_X_OUT, r22
    sts DBG_X_OUT + 1, r23
    sts DBG_Y_OUT, r24
    sts DBG_Y_OUT + 1, r25
    sts DBG_Z_OUT, r20
    sts DBG_Z_OUT + 1, r21
    ret

; -----------------------------
; arithmetic_shift_right_16
; Entrada:
;   r18:r19 = valor assinado de 16 bits
;   r16     = quantidade de deslocamentos
; Saida:
;   r18:r19 = valor deslocado aritmeticamente
; -----------------------------
arithmetic_shift_right_16:
    tst r16
    breq arithmetic_shift_right_done

arithmetic_shift_right_loop:
    asr r19
    ror r18
    dec r16
    brne arithmetic_shift_right_loop

arithmetic_shift_right_done:
    ret

; -----------------------------
; q214_mul_signed
; Multiplica dois valores assinados em Q2.14.
; Entrada:
;   r22:r23 = A
;   r24:r25 = B
; Saida:
;   r22:r23 = (A * B) >> 14
; -----------------------------
q214_mul_signed:
    clr r16

    ; Se A for negativo, usa o modulo e marca o sinal.
    sbrs r23, 7
    rjmp q214_mul_a_positive
    com r22
    com r23
    subi r22, 0xFF
    sbci r23, 0xFF
    ldi r16, 1

q214_mul_a_positive:
    ; Se B for negativo, usa o modulo e inverte o sinal final.
    sbrs r25, 7
    rjmp q214_mul_b_positive
    com r24
    com r25
    subi r24, 0xFF
    sbci r25, 0xFF
    ldi r17, 1
    eor r16, r17

q214_mul_b_positive:
    ; multiplicando de 32 bits = A
    mov r18, r22
    mov r19, r23
    clr r20
    clr r21

    ; produto de 32 bits = 0
    clr r26
    clr r27
    clr r30
    clr r31

    ldi r17, 16

q214_mul_loop:
    sbrs r24, 0
    rjmp q214_mul_skip_add
    add r26, r18
    adc r27, r19
    adc r30, r20
    adc r31, r21

q214_mul_skip_add:
    lsl r18
    rol r19
    rol r20
    rol r21

    lsr r25
    ror r24

    dec r17
    brne q214_mul_loop

    ; Ajuste de escala Q2.14: produto >> 14.
    ldi r17, Q14_SHIFT

q214_mul_shift_loop:
    lsr r31
    ror r30
    ror r27
    ror r26
    dec r17
    brne q214_mul_shift_loop

    mov r22, r26
    mov r23, r27

    tst r16
    breq q214_mul_done
    com r22
    com r23
    subi r22, 0xFF
    sbci r23, 0xFF

q214_mul_done:
    ret

; -----------------------------
; cordic_polar_to_rect_q214
; Converte coordenadas polares para retangulares.
; Entrada:
;   r18:r19 = raio r em Q2.14
;   r20:r21 = angulo em Q2.14
; Saida:
;   r22:r23 = x = r * cos(angulo)
;   r24:r25 = y = r * sin(angulo)
; -----------------------------
cordic_polar_to_rect_q214:
    sts POLAR_RADIUS, r18
    sts POLAR_RADIUS + 1, r19

    rcall cordic_rotate_q214

    sts POLAR_COS, r22
    sts POLAR_COS + 1, r23
    sts POLAR_SIN, r24
    sts POLAR_SIN + 1, r25

    ; x = r * cos(angulo)
    lds r22, POLAR_RADIUS
    lds r23, POLAR_RADIUS + 1
    lds r24, POLAR_COS
    lds r25, POLAR_COS + 1
    rcall q214_mul_signed
    sts POLAR_X, r22
    sts POLAR_X + 1, r23

    ; y = r * sin(angulo)
    lds r22, POLAR_RADIUS
    lds r23, POLAR_RADIUS + 1
    lds r24, POLAR_SIN
    lds r25, POLAR_SIN + 1
    rcall q214_mul_signed
    sts POLAR_Y, r22
    sts POLAR_Y + 1, r23

    mov r24, r22
    mov r25, r23
    lds r22, POLAR_X
    lds r23, POLAR_X + 1
    ret
