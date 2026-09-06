# ADR-001 — Widget em TypeScript vanilla (sem React)

Data: 2026-09-06

## Contexto

A spec M5 pede `apps/widget` com "build IIFE `widget.js` (< 200kb gzip)". O
repo usa React 19 no dashboard.

## Decisão

Implementar o widget em **TypeScript vanilla + Shadow DOM**, sem React.

## Motivos

1. **Isolamento em páginas de terceiros**: o widget roda dentro de sites
   arbitrários. React exposto globalmente (ou duplicado) conflita com o app
   hospedeiro; vanilla + Shadow DOM não vaza nada (CSS, eventos, globals).
2. **Tamanho**: sem react-dom, o bundle minificado fica em ~15–25kb
   (folga enorme contra o teto de 200kb gzip da spec).
3. **Superfície pequena**: bolha + painel + thread + pré-chat não precisam de
   reconciliação; uma máquina de estados explícita (`home → prechat →
thread`) é mais simples de auditar que hooks num iframe-less embed.

## Consequências

- `window.chatwootSettings` e `window.$chatwoot` seguem 100% compatíveis com
  o snippet do Chatwoot (mesma API pública).
- Se um dia o widget precisar de telas complexas (KB search, campanhas
  ricas), reavaliar Preact (3kb) — nunca React full.
