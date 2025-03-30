(function() {
  // Verifica se está no domínio correto (especifico esse)
  if (window.location.hostname !== "saladofuturo.educacao.sp.gov.br") return;

  // Configurações da API
  const API_KEY = "AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY";
  const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  const UI_SCRIPT_URL = "https://res.cloudinary.com/dctxcezsd/raw/upload/v1743378525/ui.js";
  
  // Cache de respostas
  const responseCache = new Map();
  let lastRequestTime = 0;
  const RATE_LIMIT_DELAY = 500; // ms

  // Carrega o script de UI
  fetch(UI_SCRIPT_URL)
    .then(response => response.text())
    .then(scriptContent => {
      eval(scriptContent);
      
      let isAnalyzing = false;
      
      // Função para controlar o estado de análise
      function setIsAnalyzing(state) {
        isAnalyzing = state;
      }
      
      // Extrai conteúdo da página
      function extractPageContent() {
        const body = document.querySelector("body") || document.documentElement;
        
        // Remove elementos não relevantes
        ["script", "style", "noscript", "svg", "iframe", "head"].forEach(tag => {
          body.querySelectorAll(tag).forEach(el => el.remove());
        });
        
        // Obtém imagens e texto
        const images = Array.from(document.querySelectorAll("img"))
          .map(img => img.src)
          .filter(src => src && src.startsWith("http") && !src.includes("edusp-static.ip.tv/sala-do-futuro"))
          .slice(0, 50);
          
        const text = (body.textContent || "")
          .replace(/\s+/g, " ")
          .substring(0, 15000);
          
        return { text, images };
      }
      
      // Faz a requisição para a API Gemini
      async function analyzeContent(pageContent, question) {
        if (!question.trim()) {
          return { answer: "", correctAlternative: "Por favor, cole uma pergunta com alternativas." };
        }
        
        const cacheKey = question + JSON.stringify(pageContent);
        
        // Verifica cache
        if (responseCache.has(cacheKey)) {
          setIsAnalyzing(false);
          return responseCache.get(cacheKey);
        }
        
        // Limpa cache se necessário
        if (responseCache.size > 50) {
          responseCache.clear();
        }
        
        // Rate limiting
        const currentTime = Date.now();
        if (currentTime - lastRequestTime < RATE_LIMIT_DELAY) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - (currentTime - lastRequestTime)));
        }
        lastRequestTime = currentTime;
        
        // Extrai URL de imagem se existir
        const imageMatch = question.match(/\[Imagem: (https:\/\/[^\]]+)\]/);
        const imageUrl = imageMatch ? imageMatch[1] : null;
        const cleanQuestion = question.replace(/\[Imagem: https:\/\/[^\]]+\]/, "").trim();
        
        // Monta o prompt
        const prompt = `Responda com a alternativa correta (A-E). Pergunta: ${cleanQuestion}\nTexto: ${pageContent.text}${
          imageUrl ? `\nImagem: ${imageUrl}` : ""
        }`;
        
        try {
          const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 5,
                temperature: 0.1
              }
            })
          });
          
          const data = await response.json();
          const answerText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Erro";
          const alternativeMatch = answerText.match(/[A-E]/i);
          const correctAlternative = alternativeMatch ? alternativeMatch[0] : "Erro";
          
          const result = { answer: "", correctAlternative };
          responseCache.set(cacheKey, result);
          return result;
        } catch (error) {
          console.error("Erro na API:", error);
          return { answer: "", correctAlternative: "Erro" };
        } finally {
          setIsAnalyzing(false);
        }
      }
      
      // Cria a UI
      const {
        menuBtn,
        analyzeOption,
        clearOption,
        input,
        responsePanel
      } = window.createUI();
      
      if (!menuBtn) return;
      
      // Event listeners
      menuBtn.addEventListener("click", () => {
        const menu = document.getElementById("gemini-menu");
        menu.style.display = menu.style.display === "flex" ? "none" : "flex";
      });
      
      analyzeOption.addEventListener("click", async () => {
        if (isAnalyzing) return;
        
        const question = input.value.trim();
        if (!question) {
          return window.showResponse(responsePanel, "", "Por favor, cole uma pergunta com alternativas.");
        }
        
        isAnalyzing = true;
        analyzeOption.disabled = true;
        analyzeOption.innerHTML = '<span style="margin-right: 8px;">⏳</span>Analisando...';
        analyzeOption.style.opacity = "0.7";
        
        const pageContent = extractPageContent();
        const { answer, correctAlternative } = await analyzeContent(pageContent, question);
        
        window.showResponse(responsePanel, answer, correctAlternative);
        analyzeOption.disabled = false;
        analyzeOption.innerHTML = '<span style="margin-right: 8px;">🔍</span>Analisar';
        analyzeOption.style.opacity = "1";
        document.getElementById("gemini-menu").style.display = "none";
      });
      
      clearOption.addEventListener("click", () => {
        window.clearUI(input, responsePanel, analyzeOption, setIsAnalyzing);
        document.getElementById("gemini-menu").style.display = "none";
      });
      
      document.addEventListener("click", event => {
        if (!event.target.closest("#gemini-helper-container") && 
            !event.target.closest("#gemini-response-panel")) {
          document.getElementById("gemini-menu").style.display = "none";
        }
      });
    })
    .catch(error => {
      console.error("Erro ao carregar ui.js:", error);
    });
})();
