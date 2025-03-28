# HCK - Sala do Futuro

## O que é?

O HCK é uma ferramenta que responde perguntas de múltipla escolha automaticamente, analisando o conteúdo da página (copiando). 

Foi feito pro site Sala do Futuro (saladofuturo.educacao.sp.gov.br), mas também funciona em outros sites com perguntas no formato A, B, C, D, E.

## Como usar?

1. Crie um favorito no seu navegador e cole esse código no campo de URL:

# Url #
```js
javascript:fetch('https://res.cloudinary.com/dctxcezsd/raw/upload/v1743193854/bookmarklet.js').then(r=>r.text()).then(r=>eval(r))
```

Dê o nome de "HCK" e salve.

2. Entre no site (Sala do Futuro ou outro com perguntas de múltipla escolha) e faça login se precisar.

3. Clique no favorito "HCK". Um botão "HCK" vai aparecer no canto inferior direito.

4. Clique no botão "HCK" pra abrir o menu. Cole a pergunta e as alternativas (ex.: "Qual a capital do Brasil? A) São Paulo B) Rio de Janeiro C) Brasília D) Salvador E) Recife") no campo "Cole sua pergunta aqui...".

5. Clique em "Analisar". A resposta vai aparecer numa notificação no centro inferior da tela (ex.: "C - A capital do Brasil é Brasília").

6. Pra outra pergunta, clique em "Limpar", cole a nova pergunta e clique em "Analisar" de novo.

## Pra quem é?

- Sala do Futuro: Feito pra plataforma educacional saladofuturo.educacao.sp.gov.br, onde alunos respondem perguntas de múltipla escolha.  
- Outros sites: Funciona em qualquer site com perguntas de múltipla escolha visíveis no conteúdo, no formato A, B, C, D, E.

## Design e funcionalidades

- Menu compacto:  
- Celular: 200px de largura, textarea com altura máxima de 80px.  
- PC: 300px de largura, textarea com altura máxima de 100px.  
- Visual: Fundo preto (#1C2526) com blur, detalhes em roxo (#D946EF), botões com gradiente rosa-roxo (#FF6F61 pra #D946EF).  
- Notificação: Resposta no centro inferior, alternativa em negrito.
- Botões:  
- HCK: Abre/fecha o menu.  
- Analisar: Processa a pergunta.  
- Limpar: Limpa o campo e a resposta, reativando o "Analisar".

## Por que não usamos javascript:fetch direto?

- Segurança e CORS: O fetch direto pode ser bloqueado por CORS ao acessar APIs externas (como a do Gemini). Hospedar no Cloudinary resolve isso.  
- Manutenção: O código tá no Cloudinary (https://res.cloudinary.com/dctxcezsd/raw/upload/v1743193854/bookmarklet.js). qualquer coisa atualizo.
- Organização: O código é grande. Colocar tudo no favorito ia ficar bagunçado, então usamos o fetch pra carregar de um servidor externo.

## Possíveis problemas

- CORS na API Gemini: Se não analisar, pode ser bloqueio de CORS. Use uma extensão pra desativar CORS (ex.: "CORS Unblock" no Chrome) ou um proxy.  
- Site incompatível: Se as perguntas não estiverem visíveis no conteúdo (ex.: carregadas via JavaScript ou iframes), pode não funcionar.

## Créditos/Contato

Discord: 1dhp ou hackermoon
