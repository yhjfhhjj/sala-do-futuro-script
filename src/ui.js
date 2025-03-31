(function(){
    // Configuração visual
    const estilo = {
        cores: {
            principal: '#6e48fa',
            fundo: '#fff',
            texto: '#333',
            border: '#e2e8f0'
        }
    };

    // Container principal
    const container = document.createElement('div');
    container.id = 'hck-blackbox-ui';
    container.style.cssText = `
        position: fixed;
        bottom: 15px;
        right: 15px;
        z-index: 9999;
        font-family: 'Segoe UI', sans-serif;
    `;

    // Botão toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'HCK Blackbox';
    toggleBtn.style.cssText = `
        background: ${estilo.cores.principal};
        color: white;
        padding: 7px 14px;
        border: none;
        border-radius: 15px;
        cursor: pointer;
        font-weight: 600;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    `;

    // Menu principal
    const menu = document.createElement('div');
    menu.id = 'hck-menu';
    menu.style.cssText = `
        background: ${estilo.cores.fundo};
        width: 250px;
        padding: 10px;
        margin-top: 8px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        display: none;
        border: 1px solid ${estilo.cores.border};
    `;

    // Componentes do menu
    const input = document.createElement('textarea');
    input.placeholder = 'Cole a questão aqui...';
    input.style.cssText = `
        width: 100%;
        min-height: 70px;
        padding: 8px;
        margin-bottom: 10px;
        border: 1px solid ${estilo.cores.border};
        border-radius: 6px;
        resize: vertical;
    `;

    const imagesContainer = document.createElement('div');
    imagesContainer.style.cssText = `
        max-height: 120px;
        overflow-y: auto;
        margin-bottom: 10px;
        font-size: 13px;
    `;

    const analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = '🔍 Analisar';
    analyzeBtn.style.cssText = `
        width: 100%;
        padding: 8px;
        background: ${estilo.cores.principal};
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        margin-bottom: 8px;
    `;

    const responsePanel = document.createElement('div');
    responsePanel.style.cssText = `
        padding: 8px;
        background: #f8fafc;
        border-radius: 6px;
        display: none;
        font-size: 13px;
        border-left: 3px solid ${estilo.cores.principal};
    `;

    // Montagem
    menu.append(input, imagesContainer, analyzeBtn, responsePanel);
    container.append(toggleBtn, menu);
    document.body.append(container);

    // Controles
    toggleBtn.addEventListener('click', () => {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    // API para o bookmarklet
    window.createUI = () => ({
        input,
        analyzeOption: analyzeBtn,
        responsePanel,
        imagesContainer
    });

    window.updateImageButtons = (images) => {
        imagesContainer.innerHTML = images.map((img, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0;">
                <span>Imagem ${i+1}</span>
                <button onclick="navigator.clipboard.writeText('${img}')" 
                        style="background:#e3f2fd; color:#1976d2; border:none; border-radius:3px; padding:3px 6px; font-size:11px; cursor:pointer;">
                    Copiar
                </button>
            </div>
        `).join('') || '<div style="color:#666; text-align:center; padding:8px;">Nenhuma imagem</div>';
    };

    window.showResponse = (panel, text) => {
        panel.innerHTML = text;
        panel.style.display = 'block';
    };
})();
