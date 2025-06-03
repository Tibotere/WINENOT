document.addEventListener('DOMContentLoaded', function() {
  const canvas = new fabric.Canvas('glass-preview', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true,
    uniformScaling: false,
    controlsAboveOverlay: true
  });

  const state = {
    glassType: 'wine',
    texts: [],
    activeTextId: null,
    font: 'Monly Lite',
    fontSize: 24,
    color: '#8f8f8f',
    textAlign: 'center',
    activeTool: 'select',
    template: null,
    zoom: 1.0,
    cliparts: [],
    nextId: 1,
    currentTemplate: null,
    backgroundImage: null,
    rotationStep: 1,
    flipX: false,
    flipY: false,
    isMobile: window.matchMedia("(max-width: 768px)").matches,
    baseScale: 1.0,
    isDesignSaved: false,
    hasUnsavedChanges: false,
    showLeaveWarning: false,// Функции для работы с модальным окном предупреждения о несохраненном дизайне
    leaveCallback: null // Функции для работы с модальным окном предупреждения о несохраненном дизайне
  };

 // Функции для работы с модальным окном предупреждения о несохраненном дизайне
  function showLeaveModal(callback) {
    state.showLeaveWarning = true;
    state.leaveCallback = callback;
    document.getElementById('unsaved-changes-modal').style.display = 'flex';
  }

  function hideLeaveModal() {
    state.showLeaveWarning = false;
    document.getElementById('unsaved-changes-modal').style.display = 'none';
  }

  // Обработчики для модального окна
  function setupModalListeners() {
    document.getElementById('save-and-leave-btn').addEventListener('click', () => {
      saveDesign();
      hideLeaveModal();
      if (state.leaveCallback) state.leaveCallback();
    });

    document.getElementById('leave-without-saving-btn').addEventListener('click', () => {
      hideLeaveModal();
      if (state.leaveCallback) state.leaveCallback();
    });

    document.getElementById('cancel-leave-btn').addEventListener('click', hideLeaveModal);
  }

  // Обработчик beforeunload
  function setupBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
      if (state.hasUnsavedChanges && !state.showLeaveWarning) {
        e.preventDefault();
        e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
        return e.returnValue;
      }
    });

    // Обработчик для ссылок
    document.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        if (state.hasUnsavedChanges && !state.showLeaveWarning &&
            !e.currentTarget.href.includes('designer.html')) {
          e.preventDefault();
          showLeaveModal(() => {
            window.location.href = link.href;
          });
        }
      });
    });
  }

  const elements = {
    engravingText: document.getElementById('engraving-text'),
    fontSelect: document.getElementById('font-select'),
    fontSizeInput: document.getElementById('font-size'),
    fontSizeValue: document.getElementById('font-size-value'),
    colorOptions: document.querySelectorAll('.color-option'),
    alignButtons: document.querySelectorAll('.text-align-buttons button'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    toolButtons: document.querySelectorAll('.tool-button'),
    previewContainer: document.getElementById('glass-preview-container'),
    addTextBtn: document.getElementById('add-text-btn'),
    textList: document.getElementById('text-list'),
    zoomSlider: document.getElementById('zoom-slider'),
    zoomValue: document.getElementById('zoom-value'),
    layersList: document.getElementById('layers-list'),
    flipHorizontalBtn: document.getElementById('flip-horizontal-btn'),
    flipVerticalBtn: document.getElementById('flip-vertical-btn'),
    rotateLeftBtn: document.getElementById('rotate-left-btn'),
    rotateRightBtn: document.getElementById('rotate-right-btn'),
    saveDesignBtn: document.getElementById('save-design'),
    orderBtn: document.getElementById('order-btn'),
    moveUpBtn: document.getElementById('move-up-btn'),
    moveDownBtn: document.getElementById('move-down-btn'),
    moveLeftBtn: document.getElementById('move-left-btn'),
    moveRightBtn: document.getElementById('move-right-btn')
  };

  // Настройки для перемещения объектов
  const moveIntervals = {};
  const moveSpeed = { initial: 1, max: 10, step: 0.5 };
  const moveDirections = { up: 'up', down: 'down', left: 'left', right: 'right' };

  fabric.Object.prototype.set({
    borderColor: '#6a5acd',
    cornerColor: '#6a5acd',
    cornerSize: 12,
    transparentCorners: false,
    cornerStyle: 'circle',
    borderScaleFactor: 2,
    padding: 10
  });

  function initCanvasSize() {
    const container = elements.previewContainer;
    canvas.setWidth(container.clientWidth);
    canvas.setHeight(state.isMobile ? container.clientWidth * 1.2 : container.clientWidth * 1.5);

    if (state.isMobile) {
      elements.zoomSlider.min = 60;
      elements.zoomSlider.max = 150;
      elements.zoomSlider.value = 80;
      state.zoom = 0.8;
    } else {
      elements.zoomSlider.min = 60;
      elements.zoomSlider.max = 150;
      elements.zoomSlider.value = 60;
      state.zoom = 0.6;
    }

    updateZoomDisplay();

    if (state.glassType) {
      loadGlass(state.glassType);
    }
  }

  function updateZoomDisplay() {
    elements.zoomValue.textContent = Math.round(state.zoom * 100) + '%';
    elements.zoomSlider.value = state.zoom * 100;
  }

  function loadGlass(glassType) {
    state.glassType = glassType;
    fabric.Image.fromURL(`images/${glassType}-glass.png`, function(img) {
      if (state.backgroundImage) {
        canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
      }

      state.baseScale = Math.min(
        canvas.width * 0.8 / img.width,
        canvas.height * 0.8 / img.height
      );

      img.set({
        scaleX: state.baseScale * state.zoom,
        scaleY: state.baseScale * state.zoom,
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false
      });

      state.backgroundImage = img;
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
        originX: 'center',
        originY: 'center',
        left: canvas.width / 2,
        top: canvas.height / 2
      });

      canvas.renderAll();
    }, { crossOrigin: 'anonymous' });
  }

  function updateZoom() {
    if (!state.backgroundImage) return;

    state.backgroundImage.set({
      scaleX: state.baseScale * state.zoom,
      scaleY: state.baseScale * state.zoom
    });

    canvas.renderAll();
    updateZoomDisplay();
  }

  function loadTemplate(templateName) {
    if (state.template) {
      canvas.remove(state.template);
      state.template = null;
    }

    if (templateName !== 'none') {
      fabric.Image.fromURL(`images/templates/${templateName}`, function(img) {
        const scale = Math.min(
          canvas.width * 0.7 / img.width,
          canvas.height * 0.7 / img.height
        );

        img.set({
          scaleX: scale,
          scaleY: scale,
          left: canvas.width / 2,
          top: canvas.height / 2,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: false,
          lockUniScaling: false,
          cornerStyle: 'circle',
          cornerColor: '#6a5acd',
          cornerSize: 12,
          transparentCorners: false,
          borderColor: '#6a5acd',
          borderScaleFactor: 2,
          padding: 10,
          data: {
            type: 'template',
            name: templateName
          },
          angle: 0,
          flipX: false,
          flipY: false
        });

        state.template = img;
        state.currentTemplate = templateName;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        updateLayersList();
      }, { crossOrigin: 'anonymous' });
    } else {
      state.currentTemplate = null;
      document.querySelector('.tab-btn[data-tab="elements-tab"]').click();
    }
  }

  function addNewText() {
    const textId = state.nextId++;
    const textObj = {
      id: textId,
      text: 'Новый текст',
      fontFamily: state.font,
      fontSize: state.fontSize,
      fill: state.color,
      textAlign: state.textAlign,
      left: canvas.width / 2,
      top: canvas.height / 2
    };

    const fabricText = new fabric.Textbox(textObj.text, {
      left: textObj.left,
      top: textObj.top,
      width: canvas.width * 0.4,
      originX: 'center',
      originY: 'center',
      fontFamily: textObj.fontFamily,
      fontSize: textObj.fontSize,
      fill: textObj.fill,
      textAlign: textObj.textAlign,
      selectable: true,
      hasControls: true,
      splitByGrapheme: true,
      data: { id: textId, type: 'text' },
      cornerStyle: 'circle',
      cornerColor: '#6a5acd',
      cornerSize: 11,
      transparentCorners: false,
      borderColor: '#6a5acd',
      borderScaleFactor: 2,
      padding: 10
    });

    state.texts.push({ id: textId, fabricObj: fabricText, data: textObj });
    canvas.add(fabricText);
    canvas.setActiveObject(fabricText);
    canvas.renderAll();
    updateTextList();
    state.activeTextId = textId;
    updateActiveTextControls();
    updateLayersList();
  }

  function updateText() {
    if (!state.activeTextId) return;

    const text = elements.engravingText.value.substring(0, 100);
    elements.engravingText.value = text;

    const textObj = state.texts.find(t => t.id === state.activeTextId);
    if (!textObj) return;

    textObj.fabricObj.set({
      text: text,
      fontFamily: state.font,
      fontSize: state.fontSize,
      fill: state.color,
      textAlign: state.textAlign
    });

    textObj.data.text = text;
    textObj.data.fontFamily = state.font;
    textObj.data.fontSize = state.fontSize;
    textObj.data.fill = state.color;
    textObj.data.textAlign = state.textAlign;

    canvas.renderAll();
    updateLayersList();
  }

  function removeText(textId) {
    const textIndex = state.texts.findIndex(t => t.id === textId);
    if (textIndex === -1) return;

    canvas.remove(state.texts[textIndex].fabricObj);
    state.texts.splice(textIndex, 1);
    canvas.renderAll();
    updateTextList();
    updateLayersList();

    if (state.activeTextId === textId) {
      state.activeTextId = state.texts.length > 0 ? state.texts[0].id : null;
      updateActiveTextControls();
    }
  }

  function updateTextList() {
    elements.textList.innerHTML = '';

    state.texts.forEach(textObj => {
      const li = document.createElement('li');
      li.className = 'text-item';
      if (textObj.id === state.activeTextId) {
        li.classList.add('active');
      }

      li.innerHTML = `
        <span>${textObj.data.text.substring(0, 15) + (textObj.data.text.length > 15 ? '...' : '')}</span>
        <button class="delete-text-btn" data-id="${textObj.id}">
          <i class="fas fa-trash"></i>
        </button>
      `;

      li.addEventListener('click', () => {
        state.activeTextId = textObj.id;
        updateActiveTextControls();
        canvas.setActiveObject(textObj.fabricObj);
        canvas.renderAll();
        updateTextList();
      });

      elements.textList.appendChild(li);
    });
  }

  function updateActiveTextControls() {
    if (!state.activeTextId) {
      elements.engravingText.value = '';
      return;
    }

    const textObj = state.texts.find(t => t.id === state.activeTextId);
    if (!textObj) return;

    elements.engravingText.value = textObj.data.text;
    elements.fontSelect.value = textObj.data.fontFamily;
    elements.fontSizeInput.value = textObj.data.fontSize;
    elements.fontSizeValue.textContent = textObj.data.fontSize;

    document.querySelectorAll('.color-option').forEach(opt => {
      opt.classList.remove('selected');
      if (opt.dataset.color === textObj.data.fill) {
        opt.classList.add('selected');
      }
    });

    document.querySelectorAll('.text-align-buttons button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.align === textObj.data.textAlign) {
        btn.classList.add('active');
      }
    });
  }

  function addClipart(clipartName) {
    const card = document.querySelector(`.option-card[data-clipart="${clipartName}"]`);
    const clipartDisplayName = card ? card.dataset.name || clipartName.replace('.png', '') : clipartName.replace('.png', '');

    fabric.Image.fromURL(`images/cliparts/${clipartName}`, function(img) {
      const scale = Math.min(
        canvas.width * 0.3 / img.width,
        canvas.height * 0.3 / img.height
      );

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: false,
        lockUniScaling: false,
        cornerStyle: 'circle',
        cornerColor: '#6a5acd',
        cornerSize: 12,
        transparentCorners: false,
        borderColor: '#6a5acd',
        borderScaleFactor: 2,
        padding: 10,
        data: {
          type: 'clipart',
          name: clipartName,
          displayName: clipartDisplayName
        }
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      state.cliparts.push(img);
      canvas.renderAll();
      updateLayersList();
    }, { crossOrigin: 'anonymous' });
  }

  function updateLayersList() {
    elements.layersList.innerHTML = '';

    const objects = canvas.getObjects().filter(obj => obj !== state.backgroundImage);
    const sortedObjects = [...objects].reverse();

    sortedObjects.forEach((obj, index) => {
      const layerItem = document.createElement('div');
      layerItem.className = 'layer-item';

      let type = '';
      let name = '';

      if (obj.data) {
        if (obj.data.type === 'text') {
          type = 'Текст';
          name = obj.text.substring(0, 15) + (obj.text.length > 15 ? '...' : '');
        } else if (obj.data.type === 'clipart') {
          type = 'Элемент';
          name = obj.data.displayName || obj.data.name.replace('.png', '');
        } else if (obj.data.type === 'template') {
          type = 'Шаблон';
          name = obj.data.name.replace('.png', '');
        }
      } else {
        type = 'Объект';
        name = 'Без названия';
      }

      layerItem.innerHTML = `<span>${type}: ${name}</span>`;

      if (canvas.getActiveObject() === obj) {
        layerItem.classList.add('active');
      }

      layerItem.addEventListener('click', () => {
        canvas.setActiveObject(obj);
        canvas.renderAll();
        updateLayersList();

        if (obj.data && obj.data.type === 'text' && obj.data.id) {
          state.activeTextId = obj.data.id;
          updateActiveTextControls();
          updateTextList();
        }
      });

      elements.layersList.appendChild(layerItem);
    });
  }

  function flipObject(axis) {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      if (axis === 'horizontal') {
        activeObject.set('flipX', !activeObject.flipX);
      } else {
        activeObject.set('flipY', !activeObject.flipY);
      }
      canvas.renderAll();
      updateLayersList();
    }
  }

  function rotateObject(angle) {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.angle = (activeObject.angle || 0) + angle;
      canvas.renderAll();
      updateLayersList();
    }
  }

  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

function saveDesign() {
  const activeObjects = canvas.getObjects().filter(obj => obj !== state.backgroundImage);
  const templateObj = activeObjects.find(obj => obj.data?.type === 'template');

  const designData = {
    glassType: state.glassType,
    texts: state.texts
      .filter(t => activeObjects.includes(t.fabricObj))
      .map(t => ({
        id: t.id,
        text: t.fabricObj.text,
        fontFamily: t.fabricObj.fontFamily,
        fontSize: t.fabricObj.fontSize,
        fill: t.fabricObj.fill,
        textAlign: t.fabricObj.textAlign,
        angle: t.fabricObj.angle || 0,
        flipX: t.fabricObj.flipX || false,
        flipY: t.fabricObj.flipY || false,
        left: t.fabricObj.left,
        top: t.fabricObj.top,
        width: t.fabricObj.width,
        originX: t.fabricObj.originX,
        originY: t.fabricObj.originY
      })),
    template: templateObj ? {
      name: templateObj.data.name,
      scaleX: templateObj.scaleX,
      scaleY: templateObj.scaleY,
      left: templateObj.left,
      top: templateObj.top,
      angle: templateObj.angle || 0,
      flipX: templateObj.flipX || false,
      flipY: templateObj.flipY || false,
      originX: templateObj.originX,
      originY: templateObj.originY
    } : null,
    cliparts: activeObjects
      .filter(obj => obj.data?.type === 'clipart')
      .map(clipart => ({
        name: clipart.data.name,
        displayName: clipart.data.displayName,
        angle: clipart.angle || 0,
        flipX: clipart.flipX || false,
        flipY: clipart.flipY || false,
        scaleX: clipart.scaleX,
        scaleY: clipart.scaleY,
        left: clipart.left,
        top: clipart.top,
        originX: clipart.originX,
        originY: clipart.originY
      })),
    zoom: state.zoom,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height
  };

  localStorage.setItem('glassDesign', JSON.stringify(designData));
  state.isDesignSaved = true;
  state.hasUnsavedChanges = false;
  showNotification('Дизайн сохранен! Теперь вы можете перейти к оформлению заказа 📦');
}

  function loadDesign() {
    const savedDesign = localStorage.getItem('glassDesign');
    if (savedDesign) {
      const design = JSON.parse(savedDesign);
      state.glassType = design.glassType;
      state.zoom = design.zoom || (state.isMobile ? 0.8 : 0.5);

      if (state.isMobile) {
        elements.zoomSlider.min = 60;
        elements.zoomSlider.value = 80;
      } else {
        elements.zoomSlider.min = 60;
        elements.zoomSlider.value = 50;
      }

      updateZoomDisplay();

      loadGlass(design.glassType);

      const scaleX = design.canvasWidth ? canvas.width / design.canvasWidth : 1;
      const scaleY = design.canvasHeight ? canvas.height / design.canvasHeight : 1;
      const scale = Math.min(scaleX, scaleY);

      if (design.template) {
        fabric.Image.fromURL(`images/templates/${design.template.name}`, function(img) {
          img.set({
            scaleX: design.template.scaleX * scale,
            scaleY: design.template.scaleY * scale,
            left: design.template.left * scale,
            top: design.template.top * scale,
            originX: design.template.originX || 'center',
            originY: design.template.originY || 'center',
            selectable: true,
            hasControls: true,
            hasBorders: true,
            lockRotation: false,
            lockUniScaling: false,
            cornerStyle: 'circle',
            cornerColor: '#6a5acd',
            cornerSize: 12,
            transparentCorners: false,
            borderColor: '#6a5acd',
            borderScaleFactor: 2,
            padding: 10,
            data: {
              type: 'template',
              name: design.template.name
            },
            angle: design.template.angle || 0,
            flipX: design.template.flipX || false,
            flipY: design.template.flipY || false
          });

          state.template = img;
          state.currentTemplate = design.template.name;
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          updateLayersList();
        }, { crossOrigin: 'anonymous' });
      }

      if (design.texts && design.texts.length > 0) {
        design.texts.forEach(textObj => {
          const textId = state.nextId++;
          const fabricText = new fabric.Textbox(textObj.text, {
            left: textObj.left * scale,
            top: textObj.top * scale,
            width: textObj.width * scale,
            originX: textObj.originX || 'center',
            originY: textObj.originY || 'center',
            fontFamily: textObj.fontFamily,
            fontSize: textObj.fontSize * scale,
            fill: textObj.fill,
            textAlign: textObj.textAlign,
            selectable: true,
            hasControls: true,
            splitByGrapheme: true,
            data: { id: textId, type: 'text' },
            cornerStyle: 'circle',
            cornerColor: '#6a5acd',
            cornerSize: 12,
            transparentCorners: false,
            borderColor: '#6a5acd',
            borderScaleFactor: 2,
            padding: 10,
            angle: textObj.angle || 0,
            flipX: textObj.flipX || false,
            flipY: textObj.flipY || false
          });

          state.texts.push({ id: textId, fabricObj: fabricText, data: textObj });
          canvas.add(fabricText);
        });
      }

      if (design.cliparts && design.cliparts.length > 0) {
        design.cliparts.forEach(clipartObj => {
          fabric.Image.fromURL(`images/cliparts/${clipartObj.name}`, function(img) {
            img.set({
              scaleX: clipartObj.scaleX * scale,
              scaleY: clipartObj.scaleY * scale,
              left: clipartObj.left * scale,
              top: clipartObj.top * scale,
              originX: clipartObj.originX || 'center',
              originY: clipartObj.originY || 'center',
              selectable: true,
              hasControls: true,
              hasBorders: true,
              lockRotation: false,
              lockUniScaling: false,
              cornerStyle: 'circle',
              cornerColor: '#6a5acd',
              cornerSize: 12,
              transparentCorners: false,
              borderColor: '#6a5acd',
              borderScaleFactor: 2,
              padding: 10,
              data: {
                type: 'clipart',
                name: clipartObj.name,
                displayName: clipartObj.displayName
              },
              angle: clipartObj.angle || 0,
              flipX: clipartObj.flipX || false,
              flipY: clipartObj.flipY || false
            });

            canvas.add(img);
            state.cliparts.push(img);
            canvas.renderAll();
            updateLayersList();
          }, { crossOrigin: 'anonymous' });
        });
      }

      state.isDesignSaved = true;
      state.hasUnsavedChanges = false;
      updateTextList();
      updateLayersList();
    }
  }

  // Функции для перемещения объектов
  function moveObject(direction) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    const moveStep = moveSpeed.initial;
    switch (direction) {
      case moveDirections.up:
        activeObject.top -= moveStep;
        break;
      case moveDirections.down:
        activeObject.top += moveStep;
        break;
      case moveDirections.left:
        activeObject.left -= moveStep;
        break;
      case moveDirections.right:
        activeObject.left += moveStep;
        break;
    }
    activeObject.setCoords();
    canvas.renderAll();
  }

  function startMove(direction) {
    if (moveIntervals[direction]) return;

    let speed = moveSpeed.initial;
    moveIntervals[direction] = setInterval(() => {
      moveObject(direction);
      speed = Math.min(speed + moveSpeed.step, moveSpeed.max);
    }, 50);
  }

  function stopMove(direction) {
    if (moveIntervals[direction]) {
      clearInterval(moveIntervals[direction]);
      delete moveIntervals[direction];
    }
  }

  function setupEventListeners() {
    window.addEventListener('resize', function() {
      initCanvasSize();
      canvas.renderAll();
    });

    // Обработчики для кнопок перемещения
    elements.moveUpBtn.addEventListener('mousedown', () => startMove(moveDirections.up));
    elements.moveDownBtn.addEventListener('mousedown', () => startMove(moveDirections.down));
    elements.moveLeftBtn.addEventListener('mousedown', () => startMove(moveDirections.left));
    elements.moveRightBtn.addEventListener('mousedown', () => startMove(moveDirections.right));

    elements.moveUpBtn.addEventListener('mouseup', () => stopMove(moveDirections.up));
    elements.moveDownBtn.addEventListener('mouseup', () => stopMove(moveDirections.down));
    elements.moveLeftBtn.addEventListener('mouseup', () => stopMove(moveDirections.left));
    elements.moveRightBtn.addEventListener('mouseup', () => stopMove(moveDirections.right));

    elements.moveUpBtn.addEventListener('mouseleave', () => stopMove(moveDirections.up));
    elements.moveDownBtn.addEventListener('mouseleave', () => stopMove(moveDirections.down));
    elements.moveLeftBtn.addEventListener('mouseleave', () => stopMove(moveDirections.left));
    elements.moveRightBtn.addEventListener('mouseleave', () => stopMove(moveDirections.right));
      // Обработчики для кнопок перемещения (работают и на мобильных)
    const setupMoveButton = (btn, direction) => {
      btn.addEventListener('mousedown', () => startMove(direction));
      btn.addEventListener('touchstart', () => startMove(direction), { passive: true });

      const stopEvents = ['mouseup', 'mouseleave', 'touchend', 'touchcancel'];
      stopEvents.forEach(event => {
        btn.addEventListener(event, () => stopMove(direction));
      });
    };
    setupMoveButton(elements.moveUpBtn, moveDirections.up);
    setupMoveButton(elements.moveDownBtn, moveDirections.down);
    setupMoveButton(elements.moveLeftBtn, moveDirections.left);
    setupMoveButton(elements.moveRightBtn, moveDirections.right);

    // Горячие клавиши
    document.addEventListener('keydown', function(e) {
      // Отключаем горячие клавиши на мобильных устройствах
      if (state.isMobile) return;

      const activeObject = canvas.getActiveObject();

    // Shift + S - Сохранить
    if (e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы')) {
      e.preventDefault();
      saveDesign();
      return;
    }


    // Обработка только при наличии активного объекта
    if (activeObject) {
      switch (e.key.toLowerCase()) { // Регистронезависимая проверка
        case 'arrowup':
          e.preventDefault();
          moveObject(moveDirections.up);
          break;
        case 'arrowdown':
          e.preventDefault();
          moveObject(moveDirections.down);
          break;
        case 'arrowleft':
          e.preventDefault();
          moveObject(moveDirections.left);
          break;
        case 'arrowright':
          e.preventDefault();
          moveObject(moveDirections.right);
          break;
        case 'delete':
          e.preventDefault();
          if (activeObject.data?.type === 'text') {
            removeText(activeObject.data.id);
          } else {
            canvas.remove(activeObject);
          }
          updateLayersList();
          break;
        case 'escape':
          e.preventDefault();
          canvas.discardActiveObject().renderAll();
          break;
        case 'h':
        case 'р': // Для русской раскладки
          e.preventDefault();
          activeObject.set('flipX', !activeObject.flipX);
          canvas.renderAll();
          break;
        case 'v':
        case 'м': // Для русской раскладки
          e.preventDefault();
          activeObject.set('flipY', !activeObject.flipY);
          canvas.renderAll();
          break;
        case 'q':
        case 'й': // Вращение влево (русская раскладка)
          e.preventDefault();
          rotateObject(-state.rotationStep);
          break;
        case 'e':
        case 'у': // Вращение вправо (русская раскладка)
          e.preventDefault();
          rotateObject(state.rotationStep);
          break;
      }
    }
  });

  // Zoom колесом мыши с Shift
  document.addEventListener('wheel', function(e) {
    if (e.shiftKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      elements.zoomSlider.value = parseInt(elements.zoomSlider.value) + delta;
      state.zoom = parseFloat(elements.zoomSlider.value) / 100;
      updateZoom();
    }
  }, { passive: false });

    document.querySelectorAll('.glass-options .option-card').forEach(option => {
      option.addEventListener('click', function() {
        document.querySelectorAll('.glass-options .option-card').forEach(opt => {
          opt.classList.remove('selected');
        });
        this.classList.add('selected');
        loadGlass(this.dataset.glass);
      });
    });

    document.querySelectorAll('.template-options .option-card').forEach(option => {
      option.addEventListener('click', function() {
        document.querySelectorAll('.template-options .option-card').forEach(opt => {
          opt.classList.remove('selected');
        });
        this.classList.add('selected');
        loadTemplate(this.dataset.template);
      });
    });

    document.querySelectorAll('.cliparts-options .option-card').forEach(option => {
      option.addEventListener('click', function() {
        addClipart(this.dataset.clipart);
      });
    });

    elements.addTextBtn?.addEventListener('click', addNewText);

    document.addEventListener('click', function(e) {
      if (e.target.closest('.delete-text-btn')) {
        const textId = parseInt(e.target.closest('.delete-text-btn').dataset.id);
        removeText(textId);
      }
    });

    elements.engravingText.addEventListener('input', function() {
      updateText();
    });

    elements.fontSelect.addEventListener('change', function() {
      state.font = this.value;
      updateText();
    });

    elements.fontSizeInput.addEventListener('input', function() {
      state.fontSize = parseInt(this.value);
      elements.fontSizeValue.textContent = state.fontSize;
      updateText();
    });

    elements.colorOptions.forEach(option => {
      option.addEventListener('click', function() {
        elements.colorOptions.forEach(opt => {
          opt.classList.remove('selected');
        });
        this.classList.add('selected');
        state.color = this.dataset.color;
        updateText();
      });
    });

    elements.alignButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        elements.alignButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        state.textAlign = this.dataset.align;
        updateText();
      });
    });

    elements.tabButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const tabId = this.dataset.tab;

        elements.tabButtons.forEach(b => b.classList.remove('active'));
        elements.tabContents.forEach(c => c.classList.remove('active'));

        this.classList.add('active');
        document.getElementById(tabId).classList.add('active');
      });
    });

    elements.toolButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        elements.toolButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const tool = this.id.replace('-btn', '');
        state.activeTool = tool;

        switch(tool) {
          case 'select':
            canvas.selection = true;
            break;
          case 'delete':
            const activeObject = canvas.getActiveObject();
            if (activeObject) {
              if (activeObject.data?.id) {
                removeText(activeObject.data.id);
              } else {
                canvas.remove(activeObject);
                updateLayersList();
              }
            }
            break;
        }
      });
    });

    elements.flipHorizontalBtn?.addEventListener('click', () => flipObject('horizontal'));
    elements.flipVerticalBtn?.addEventListener('click', () => flipObject('vertical'));
    elements.rotateLeftBtn?.addEventListener('click', () => rotateObject(-state.rotationStep));
    elements.rotateRightBtn?.addEventListener('click', () => rotateObject(state.rotationStep));

    elements.saveDesignBtn?.addEventListener('click', saveDesign);

    elements.orderBtn?.addEventListener('click', function(e) {
      if (!state.isDesignSaved || state.hasUnsavedChanges) {
        e.preventDefault();
        showNotification('Пожалуйста, сохраните дизайн перед оформлением заказа', 'error');
        return;
      }
    });

    elements.zoomSlider?.addEventListener('input', function() {
      state.zoom = parseFloat(this.value) / 100;
      updateZoom();
    });

    canvas.on('selection:created', function() {
      const activeObject = canvas.getActiveObject();
      if (activeObject?.data?.id) {
        state.activeTextId = activeObject.data.id;
        updateActiveTextControls();
        updateTextList();
      }
      updateLayersList();
    });

    canvas.on('selection:cleared', function() {
      state.activeTextId = null;
      updateActiveTextControls();
      updateTextList();
      updateLayersList();
    });

    canvas.on('object:modified', function() {
      if (state.isDesignSaved) {
        state.hasUnsavedChanges = true;
        state.isDesignSaved = false;
      }
      updateLayersList();
    });

    canvas.on('object:added', function() {
      if (state.isDesignSaved) {
        state.hasUnsavedChanges = true;
        state.isDesignSaved = false;
      }
      updateLayersList();
    });

    canvas.on('object:removed', function() {
      if (state.isDesignSaved) {
        state.hasUnsavedChanges = true;
        state.isDesignSaved = false;
      }
      updateLayersList();
    });
  }

  function init() {
    initCanvasSize();
    setupEventListeners();
    loadDesign();
    setupModalListeners();
    setupBeforeUnload();
  }

  init();
});