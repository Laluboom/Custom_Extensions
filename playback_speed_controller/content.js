(function() {
    // --- CONFIGURATION ---
    const PANEL_ID = 'yts-glass-panel';
    const STORAGE_KEY = 'yts-saved-speed';
    const POS_KEY = 'yts-panel-pos';
    const VISIBILITY_KEY = 'yts-is-visible';
    
    // --- CSS STYLES ---
    const styles = `
        #${PANEL_ID} {
            position: fixed;
            top: 70px;
            right: 20px;
            width: 240px;
            background: rgba(18, 18, 18, 0.95);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            z-index: 2147483647;
            font-family: 'Roboto', Arial, sans-serif;
            color: #e0e0e0;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
            transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
            user-select: none;
            opacity: 1;
            transform: translateY(0);
            visibility: visible;
        }

        #${PANEL_ID}.hidden {
            opacity: 0;
            transform: translateY(-20px);
            visibility: hidden;
            pointer-events: none;
        }
        
        .yts-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            cursor: grab;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .yts-header:active { cursor: grabbing; }
        
        .yts-title {
            font-size: 13px;
            font-weight: 800;
            color: #3ea6ff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            pointer-events: none;
        }

        .yts-reset-btn {
            background: transparent;
            border: none;
            color: #aaa;
            cursor: pointer;
            font-size: 16px;
            padding: 2px;
            transition: color 0.2s;
        }
        .yts-reset-btn:hover { color: #fff; }

        .yts-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 12px;
        }
        
        .yts-input {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #fff;
            border-radius: 6px;
            padding: 6px;
            width: 55px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            outline: none;
            font-family: monospace;
        }
        .yts-input:focus { border-color: #3ea6ff; box-shadow: 0 0 0 2px rgba(62, 166, 255, 0.2); }

        .yts-slider-container { position: relative; width: 100%; height: 20px; margin-bottom: 15px; }
        .yts-slider {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
            outline: none;
            position: absolute;
            top: 7px;
        }
        .yts-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #3ea6ff;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(62, 166, 255, 0.5);
            transition: transform 0.1s;
        }
        .yts-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }

        .yts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 6px;
        }
        .yts-pill {
            background: rgba(255, 255, 255, 0.05);
            border: none;
            color: #ccc;
            padding: 8px 0;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .yts-pill:hover { background: rgba(255, 255, 255, 0.15); color: #fff; transform: translateY(-1px); }
    `;

    // Inject CSS
    if (!document.getElementById('yts-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'yts-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // --- DRAGGABLE LOGIC ---
    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            const newTop = (element.offsetTop - pos2);
            const newLeft = (element.offsetLeft - pos1);
            
            element.style.top = newTop + "px";
            element.style.left = newLeft + "px";
            element.style.right = "auto"; 
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            chrome.storage.local.set({ [POS_KEY]: { top: element.style.top, left: element.style.left } });
        }
    }

    // --- CREATE UI ---
    async function createUI() {
        if (document.getElementById(PANEL_ID)) return;

        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        
        // Restore Position
        const data = await chrome.storage.local.get([POS_KEY, VISIBILITY_KEY]);
        const savedPos = data[POS_KEY];
        if (savedPos) {
            panel.style.top = savedPos.top;
            panel.style.left = savedPos.left;
            panel.style.right = "auto";
        }

        // Check if previously hidden
        const isVisible = data[VISIBILITY_KEY] !== false; // Default true
        if (!isVisible) panel.classList.add('hidden');

        // Build UI without innerHTML
        const header = document.createElement('div');
        header.className = 'yts-header';
        header.id = 'yts-header';
        
        const title = document.createElement('span');
        title.className = 'yts-title';
        title.textContent = 'Speed Control';
        
        const resetBtn = document.createElement('button');
        resetBtn.className = 'yts-reset-btn';
        resetBtn.id = 'yts-reset';
        resetBtn.title = 'Reset to 1.0x';
        resetBtn.textContent = '↺';
        
        header.appendChild(title);
        header.appendChild(resetBtn);
        
        const content = document.createElement('div');
        content.className = 'yts-content';
        
        const row = document.createElement('div');
        row.className = 'yts-row';
        
        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.id = 'yts-number';
        numberInput.className = 'yts-input';
        numberInput.step = '0.1';
        numberInput.min = '0.1';
        numberInput.max = '16.0';
        numberInput.value = '1.0';
        
        const currentSpeedLabel = document.createElement('span');
        currentSpeedLabel.style.fontSize = '12px';
        currentSpeedLabel.style.color = '#888';
        currentSpeedLabel.style.fontWeight = '600';
        currentSpeedLabel.textContent = 'Current Speed';
        
        row.appendChild(numberInput);
        row.appendChild(currentSpeedLabel);
        
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'yts-slider-container';
        
        const rangeInput = document.createElement('input');
        rangeInput.type = 'range';
        rangeInput.id = 'yts-range';
        rangeInput.className = 'yts-slider';
        rangeInput.min = '0.25';
        rangeInput.max = '4.0';
        rangeInput.step = '0.05';
        rangeInput.value = '1.0';
        
        sliderContainer.appendChild(rangeInput);
        
        const grid = document.createElement('div');
        grid.className = 'yts-grid';
        
        const presetSpeeds = ['1.0', '1.5', '2.0', '3.0'];
        presetSpeeds.forEach(speed => {
            const btn = document.createElement('button');
            btn.className = 'yts-pill';
            btn.textContent = speed + 'x';
            btn.dataset.speed = speed;
            btn.onclick = () => applySpeed(speed);
            grid.appendChild(btn);
        });
        
        content.appendChild(row);
        content.appendChild(sliderContainer);
        content.appendChild(grid);
        
        panel.appendChild(header);
        panel.appendChild(content);
        
        document.body.appendChild(panel);

        makeDraggable(panel, header);

        const applySpeed = (speed) => {
            const video = document.querySelector('video');
            if (video) {
                video.playbackRate = parseFloat(speed);
                chrome.storage.local.set({ [STORAGE_KEY]: speed });
            }
            if (document.activeElement !== numberInput) numberInput.value = parseFloat(speed).toFixed(2);
            if (document.activeElement !== rangeInput && speed <= 4) rangeInput.value = speed;
        };

        numberInput.addEventListener('change', (e) => applySpeed(e.target.value));
        rangeInput.addEventListener('input', (e) => applySpeed(e.target.value));
        resetBtn.addEventListener('click', () => applySpeed(1.0));

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            const isTyping = document.activeElement.tagName === 'INPUT' || 
                             document.activeElement.tagName === 'TEXTAREA' || 
                             document.activeElement.isContentEditable;
            
            // Allow shortcuts if in numberInput, but not in other inputs
            if (isTyping && document.activeElement !== numberInput) return;

            const video = document.querySelector('video');
            if (!video) return;

            if (e.key === ']') applySpeed(Math.min(16, video.playbackRate + 0.1));
            if (e.key === '[') applySpeed(Math.max(0.1, video.playbackRate - 0.1));
        });
    }

    // --- MESSAGE LISTENER (Toolbar Toggle) ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "toggle_ui") {
            const panel = document.getElementById(PANEL_ID);
            if (panel) {
                if (panel.classList.contains('hidden')) {
                    panel.classList.remove('hidden');
                    chrome.storage.local.set({ [VISIBILITY_KEY]: true });
                } else {
                    panel.classList.add('hidden');
                    chrome.storage.local.set({ [VISIBILITY_KEY]: false });
                }
            } else {
                createUI();
            }
        }
    });

    // --- INIT LOOP ---
    setInterval(() => {
        createUI();
        const video = document.querySelector('video');
        if (video) {
            const numInput = document.getElementById('yts-number');
            const rangeInput = document.getElementById('yts-range');
            if (numInput && document.activeElement !== numInput && document.activeElement !== rangeInput) {
                if (Math.abs(video.playbackRate - parseFloat(numInput.value)) > 0.1) {
                    numInput.value = video.playbackRate.toFixed(2);
                    if (video.playbackRate <= 4) rangeInput.value = video.playbackRate;
                }
            }
        }
    }, 1000);

    // Apply saved speed once on load
    chrome.storage.local.get([STORAGE_KEY], (data) => {
        const savedSpeed = data[STORAGE_KEY];
        if (savedSpeed) {
            const checkVideo = setInterval(() => {
                const video = document.querySelector('video');
                if (video) {
                    video.playbackRate = parseFloat(savedSpeed);
                    clearInterval(checkVideo);
                }
            }, 500);
            
            // Timeout to clear interval if no video found after 10s
            setTimeout(() => clearInterval(checkVideo), 10000);
        }
    });
    
})();