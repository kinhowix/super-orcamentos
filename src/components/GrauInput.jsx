import React, { useState, useEffect, useRef } from 'react';
import { processDiopterValue } from '../services/numericUtils';
import { useToast } from '../contexts/ToastContext';

/**
 * GrauInput - Componente especializado para inserção de graus / dioptrias.
 * 
 * Resolve o problema em dispositivos móveis (iOS Safari e Android) onde o
 * teclado numérico (inputmode="decimal" / type="number") não possui a tecla
 * de sinal negativo (-).
 * 
 * Funcionalidades:
 * - Botão integrado de sinal (+ / -) com feedback visual destacado (vermelho/verde)
 * - Toque/clique instantâneo que NÃO fecha o teclado no celular (preventDefault)
 * - Suporta digitação direta de '+' ou '-' em teclados físicos
 * - Mantém teclado numérico com ponto/vírgula no celular
 * - Auto-formatação de atalhos no blur/enter (ex: 200 -> 2.00, 20 -> 2.00, 25 -> 2.50, 12 -> 12.00)
 * - Bloqueio de passos inválidos: ajusta para o múltiplo de 0.25 mais próximo e notifica o usuário
 */
export default function GrauInput({
  value = '',
  onChange,
  onBlur,
  placeholder = '0.00',
  allowNegative = true,
  defaultNegative = false,
  className = '',
  disabled = false,
  ...rest
}) {
  const toast = useToast();
  const [internalSign, setInternalSign] = useState(() => (defaultNegative ? '-' : '+'));
  const [justAdjusted, setJustAdjusted] = useState(false);
  const inputRef = useRef(null);
  const lastToggleRef = useRef(0);

  // Sincroniza o sinal caso o valor externo mude (ex: carregamento de dados, OCR ou reset)
  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      const str = String(value).trim();
      if (str.startsWith('-')) {
        setInternalSign('-');
      } else if (str.startsWith('+') || parseFloat(str) > 0) {
        setInternalSign('+');
      }
    } else {
      setInternalSign(defaultNegative ? '-' : '+');
    }
  }, [value, defaultNegative]);

  const strVal = value !== undefined && value !== null ? String(value) : '';

  // Determina se o sinal ativo é negativo
  const isNegative = allowNegative && (
    strVal.startsWith('-') || (strVal === '' && internalSign === '-')
  );

  // Magnitude numérica sem sinal para exibição no campo de texto
  const displayMagnitude = strVal.replace(/^[+-]/, '');

  const toggleSign = () => {
    if (!allowNegative || disabled) return;
    const newSign = isNegative ? '+' : '-';
    setInternalSign(newSign);

    const mag = displayMagnitude.trim();
    if (mag !== '') {
      const newVal = newSign === '-' ? `-${mag}` : mag;
      onChange && onChange(newVal);
    } else {
      onChange && onChange(newSign === '-' ? '-' : '');
    }
  };

  const handleToggleEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (now - lastToggleRef.current < 200) return;
    lastToggleRef.current = now;

    toggleSign();
  };

  const handleInputChange = (e) => {
    let raw = e.target.value.replace(',', '.');
    let currentSign = internalSign;

    // Detecta se o usuário digitou '-' ou '+' diretamente (em teclado físico ou Gboard)
    if (allowNegative) {
      if (raw.includes('-')) {
        currentSign = '-';
        setInternalSign('-');
        raw = raw.replace(/-/g, '');
      } else if (raw.includes('+')) {
        currentSign = '+';
        setInternalSign('+');
        raw = raw.replace(/\+/g, '');
      }
    }

    // Permite apenas dígitos e no máximo um ponto decimal
    raw = raw.replace(/[^\d.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }

    if (raw === '') {
      onChange && onChange(currentSign === '-' ? '-' : '');
      return;
    }

    const newVal = (allowNegative && currentSign === '-') ? `-${raw}` : raw;
    onChange && onChange(newVal);
  };

  const handleBlur = (e) => {
    if (disabled) return;
    const raw = String(value || '').trim();
    if (raw === '' || raw === '-' || raw === '+') {
      if (raw === '-' || raw === '+') {
        onChange && onChange('');
      }
      onBlur && onBlur(e);
      return;
    }

    // Processa shorthand e dioptria
    const res = processDiopterValue(raw, allowNegative ? isNegative : false);

    if (res.wasAdjusted) {
      if (toast?.info) {
        toast.info(`⚠️ Grau ${res.adjustedFrom} ajustado para ${Math.abs(res.numericValue).toFixed(2)} (somente múltiplos de 0.25).`);
      }
      setJustAdjusted(true);
      setTimeout(() => setJustAdjusted(false), 2000);
    }

    if (raw !== res.formatted) {
      onChange && onChange(res.formatted);
    }

    onBlur && onBlur(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    rest.onKeyDown && rest.onKeyDown(e);
  };

  const isSm = className.includes('form-input-sm') || className.includes('ocr-result-input');

  return (
    <div className={`grau-input-group ${isSm ? 'is-sm' : ''} ${justAdjusted ? 'is-adjusted' : ''}`}>
      {allowNegative && (
        <button
          type="button"
          tabIndex={-1}
          className={`grau-sign-btn ${isNegative ? 'is-negative' : 'is-positive'}`}
          onMouseDown={handleToggleEvent}
          onTouchEnd={handleToggleEvent}
          onClick={handleToggleEvent}
          disabled={disabled}
          title={isNegative ? "Sinal negativo. Toque para alternar para +" : "Sinal positivo. Toque para alternar para -"}
          aria-label={isNegative ? "Grau negativo. Alternar para positivo" : "Grau positivo. Alternar para negativo"}
        >
          {isNegative ? '−' : '+'}
        </button>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className={`form-input grau-input-field ${allowNegative ? 'has-sign-btn' : ''} ${className}`}
        value={displayMagnitude}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        {...rest}
      />
    </div>
  );
}
