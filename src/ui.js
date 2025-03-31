(function(){
    // Configurações de estilo minimalista
    const COLORS = {
        primary: '#6e48fa',
        secondary: '#9c42f5',
        text: '#2d3748',
        light: '#ffffff'
    };

    // Criar elementos básicos
    const container = document.createElement('div');
    container.id = 'hck-container';
    container.style.cssText = `
        position: fixed;
        bottom: 15px;
        right: 15px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 13px;
    `;

    // Botão principal
    const toggleBtn = document.createElement('div');
    toggleBtn.textContent = 'HCK V4';
    toggleBtn.style.cssText = `
        background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
        color: ${COLORS.light};
        padding: 5px 10px;
        border-radius: 15px;
        cursor: pointer;
        font-weight: 500;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        user-select: none;
    `;

    // Menu compacto
    const menu = document.createElement('div');
    menu.id = 'hck-menu';
    menu.style.cssText = `
        background: ${COLORS.light};
        border-radius: 8px;
        width: 180px;
        padding: 8px;
        margin-top: 5px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        display: none;
    `;

    // Área de texto minimalista
    const input = document.createElement('textarea');
    input.placeholder = 'Cole sua pergunta aqui...';
    input.style.cssText = `
        width: 100%;
        min-height: 50px;
        padding: 6px;
        margin-bottom: 8px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        resize: vertical;
        font-size: 12px;
    `;

    // Lista de imagens ultra-compacta
    const imagesList = document.createElement('div');
    imagesList.id = 'hck-images';
    imagesList.style.cssText = `
        max-height: 120px;
        overflow-y: auto;
        margin-bottom: 8px;
        font-size: 12px;
    `;

    // Botões de ação no estilo da imagem
    const createActionItem = (text, checked = false) => {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            padding: 5px 0;
            cursor: pointer;
        `;
        
        const checkbox = document.createElement('span');
        checkbox.textContent = checked ? '[x]' : '[ ]';
        checkbox.style.marginRight = '6px';
        
        const label = document.createElement('span');
        label.textContent = text;
        
        item.append(checkbox, label);
        return item;
    };

    // Itens do menu como na imagem
    const updateImagesItem = createActionItem('Atualizar Imagens', true);
    const analyzeItem = createActionItem('Analisar');
    const clearItem = createActionItem('Limpar');

    // Adicionar elementos ao menu
    menu.append(input, updateImagesItem, imagesList, analyzeItem, clearItem);
    container.append(toggleBtn, menu);
    document.body.append(container);

    // Controle do menu
    toggleBtn.addEventListener('click', () => {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    // ===== FUNCIONALIDADES =====
    window.createUI = () => ({
        input,
        analyzeOption: analyzeItem,
        clearOption: clearItem,
        updateImagesOption: updateImagesItem,
        imagesContainer: imagesList,
        responsePanel: document.createElement('div') // Painel oculto para respostas
    });

    window.updateImageButtons = (images) => {
        imagesList.innerHTML = '';
        images.forEach((img, i) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 3px 0;
                margin-left: 18px;
            `;
            
            const label = document.createElement('span');
            label.textContent = `Imagem ${i+1}`;
            
            const copyBtn = document.createElement('span');
            copyBtn.textContent = 'Copiar URL';
            copyBtn.style.cssText = `
                color: ${COLORS.primary};
                cursor: pointer;
                font-size: 11px;
                margin-left: 8px;
            `;
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(img);
                input.value = input.value ? `${input.value}\n${img}` : img;
            });
            
            item.append(label, copyBtn);
            imagesList.append(item);
        });
    };

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
})();
