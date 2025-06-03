document.addEventListener('DOMContentLoaded', function() {
    const glassCanvas = new fabric.Canvas('glass-preview', {
        backgroundColor: 'transparent',
        preserveObjectStacking: true,
        selection: false,
        interactive: false
    });

    const designCanvas = new fabric.Canvas('design-preview', {
        backgroundColor: 'transparent',
        preserveObjectStacking: true,
        selection: false,
        interactive: false
    });

    const state = {
        glassType: null,
        design: null,
        designLoaded: false
    };

    const BOT_TOKEN = '7865197370:AAEzaD6VKlIcXAnYOd4fpsM3WuSH-II1VDw';
    const CHAT_ID = '-1002576018287';

    const glassTypeNames = {
        wine: '🍷 Винный бокал',
        beer: '🍺 Пивной бокал 0.5л',
        whisky: '🥃 Бокал для виски',
        champagne: '🥂 Бокал для шампанского',
        cognac: '🪵 Бокал для коньяка',
        vodka: '❄️ Рюмка для водки (6шт)'
    };

    function loadGlass(glassType) {
        state.glassType = glassType;
        fabric.Image.fromURL(`images/${glassType}-glass.png`, function(img) {
            const scale = Math.min(
                glassCanvas.width * 0.9 / img.width,
                glassCanvas.height * 0.9 / img.height
            );

            img.set({
                scaleX: scale,
                scaleY: scale,
                left: glassCanvas.width / 2,
                top: glassCanvas.height / 2,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });

            glassCanvas.setBackgroundImage(img, glassCanvas.renderAll.bind(glassCanvas), {
                originX: 'center',
                originY: 'center',
                left: glassCanvas.width / 2,
                top: glassCanvas.height / 2
            });

            const glassTypeInfo = document.getElementById('glass-type-info');
            if (glassTypeNames[glassType]) {
                glassTypeInfo.textContent = glassTypeNames[glassType];
            }
        }, { crossOrigin: 'anonymous' });
    }

    function calculateDesignBounds(design) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let hasElements = false;

        if (design.texts && design.texts.length > 0) {
            hasElements = true;
            design.texts.forEach(textObj => {
                const textWidth = textObj.width || 100;
                const textHeight = textObj.fontSize * 1.2 || 24;

                minX = Math.min(minX, textObj.left - textWidth/2);
                maxX = Math.max(maxX, textObj.left + textWidth/2);
                minY = Math.min(minY, textObj.top - textHeight/2);
                maxY = Math.max(maxY, textObj.top + textHeight/2);
            });
        }

        if (design.cliparts && design.cliparts.length > 0) {
            hasElements = true;
            design.cliparts.forEach(clipartObj => {
                const clipartWidth = (clipartObj.width || 100) * (clipartObj.scaleX || 1);
                const clipartHeight = (clipartObj.height || 100) * (clipartObj.scaleY || 1);

                minX = Math.min(minX, clipartObj.left - clipartWidth/2);
                maxX = Math.max(maxX, clipartObj.left + clipartWidth/2);
                minY = Math.min(minY, clipartObj.top - clipartHeight/2);
                maxY = Math.max(maxY, clipartObj.top + clipartHeight/2);
            });
        }

        if (design.template) {
            hasElements = true;
            const templateWidth = (design.template.width || 500) * (design.template.scaleX || 1);
            const templateHeight = (design.template.height || 500) * (design.template.scaleY || 1);

            minX = Math.min(minX, design.template.left - templateWidth/2);
            maxX = Math.max(maxX, design.template.left + templateWidth/2);
            minY = Math.min(minY, design.template.top - templateHeight/2);
            maxY = Math.max(maxY, design.template.top + templateHeight/2);
        }

        if (!hasElements) {
            return {
                left: 0,
                top: 0,
                width: design.canvasWidth || 500,
                height: design.canvasHeight || 500,
                centerX: design.canvasWidth / 2 || 250,
                centerY: design.canvasHeight / 2 || 250
            };
        }

        return {
            left: minX,
            top: minY,
            width: maxX - minX || design.canvasWidth || 500,
            height: maxY - minY || design.canvasHeight || 500,
            centerX: (minX + maxX) / 2 || design.canvasWidth / 2 || 250,
            centerY: (minY + maxY) / 2 || design.canvasHeight / 2 || 250
        };
    }

    function loadDesignContent(design) {
        state.design = design;
        state.designLoaded = true;
        designCanvas.clear();

        const bounds = calculateDesignBounds(design);
        const scale = Math.min(
            designCanvas.width * 0.9 / bounds.width,
            designCanvas.height * 0.9 / bounds.height
        );

        const offsetX = designCanvas.width / 2 - bounds.centerX * scale;
        const offsetY = designCanvas.height / 2 - bounds.centerY * scale;

        if (design.template) {
            fabric.Image.fromURL(`images/templates/${design.template.name}`, function(img) {
                img.set({
                    scaleX: (design.template.scaleX || 1) * scale,
                    scaleY: (design.template.scaleY || 1) * scale,
                    left: design.template.left * scale + offsetX,
                    top: design.template.top * scale + offsetY,
                    originX: design.template.originX || 'center',
                    originY: design.template.originY || 'center',
                    angle: design.template.angle || 0,
                    flipX: design.template.flipX || false,
                    flipY: design.template.flipY || false,
                    selectable: false,
                    evented: false
                });

                designCanvas.add(img);
                loadDesignElements(design, scale, offsetX, offsetY);
            }, { crossOrigin: 'anonymous' });
        } else {
            loadDesignElements(design, scale, offsetX, offsetY);
        }
    }

    function loadDesignElements(design, scale, offsetX, offsetY) {
        if (design.texts && design.texts.length > 0) {
            design.texts.forEach(textObj => {
                const text = new fabric.Textbox(textObj.text, {
                    left: textObj.left * scale + offsetX,
                    top: textObj.top * scale + offsetY,
                    width: textObj.width * scale,
                    originX: textObj.originX || 'center',
                    originY: textObj.originY || 'center',
                    fontFamily: textObj.fontFamily,
                    fontSize: textObj.fontSize * scale,
                    fill: textObj.fill,
                    textAlign: textObj.textAlign,
                    angle: textObj.angle || 0,
                    flipX: textObj.flipX || false,
                    flipY: textObj.flipY || false,
                    selectable: false,
                    evented: false
                });
                designCanvas.add(text);
            });
        }

        if (design.cliparts && design.cliparts.length > 0) {
            design.cliparts.forEach(clipartObj => {
                fabric.Image.fromURL(`images/cliparts/${clipartObj.name}`, function(img) {
                    img.set({
                        scaleX: clipartObj.scaleX * scale,
                        scaleY: clipartObj.scaleY * scale,
                        left: clipartObj.left * scale + offsetX,
                        top: clipartObj.top * scale + offsetY,
                        originX: clipartObj.originX || 'center',
                        originY: clipartObj.originY || 'center',
                        angle: clipartObj.angle || 0,
                        flipX: clipartObj.flipX || false,
                        flipY: clipartObj.flipY || false,
                        selectable: false,
                        evented: false
                    });
                    designCanvas.add(img);
                }, { crossOrigin: 'anonymous' });
            });
        }
    }

    function setupCanvasSizes() {
        const glassContainer = document.querySelector('#glass-preview').parentElement;
        const designContainer = document.querySelector('#design-preview').parentElement;

        glassContainer.style.height = '550px';
        designContainer.style.height = '550px';

        glassCanvas.setWidth(glassContainer.clientWidth);
        glassCanvas.setHeight(glassContainer.clientHeight);

        designCanvas.setWidth(designContainer.clientWidth);
        designCanvas.setHeight(designContainer.clientHeight);

        if (state.glassType) {
            loadGlass(state.glassType);
        }
        if (state.designLoaded) {
            loadDesignContent(state.design);
        }
    }

    function loadSavedDesign() {
        const savedDesign = localStorage.getItem('glassDesign');
        if (savedDesign) {
            const design = JSON.parse(savedDesign);
            state.glassType = design.glassType;
            loadGlass(design.glassType);
            loadDesignContent(design);
        }
    }

    function createTelegramMessage(formData) {
        let message = `📦 *Новый заказ* \n\n` +
               `👤 *Имя*: ${formData.name}\n` +
               `📞 *Телефон*: ${formData.phone}\n` +
               `💬 *Соцсеть*: ${formData.social}\n` +
               `🏠 *Адрес*: ${formData.address || 'Не указан'}\n` +
               `💭 *Комментарий*: ${formData.comments || 'Нет комментариев'}\n\n` +
               `🛒 *Детали заказа*:\n` +
               `- Бокал: ${glassTypeNames[formData.design?.glassType] || 'Не указан'}\n`;

        if (formData.design?.template) {
            message += `- Шаблон: ${formData.design.template.name.replace('.png', '')}\n`;
        }

        if (formData.design?.texts && formData.design.texts.length > 0) {
            message += `\n📝 *Тексты*:\n`;
            formData.design.texts.forEach((text, index) => {
                message += `${index + 1}. "${text.text}" (Шрифт: ${text.fontFamily})\n`;
            });
        }

        if (formData.design?.cliparts && formData.design.cliparts.length > 0) {
            message += `\n🎨 *Элементы дизайна*:\n`;
            formData.design.cliparts.forEach((clipart, index) => {
                message += `${index + 1}. ${clipart.displayName || clipart.name.replace('.png', '')}\n`;
            });
        }

        message += `\n⏰ *Дата*: ${formData.date}`;

        return message;
    }

    function sendOrderToTelegram(formData) {
        return new Promise((resolve, reject) => {
            const dataURL = designCanvas.toDataURL({
                format: 'png',
                quality: 0.8
            });

            const blob = dataURLtoBlob(dataURL);
            const formDataToSend = new FormData();
            formDataToSend.append('chat_id', CHAT_ID);
            formDataToSend.append('photo', blob, 'design.png');
            formDataToSend.append('caption', createTelegramMessage(formData));
            formDataToSend.append('parse_mode', 'Markdown');

            fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                body: formDataToSend
            })
            .then(response => response.json())
            .then(data => {
                if (data.ok) {
                    resolve();
                } else {
                    reject(new Error('Ошибка отправки заказа'));
                }
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    function dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while(n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new Blob([u8arr], {type: mime});
    }

    function showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 5000);
    }

    const form = document.getElementById('order-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;

        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = 'Отправка...';
        submitBtn.querySelector('.spinner').style.display = 'inline-block';

        const formData = {
            name: form.elements.name.value.trim(),
            phone: form.elements.phone.value.trim(),
            social: form.elements.social.value.trim(),
            address: form.elements.address.value.trim(),
            comments: form.elements.comments.value.trim(),
            design: state.design,
            date: new Date().toLocaleString()
        };

        if (!formData.name || !formData.phone || !formData.social) {
            showNotification('Заполните обязательные поля: имя, телефон и соцсеть', 'error');
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').textContent = 'Подтвердить заказ';
            submitBtn.querySelector('.spinner').style.display = 'none';
            return;
        }

        sendOrderToTelegram(formData)
            .then(() => {
                showNotification('✅ Заказ отправлен! Мы свяжемся с вами.');
                form.reset();
                localStorage.removeItem('glassDesign');
            })
            .catch(error => {
                console.error('Ошибка отправки:', error);
                showNotification('❌ Ошибка отправки заказа. Пожалуйста, попробуйте еще раз.', 'error');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').textContent = 'Подтвердить заказ';
                submitBtn.querySelector('.spinner').style.display = 'none';
            });
    });

    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function(e) {
        let phoneDigits = this.value.replace(/\D/g, '').replace(/^373/, '');

        if (phoneDigits.length > 8) {
            phoneDigits = phoneDigits.substring(0, 8);
        }

        this.value = '+373 ' + phoneDigits;

        if (phoneDigits.length === 8) {
            this.classList.remove('invalid');
            this.classList.add('valid');
            this.setCustomValidity('');
        } else {
            this.classList.remove('valid');
            this.classList.add('invalid');
            this.setCustomValidity('Номер телефона должен содержать 8 цифр');
        }
    });

    phoneInput.value = '+373 ';
    phoneInput.classList.add('invalid');

    window.addEventListener('load', function() {
        setupCanvasSizes();
        loadSavedDesign();
    });

    window.addEventListener('resize', setupCanvasSizes);
});