function createDraggableMenu() {
    // Criar container principal
    const menu = document.createElement('div');
    menu.id = 'hck-v4-menu';
    menu.style.cssText = `
        position: fixed;
        width: 260px;
        background: #1a1a1a;
        border-radius: 12px;
        padding: 8px;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        z-index: 9999;
        bottom: 20px;
        right: 20px;
        user-select: none;
    `;

    // Título (ícone do menu)
    const title = document.createElement('div');
    title.textContent = 'HCK V4';
    title.style.cssText = `
        text-align: center;
        font-size: 18px;
        font-weight: 600;
        padding: 5px 0;
        color: #a855f7;
        cursor: pointer;
    `;

    // Container de conteúdo (escondido inicialmente)
    const content = document.createElement('div');
    content.id = 'hck-v4-content';
    content.style.display = 'none'; // Começa fechado

    // Caixa de texto
    const input = document.createElement('textarea');
    input.id = 'hck-v4-input';
    input.placeholder = 'Cole sua pergunta aqui...';
    input.style.cssText = `
        width: 100%;
        height: 50px;
        background: #333;
        border: 1px solid #444;
        border-radius: 8px;
        color: #fff;
        padding: 6px;
        margin: 8px 0;
        resize: none;
        font-size: 13px;
        box-sizing: border-box;
    `;

    // Container dos botões
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;

    // Container para os botões de imagem
    const imageButtonContainer = document.createElement('div');
    imageButtonContainer.id = 'hck-v4-image-buttons';
    imageButtonContainer.style.cssText = `
        display: flex;
        gap: 8px;
    `;

    // Botão Atualizar Imagens
    const updateImagesBtn = document.createElement('button');
    updateImagesBtn.innerHTML = '<span style="margin-right: 4px;">🔄</span>Atualizar Imagens';
    updateImagesBtn.style.cssText = `
        flex: 1;
        padding: 6px;
        background: linear-gradient(to right, #ff6e7f, #a855f7);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        cursor: pointer;
        transition: opacity 0.2s;
    `;
    updateImagesBtn.addEventListener('mouseover', () => updateImagesBtn.style.opacity = '0.8');
    updateImagesBtn.addEventListener('mouseout', () => updateImagesBtn.style.opacity = '1');

    // Função para atualizar os botões de imagem dinamicamente
    function updateImageButtons(images) {
        imageButtonContainer.innerHTML = ''; // Limpar botões existentes
        imageButtonContainer.appendChild(updateImagesBtn); // Sempre manter o botão "Atualizar Imagens"

        if (images.length === 0) return; // Não adicionar botões se não houver imagens

        // Criar botões para cada imagem (máximo 2 para manter compacto)
        images.slice(0, 2).forEach((_, index) => {
            // Botão Mostrar Imagem
            const showImageBtn = document.createElement('button');
            showImageBtn.innerHTML = `<span style="margin-right: 4px;">🖼️</span>Imagem ${index + 1}`;
            showImageBtn.style.cssText = `
                flex: 1;
                padding: 6px;
                background: #333;
                color: #fff;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                cursor: pointer;
                transition: opacity 0.2s;
            `;
            showImageBtn.addEventListener('mouseover', () => showImageBtn.style.opacity = '0.8');
            showImageBtn.addEventListener('mouseout', () => showImageBtn.style.opacity = '1');

            // Botão Copiar URL
            const copyUrlBtn = document.createElement('button');
            copyUrlBtn.innerHTML = `<span style="margin-right: 4px;">📋</span>Copiar URL`;
            copyUrlBtn.style.cssText = `
                flex: 1;
                padding: 6px;
                background: linear-gradient(to right, #ff6e7f, #a855f7);
                color: #fff;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                cursor: pointer;
                transition: opacity 0.2s;
            `;
            copyUrlBtn.addEventListener('mouseover', () => copyUrlBtn.style.opacity = '0.8');
            copyUrlBtn.addEventListener('mouseout', () => copyUrlBtn.style.opacity = '1');

            // Adicionar botões ao container
            const imageOptionContainer = document.createElement('div');
            imageOptionContainer.style.cssText = `
                display: flex;
                gap: 8px;
                margin-top: 8px;
            `;
            imageOptionContainer.appendChild(showImageBtn);
            imageOptionContainer.appendChild(copyUrlBtn);
            imageButtonContainer.appendChild(imageOptionContainer);
        });

        return imageButtonContainer.querySelectorAll('button:not([innerHTML*="Atualizar Imagens"])');
    }

    // Botão Analisar
    const analyzeBtn = document.createElement('button');
    analyzeBtn.innerHTML = '<span style="margin-right: 4px;">🔍</span>Analisar';
    analyzeBtn.style.cssText = `
        width: 100%;
        padding: 6px;
        background: linear-gradient(to right, #ff6e7f, #a855f7);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        cursor: pointer;
        transition: opacity 0.2s;
    `;
    analyzeBtn.addEventListener('mouseover', () => analyzeBtn.style.opacity = '0.8');
    analyzeBtn.addEventListener('mouseout', () => analyzeBtn.style.opacity = '1');

    // Botão Limpar
    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '<span style="margin-right: 4px;">🗑️</span>Limpar';
    clearBtn.style.cssText = `
        width: 100%;
        padding: 6px;
        background: linear-gradient(to right, #ff6e7f, #a855f7);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        cursor: pointer;
        transition: opacity 0.2s;
    `;
    clearBtn.addEventListener('mouseover', () => clearBtn.style.opacity = '0.8');
    clearBtn.addEventListener('mouseout', () => clearBtn.style.opacity = '1');

    // Painel de resposta
    const responsePanel = document.createElement('div');
    responsePanel.id = 'hck-response-panel';
    responsePanel.style.display = 'none';

    // Função para abrir/fechar o menu
    let isOpen = false;
    title.addEventListener('click', () => {
        isOpen = !isOpen;
        content.style.display = isOpen ? 'block' : 'none';
        menu.style.padding = isOpen ? '8px' : '8px 8px 0 8px';
    });

    // Função para tornar o menu arrastável
    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    title.addEventListener('mousedown', startDragging);
    title.addEventListener('touchstart', startDragging);

    function startDragging(e) {
        isDragging = true;
        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX - currentX;
            initialY = e.touches[0].clientY - currentY;
        } else {
            initialX = e.clientX - currentX;
            initialY = e.clientY - currentY;
        }
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', stopDragging);
        document.addEventListener('touchend', stopDragging);
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }
            menu.style.right = 'auto';
            menu.style.bottom = 'auto';
            menu.style.left = `${currentX}px`;
            menu.style.top = `${currentY}px`;
        }
    }

    function stopDragging() {
        isDragging = false;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', stopDragging);
        document.removeEventListener('touchend', stopDragging);
    }

    // Posição inicial
    currentX = window.innerWidth - 260;
    currentY = window.innerHeight - 60;

    // Montar o menu
    buttonContainer.append(imageButtonContainer, analyzeBtn, clearBtn);
    content.append(input, buttonContainer, responsePanel);
    menu.append(title, content);
    document.body.appendChild(menu);

    // Ajustar para mobile
    if (window.innerWidth <= 768) {
        menu.style.width = '90%';
        menu.style.right = '5%';
        menu.style.left = 'auto';
        currentX = window.innerWidth * 0.05;
    }

    // Inicializar botões de imagem (vazio inicialmente)
    const imageButtons = updateImageButtons([]);

    return {
        input,
        analyzeOption: analyzeBtn,
        clearOption: clearBtn,
        updateImagesOption: updateImagesBtn,
        imageOptions: Array.from(imageButtons).filter((_, i) => i % 2 === 0), // Botões "Imagem X"
        copyUrlOptions: Array.from(imageButtons).filter((_, i) => i % 2 === 1), // Botões "Copiar URL"
        responsePanel
    };
}

function showResponse(responsePanel, rawAnswer, displayAnswer) {
    responsePanel.innerHTML = displayAnswer;
    responsePanel.style.display = 'block';
    responsePanel.style.background = rawAnswer ? '#1a1a1a' : '#ff4444';
    responsePanel.style.color = '#fff';
    responsePanel.style.padding = '8px';
    responsePanel.style.borderRadius = '8px';
    responsePanel.style.marginTop = '8px';
    responsePanel.style.textAlign = 'center';
    responsePanel.style.fontSize = '12px';
}

// Expor funções globalmente
window.createUI = createDraggableMenu;
window.showResponse = showResponse;
window.updateImageButtons = (images) => {
    const imageButtonContainer = document.getElementById('hck-v4-image-buttons');
    const updateImagesBtn = imageButtonContainer.querySelector('button[innerHTML*="Atualizar Imagens"]');
    const buttons = createDraggableMenu().updateImageButtons(images);
    imageButtonContainer.innerHTML = '';
    imageButtonContainer.appendChild(updateImagesBtn);
    buttons.forEach(btn => imageButtonContainer.appendChild(btn.parentElement));
    return buttons;
};
