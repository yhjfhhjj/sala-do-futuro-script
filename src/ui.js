function createDraggableMenu() {
    // Criar container principal
    const menu = document.createElement('div');
    menu.id = 'hck-v4-menu';
    menu.style.cssText = `
        position: fixed;
        width: 280px;
        background: #000;
        border-radius: 12px;
        padding: 10px;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        z-index: 9999;
        top: 20px;
        left: 20px;
        user-select: none;
    `;

    // Título
    const title = document.createElement('div');
    title.textContent = 'HCK V4';
    title.style.cssText = `
        text-align: center;
        font-size: 16px;
        font-weight: 600;
        padding: 5px 0;
        border-bottom: 1px solid #333;
        cursor: move;
    `;

    // Caixa de texto
    const input = document.createElement('textarea');
    input.id = 'hck-v4-input';
    input.placeholder = 'Cole a questão aqui...';
    input.style.cssText = `
        width: 100%;
        height: 80px;
        background: #1a1a1a;
        border: none;
        border-radius: 8px;
        color: #fff;
        padding: 8px;
        margin: 10px 0;
        resize: none;
        font-size: 14px;
        box-sizing: border-box;
    `;

    // Container dos botões
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
    `;

    // Botão Analisar
    const analyzeBtn = document.createElement('button');
    analyzeBtn.innerHTML = '<span style="margin-right: 6px;">🔍</span>Analisar';
    analyzeBtn.style.cssText = `
        flex: 1;
        padding: 8px;
        background: #fff;
        color: #000;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: opacity 0.2s;
    `;
    analyzeBtn.addEventListener('mouseover', () => analyzeBtn.style.opacity = '0.8');
    analyzeBtn.addEventListener('mouseout', () => analyzeBtn.style.opacity = '1');

    // Botão Limpar
    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '<span style="margin-right: 6px;">🗑️</span>Limpar';
    clearBtn.style.cssText = `
        flex: 1;
        padding: 8px;
        background: #333;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: opacity 0.2s;
    `;
    clearBtn.addEventListener('mouseover', () => clearBtn.style.opacity = '0.8');
    clearBtn.addEventListener('mouseout', () => clearBtn.style.opacity = '1');

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
    currentX = 20;
    currentY = 20;

    // Montar o menu
    buttonContainer.append(analyzeBtn, clearBtn);
    menu.append(title, input, buttonContainer);
    document.body.appendChild(menu);

    // Funcionalidades dos botões
    analyzeBtn.addEventListener('click', () => {
        console.log('Analisar clicado:', input.value);
        // Aqui você pode integrar com a função analyzeQuestion() do código original
    });

    clearBtn.addEventListener('click', () => {
        input.value = '';
    });

    // Ajustar para mobile
    if (window.innerWidth <= 768) {
        menu.style.width = '90%';
        menu.style.left = '5%';
        currentX = window.innerWidth * 0.05;
    }
}

// Inicializar o menu
createDraggableMenu();
