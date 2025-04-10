# 🚀 HCK - PROVA PAULISTA ENHANCED (v7.5+)

---
### 📢 Importante:

O script está funcional e otimizado, mas a precisão absoluta depende da qualidade da questão e das respostas da IA. Use com atenção e reporte bugs.

---

## 📌 Visão Geral:
Solução educacional avançada para análise de questões da Prova Paulista/Sala do Futuro. Utiliza múltiplos modelos de IA (Gemini 1.5 Pro & Flash - latest) com foco em **precisão otimizada**, **robustez para múltiplos usuários**, usabilidade e um design refinado estilo iOS.

### ✨ Principais Recursos Atuais (v7.5.4)
| Recurso                     | Detalhe                                                                                                  |
| :-------------------------- | :------------------------------------------------------------------------------------------------------- |
| 🧠 **Análise Multi-Modelo**     | Usa Gemini 1.5 Pro + Flash (`latest`) para consenso e maior confiabilidade.                                |
| 🎯 **Precisão Otimizada**     | Lógica de consenso mais estrita, prompts detalhados e parâmetros ajustados (temp/tokens) para focar na resposta A-E. |
| 🔑 **Rotação de Chaves API**    | Distribui as requisições entre múltiplas chaves API para evitar limites individuais (requer configuração). |
| 🛡️ **Anti-Rate Limit**        | Detecta limites de requisição (429), aplica espera maior (backoff) e informa na interface.             |
| ⚡ **Respostas Rápidas**       | Otimizado para velocidade, com cache de imagens e modelos eficientes.                                        |
| 📱 **UI Refinada (iOS)**      | Interface dark mode limpa, compacta e intuitiva, inspirada no iOS.                                         |
| 🔔 **Notificações**         | Feedback visual externo (sucesso, erro, aviso, info) com auto-close.                                     |
| 📋 **Logs Detalhados**        | Ferramenta de diagnóstico com botão "Copiar Logs", cores e dicas de erros (incluindo Rate Limit).          |
| 🖼️ **Extração de Imagens**    | Detecta e inclui imagens relevantes da questão na análise AI, com filtros para evitar lixo.              |
| ✅ **Integração Total**       | Funciona diretamente na plataforma Sala do Futuro.                                                         |

---

## 📥 Instalação Rápida:

### 1. Instalar o Tampermonkey
Adicione a extensão ao seu navegador:
- [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) / [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/) / [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 2. Instalar o Script HCK (Versão Mais Recente)
- **Opção 1:** [Instalar via GreasyFork (Link Atualizado)](https://greasyfork.org/pt-BR/scripts/532137-hck-prova-paulista-enhanced) *(Recomendado)*
- **Opção 2:** Crie um novo script no Tampermonkey e cole o código-fonte mais recente obtido diretamente.

### 3. Acessar a Plataforma
- Navegue até [Sala do Futuro](https://saladofuturo.educacao.sp.gov.br) e o ícone flutuante "HCK" aparecerá no canto inferior direito.

---

## ✅ Compatibilidade
Testado e funcional nos principais navegadores com suporte a Tampermonkey:

| Navegador    | Status | Versão Testada |
| :----------- | :----- | :------------- |
| Chrome       | 👍     | v120+          |
| Firefox      | 👍     | v115+          |
| Edge         | 👍     | v120+          |
| Opera        | 👍     | v95+           |
| Kiwi Browser | 👍     | v120+ (Android)|

---

## 💡 Dicas de Uso

1.  **Input Completo:**
    - Cole o texto **completo** da questão, incluindo o enunciado e **todas** as alternativas (A, B, C, D, E) na área designada. A precisão depende disso!
2.  **Verificar Imagens:**
    - O script tenta detectar imagens automaticamente. Clique no botão **"Atualizar Imagens"** para confirmar quais foram encontradas antes de analisar.
3.  **Rate Limit (Limite Atingido):**
    - Se você vir a mensagem "Limite Atingido..." no botão ou em notificações, significa que as chaves API atingiram um limite temporário. Aguarde alguns minutos antes de tentar novamente. A rotação de chaves ajuda a mitigar isso.
4.  **Performance:**
    - Uma conexão estável com a internet é recomendada.
    - Mantenha seu navegador atualizado.
    - Evite executar muitas abas/extensões pesadas simultaneamente.
5.  **Feedback e Logs:**
    - Observe as **notificações** para o resultado final (✅ Sucesso, ❌ Falha, ⚠️ Aviso/Ambíguo, ℹ️ Info).
    - Se ocorrer um erro ou resultado inesperado, use o botão **"Ver Logs"** e depois **"Copiar Logs"** para facilitar o reporte de bugs. Os logs agora incluem mais detalhes sobre falhas e rate limits.

---

## 🛠️ Desenvolvimento

**Discord**: `hackermoon` (Mande sugestões, reporte bugs ou troque ideias!)

**Github**: [Reportar Issues](https://github.com/hackermoon1/sala-do-futuro-script/issues) (Verificar se este é o repo correto)

**Tecnologias Utilizadas**:
- <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg" width="14"> Google Gemini AI (`gemini-1.5-pro-latest`, `gemini-1.5-flash-latest`)
- <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="14"> JavaScript (ES6+)
- Tampermonkey API

**Licença**:
📜 MIT License - Uso livre, principalmente para fins educacionais. Modifique e distribua com responsabilidade.

<div align="center" style="margin-top:20px">
  <sub>Versão 7.6.1 | Atualizado em 10/05/2024</sub>
  <br>
  <strong>by Hackermoon</strong>
</div>

---
