# 📖 HCK Bookmarklet - Sala do Futuro

Ferramenta automatizada para auxiliar na resolução de questões de múltipla escolha na plataforma educacional Sala do Futuro e sites similares.

## 🌟 Funcionalidades

- 🔍 Análise automática de questões objetivas (A/B/C/D/E)
- 📱 Design responsivo para desktop e mobile
- 🔔 Notificações temporizadas (6 segundos)
- 🎨 Interface minimalista com efeitos visuais
- 🧹 Botão de limpeza para nova consulta

## 🚀 Como Instalar

1. Abra seu navegador (Chrome, Firefox, Edge)
2. Crie um novo favorito/bookmark
3. No campo URL, cole:
```js
javascript
javascript:fetch('https://res.cloudinary.com/dctxcezsd/raw/upload/v1743193854/bookmarklet.js').then(r=>r.text()).then(r=>eval(r))
