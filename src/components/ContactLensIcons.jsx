import React from 'react'

/**
 * Ícone do Estojo Duplo de Lentes de Contato com sinal de +
 * Usado para: Cadastrar Contato
 */
export function ContactLensCasePlusIcon({ size = 20, color = 'currentColor', strokeWidth = 2, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Estojo com dois compartimentos na base */}
      <circle cx="6.5" cy="14" r="3.5" />
      <circle cx="13.5" cy="14" r="3.5" />
      <path d="M10 14h.01" />
      {/* Sinal de mais no canto superior direito */}
      <path d="M19 4v6" />
      <path d="M16 7h6" />
    </svg>
  )
}

/**
 * Ícone do Estojo Duplo de Lentes de Contato (R/L)
 * Usado para: Catálogo Contato
 */
export function ContactLensCaseIcon({ size = 20, color = 'currentColor', strokeWidth = 2, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Compartimento esquerdo (Lente esquerda) */}
      <circle cx="7" cy="12" r="4.5" />
      <circle cx="7" cy="12" r="1.8" />
      {/* Ponte de união central */}
      <path d="M11.5 12h1" />
      {/* Compartimento direito (Lente direita) */}
      <circle cx="17" cy="12" r="4.5" />
      <circle cx="17" cy="12" r="1.8" />
    </svg>
  )
}

/**
 * Ícone de Pedido/Orçamento com Estojo de Lentes de Contato
 * Usado para: Orçamento Contato
 */
export function ContactLensQuoteIcon({ size = 20, color = 'currentColor', strokeWidth = 2, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Prancha de pedido / folha de orçamento */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      {/* Estojo de lentes desenhado na ficha */}
      <circle cx="9" cy="15" r="2" />
      <circle cx="14" cy="15" r="2" />
      <path d="M11 15h1" />
    </svg>
  )
}
