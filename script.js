// --- UTILITY FUNCTIONS ---
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const getRandomPastel = () => {
    const hue = Math.floor(Math.random() * 360);
    const fill = `hsla(${hue}, 75%, 92%, 0.6)`; 
    const border = `hsl(${hue}, 70%, 65%)`;
    return { fill, border };
};


// --- PUZZLE GENERATOR ---

function generateDominoValues(count, pipRange) {
    const [min, max] = pipRange;
    const dominoes = new Set();
    const dominoList = [];
    while (dominoList.length < count) {
        const v1 = Math.floor(Math.random() * (max - min + 1)) + min;
        const v2 = Math.floor(Math.random() * (max - min + 1)) + min;
        const key = [v1, v2].sort().join('-');
        if (!dominoes.has(key)) {
            dominoes.add(key);
            dominoList.push([v1, v2]);
        }
    }
    return dominoList;
}

function createSolution(shape, tiling, dominoValues) {
    const solutionBoard = {};
    const dominoMap = {};
    const shuffledValues = shuffleArray([...dominoValues]);

    tiling.forEach((placement, i) => {
        const [cell1, cell2] = placement;
        const [val1, val2] = Math.random() > 0.5 ? shuffledValues[i] : shuffledValues[i].slice().reverse();
        const coord1 = `${cell1.r},${cell1.c}`;
        const coord2 = `${cell2.r},${cell2.c}`;
        
        solutionBoard[coord1] = { value: val1 };
        solutionBoard[coord2] = { value: val2 };
        dominoMap[coord1] = i;
        dominoMap[coord2] = i;
    });
    
    return { solutionBoard, dominoMap };
}


function generateShapeAndTiling(rows, cols, targetDominoes) {
    const shape = [];
    const tiling = [];
    const occupied = new Set();
    if (rows * cols < targetDominoes * 2) return null;

    const startR = Math.floor(Math.random() * (rows - 1));
    const startC = Math.floor(Math.random() * (cols - 1));
    const firstCell = { r: startR, c: startC };
    const secondCell = Math.random() > 0.5 ? { r: startR + 1, c: startC } : { r: startR, c: startC + 1 };

    shape.push(firstCell, secondCell);
    tiling.push([firstCell, secondCell]);
    occupied.add(`${firstCell.r},${firstCell.c}`);
    occupied.add(`${secondCell.r},${secondCell.c}`);

    while (tiling.length < targetDominoes) {
        const possibleNextTiling = [];
        for (const cell of shape) {
            const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dr, dc] of directions) {
                const nR = cell.r + dr, nC = cell.c + dc;
                const nCoord = `${nR},${nC}`;
                if (nR >= 0 && nR < rows && nC >= 0 && nC < cols && !occupied.has(nCoord)) {
                    for (const [dr2, dc2] of directions) {
                        const pR = nR + dr2, pC = nC + dc2;
                        const pCoord = `${pR},${pC}`;
                        if (pR >= 0 && pR < rows && pC >= 0 && pC < cols && !occupied.has(pCoord)) {
                             const newDomino = [{ r: nR, c: nC }, { r: pR, c: pC }];
                             const key = [nCoord, pCoord].sort().join('|');
                             possibleNextTiling.push({ key, domino: newDomino });
                        }
                    }
                }
            }
        }
        if (possibleNextTiling.length === 0) return null;
        const uniquePlacements = Array.from(new Map(possibleNextTiling.map(p => [p.key, p.domino])).values());
        const chosenDomino = uniquePlacements[Math.floor(Math.random() * uniquePlacements.length)];
        const [cellA, cellB] = chosenDomino;
        shape.push(cellA, cellB);
        tiling.push(chosenDomino);
        occupied.add(`${cellA.r},${cellA.c}`);
        occupied.add(`${cellB.r},${cellB.c}`);
    }
    return { shape, tiling };
}

function generateRegions(solutionBoard, dominoMap, shape) {
    const regions = [];
    const unassignedCells = new Set(shape.map(c => `${c.r},${c.c}`));
    const cellsInRegions = new Set();
    const maxRegionSize = Math.max(2, Math.floor(shape.length / 4));
    const targetCoverage = shape.length * (Math.random() * 0.15 + 0.80); // Cover 80-95% of cells

    let regionIndex = 0;
    while (cellsInRegions.size < targetCoverage && unassignedCells.size > 0) {
        const unassignedArray = Array.from(unassignedCells);
        const startCoordStr = unassignedArray[Math.floor(Math.random() * unassignedArray.length)];
        const [startR, startC] = startCoordStr.split(',').map(Number);

        const regionTargetSize = Math.floor(Math.random() * maxRegionSize) + 1;
        const newRegionCells = [];
        const queue = [{ r: startR, c: startC }];
        const visitedInRegion = new Set([startCoordStr]);

        while (queue.length > 0 && newRegionCells.length < regionTargetSize) {
            const currentCell = queue.shift();
            const currentCoordStr = `${currentCell.r},${currentCell.c}`;
            const firstDominoIndex = dominoMap[startCoordStr];
            if (dominoMap[currentCoordStr] === firstDominoIndex && newRegionCells.length > 0) {
                continue;
            }
            newRegionCells.push(currentCell);

            const neighbors = shuffleArray([[0, 1], [0, -1], [1, 0], [-1, 0]]);
            for (const [dr, dc] of neighbors) {
                const nR = currentCell.r + dr, nC = currentCell.c + dc;
                const neighborCoordStr = `${nR},${nC}`;
                if (unassignedCells.has(neighborCoordStr) && !visitedInRegion.has(neighborCoordStr)) {
                    visitedInRegion.add(neighborCoordStr);
                    queue.push({ r: nR, c: nC });
                }
            }
        }
        
        if (newRegionCells.length > 0) {
            let rule, value, display;
            const pips = newRegionCells.map(c => solutionBoard[`${c.r},${c.c}`].value);
            const sum = pips.reduce((a, b) => a + b, 0);

            if (pips.length === 1) {
                rule = 'sum'; value = pips[0]; display = `${pips[0]}`;
            } else {
                const possibleRules = ['sum'];
                if (pips.every(p => p === pips[0])) possibleRules.push('equal');
                if (sum > 1) possibleRules.push('sum_greater_than');
                possibleRules.push('sum_less_than');

                const chosenRule = possibleRules[Math.floor(Math.random() * possibleRules.length)];
                switch (chosenRule) {
                    case 'equal': rule = 'equal'; display = '='; break;
                    case 'sum_greater_than': rule = 'sum'; value = sum - 1; display = `> ${value}`; break;
                    case 'sum_less_than': rule = 'sum'; value = sum + 1; display = `< ${value}`; break;
                    default: rule = 'sum'; value = sum; display = `${value}`; break;
                }
            }
            
            regions.push({ domId: `rule-${regionIndex++}`, cells: newRegionCells, rule, value, display });
            newRegionCells.forEach(c => {
                unassignedCells.delete(`${c.r},${c.c}`);
                cellsInRegions.add(`${c.r},${c.c}`);
            });
        }
    }
    return regions;
}


function generatePuzzle(config) {
    const { rows, cols, numDominoes, pipRange } = config;
    let attempts = 0;
    while (attempts < 100) {
        const generated = generateShapeAndTiling(rows, cols, numDominoes);
        if (!generated) { attempts++; continue; }
        const { shape, tiling } = generated;
        const dominoValues = generateDominoValues(numDominoes, pipRange);
        const { solutionBoard, dominoMap } = createSolution(shape, tiling, dominoValues);
        const regions = generateRegions(solutionBoard, dominoMap, shape);
        if (regions) {
            console.log(`Puzzle generated successfully in ${attempts + 1} attempt(s).`);
            return { gridSize: { rows, cols }, shape, dominoes: dominoValues, regions };
        }
        attempts++;
    }
    throw new Error("Failed to generate a solvable puzzle. Please check parameters.");
}

const numDominoes = Math.floor(Math.random() * 3) + 5;
const puzzle = generatePuzzle({
    rows: 5,
    cols: 5,
    numDominoes: numDominoes, 
    pipRange: [1, 6]
});

// --- DOM ELEMENTS & GAME STATE ---
const gameContainer = document.getElementById('game-container');
const boardGrid = document.getElementById('board-grid');
const dominoPalette = document.getElementById('domino-palette');
const dominoContainer = document.getElementById('domino-container');
const regionOverlay = document.getElementById('region-overlay');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
let boardState = {};
let dominoElements = {};

// --- GAME LOGIC ---

function checkSolution() {
    document.querySelectorAll('.region-rule.incorrect-rule').forEach(el => el.classList.remove('incorrect-rule'));

    let allRegionsValid = true;
    puzzle.regions.forEach(region => {
        const pipsInRegion = region.cells.map(cell => {
            const coord = `${cell.r},${cell.c}`;
            return boardState[coord] ? boardState[coord].value : -1;
        });

        if (pipsInRegion.includes(-1)) {
            allRegionsValid = false;
            return;
        }

        let isRegionValid = false;
        const sum = pipsInRegion.reduce((a, b) => a + b, 0);

        switch (region.rule) {
            case 'sum':
                if (region.display.includes('<')) isRegionValid = sum < region.value;
                else if (region.display.includes('>')) isRegionValid = sum > region.value;
                else isRegionValid = sum === region.value;
                break;
            case 'equal':
                isRegionValid = pipsInRegion.every(pip => pip === pipsInRegion[0]);
                break;
        }

        if (!isRegionValid) {
            allRegionsValid = false;
            document.getElementById(region.domId)?.classList.add('incorrect-rule');
        }
    });

    if (allRegionsValid) {
        showMessage('Congratulations! You solved the puzzle!', 'bg-green-400 text-green-800');
    }
}


function createPipContainer(value) {
    const container = document.createElement('div');
    container.className = 'pip-container';
    if (value > 0) {
        for (let i = 0; i < value; i++) {
            const pip = document.createElement('div');
            pip.className = `pip pip-${value}`;
            container.appendChild(pip);
        }
    }
    return container;
};

function showMessage(text, colorClass) {
    messageText.textContent = text;
    messageBox.className = `fixed top-5 right-5 p-4 rounded-lg shadow-lg opacity-100 pointer-events-auto max-w-xs text-center font-medium ${colorClass}`;
    setTimeout(() => {
        messageBox.classList.replace('opacity-100', 'opacity-0');
        messageBox.classList.add('pointer-events-none');
    }, 3000);
};

function generateSvgPath(shape, cellSize, padding, minR, minC) {
    const edges = new Map();

    for (const cell of shape) {
        const { r, c } = cell;
        const p = [
            { x: (c - minC) * cellSize + padding, y: (r - minR) * cellSize + padding },
            { x: (c - minC + 1) * cellSize + padding, y: (r - minR) * cellSize + padding },
            { x: (c - minC + 1) * cellSize + padding, y: (r - minR + 1) * cellSize + padding },
            { x: (c - minC) * cellSize + padding, y: (r - minR + 1) * cellSize + padding }
        ];

        const cellEdges = [
            [p[0], p[1]], [p[1], p[2]], [p[2], p[3]], [p[3], p[0]]
        ];

        for (const edge of cellEdges) {
            const key = [edge[0], edge[1]].map(pt => `${pt.x},${pt.y}`).sort().join(';');
            edges.set(key, (edges.get(key) || 0) + 1);
        }
    }

    const exteriorSegments = [];
    for (const [key, count] of edges.entries()) {
        if (count === 1) {
            const [p1Str, p2Str] = key.split(';');
            const [x1, y1] = p1Str.split(',').map(Number);
            const [x2, y2] = p2Str.split(',').map(Number);
            exteriorSegments.push({ p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } });
        }
    }

    if (exteriorSegments.length === 0) return '';

    const path = [];
    let current = exteriorSegments.pop();
    path.push(current.p1, current.p2);

    while (exteriorSegments.length > 0) {
        const lastPoint = path[path.length - 1];
        const nextSegmentIndex = exteriorSegments.findIndex(seg =>
            (seg.p1.x === lastPoint.x && seg.p1.y === lastPoint.y) ||
            (seg.p2.x === lastPoint.x && seg.p2.y === lastPoint.y)
        );
        if (nextSegmentIndex === -1) break;
        current = exteriorSegments.splice(nextSegmentIndex, 1)[0];
        if (current.p1.x === lastPoint.x && current.p1.y === lastPoint.y) {
            path.push(current.p2);
        } else {
            path.push(current.p1);
        }
    }

    let d = `M ${path[0].x} ${path[0].y}`;
    for (let i = 1; i < path.length; i++) {
        d += ` L ${path[i].x} ${path[i].y}`;
    }
    d += ' Z';
    return d;
}


function initializeBoard() {
    boardGrid.innerHTML = '';
    dominoContainer.innerHTML = '';
    regionOverlay.innerHTML = '';
    const existingSvg = document.getElementById('shape-svg-container');
    if (existingSvg) existingSvg.remove();

    const cellSize = 62;
    const padding = 15;

    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    puzzle.shape.forEach(cell => {
        minR = Math.min(minR, cell.r);
        maxR = Math.max(maxR, cell.r);
        minC = Math.min(minC, cell.c);
        maxC = Math.max(maxC, cell.c);
    });

    const pathData = generateSvgPath(puzzle.shape, cellSize, padding, minR, minC);

    if (pathData) {
        const svgNS = "http://www.w3.org/2000/svg";
        const svgContainer = document.createElementNS(svgNS, 'svg');
        svgContainer.id = 'shape-svg-container';

        const shapeWidth = (maxC - minC + 1) * cellSize;
        const shapeHeight = (maxR - minR + 1) * cellSize;
        const svgWidth = shapeWidth + padding * 2;
        const svgHeight = shapeHeight + padding * 2;
        
        svgContainer.setAttribute('width', svgWidth.toString());
        svgContainer.setAttribute('height', svgHeight.toString());
        svgContainer.style.top = `${minR * cellSize - padding}px`;
        svgContainer.style.left = `${minC * cellSize - padding}px`;
        
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', '#e5e7eb');
        path.setAttribute('stroke', '#e5e7eb');
        path.setAttribute('stroke-width', (padding * 2).toString());
        path.setAttribute('stroke-linejoin', 'round');

        svgContainer.appendChild(path);
        gameContainer.insertBefore(svgContainer, boardGrid);
    }

    // Create the grid cells
    boardGrid.style.gridTemplateRows = `repeat(${puzzle.gridSize.rows}, 60px)`;
    boardGrid.style.gridTemplateColumns = `repeat(${puzzle.gridSize.cols}, 60px)`;
    const shapeCoords = new Set(puzzle.shape.map(cell => `${cell.r},${cell.c}`));
    
    for (let r = 0; r < puzzle.gridSize.rows; r++) {
        for (let c = 0; c < puzzle.gridSize.cols; c++) {
            const cell = document.createElement('div');
            const coord = `${r},${c}`;
            cell.className = shapeCoords.has(coord) ? 'grid-cell' : 'grid-cell placeholder';
            if (shapeCoords.has(coord)) {
                cell.dataset.r = r;
                cell.dataset.c = c;
            }
            boardGrid.appendChild(cell);
        }
    }
    
    initializeRegions();
}


function initializeRegions() {
    const cellSize = 62;
    puzzle.regions.forEach((region) => {
        const regionCells = new Set(region.cells.map(c => `${c.r},${c.c}`));
        const { fill, border } = getRandomPastel();

        let topLeftCell = region.cells[0];
        region.cells.forEach(cell => {
            if (cell.r < topLeftCell.r || (cell.r === topLeftCell.r && cell.c < topLeftCell.c)) {
                topLeftCell = cell;
            }
        });

        // Create separate divs for each cell in the region for the color overlay
        region.cells.forEach(cellPos => {
            const regionCellEl = document.createElement('div');
            regionCellEl.style.position = 'absolute';
            regionCellEl.style.top = `${cellPos.r * cellSize}px`;
            regionCellEl.style.left = `${cellPos.c * cellSize}px`;
            regionCellEl.style.width = `${cellSize - 2}px`;
            regionCellEl.style.height = `${cellSize - 2}px`;
            regionCellEl.style.backgroundColor = fill;
            regionCellEl.style.borderRadius = '6px';
            
            if (!regionCells.has(`${cellPos.r - 1},${cellPos.c}`)) regionCellEl.style.borderTop = `2px dashed ${border}`;
            if (!regionCells.has(`${cellPos.r + 1},${cellPos.c}`)) regionCellEl.style.borderBottom = `2px dashed ${border}`;
            if (!regionCells.has(`${cellPos.r},${cellPos.c - 1}`)) regionCellEl.style.borderLeft = `2px dashed ${border}`;
            if (!regionCells.has(`${cellPos.r},${cellPos.c + 1}`)) regionCellEl.style.borderRight = `2px dashed ${border}`;

            regionOverlay.appendChild(regionCellEl);
        });

        const ruleEl = document.createElement('div');
        ruleEl.id = region.domId;
        ruleEl.textContent = region.display;
        ruleEl.className = `region-rule`;
        ruleEl.style.borderColor = border;
        ruleEl.style.backgroundColor = border;
        ruleEl.style.top = `${topLeftCell.r * cellSize}px`;
        ruleEl.style.left = `${topLeftCell.c * cellSize}px`;
        ruleEl.style.transform = 'translate(-50%, -50%)';
        
        regionOverlay.appendChild(ruleEl);
    });
}

function initializeDominoes() {
    dominoPalette.innerHTML = '';
    puzzle.dominoes.forEach(dominoValue => {
        const id = [...dominoValue].sort().join('-');
        const slotEl = document.createElement('div');
        slotEl.className = 'domino-slot';
        slotEl.id = `slot-${id}`;
        const dominoEl = document.createElement('div');
        dominoEl.className = 'domino';
        dominoEl.dataset.id = id;
        const half1 = document.createElement('div');
        half1.className = 'domino-half';
        const half2 = document.createElement('div');
        half2.className = 'domino-half';
        dominoEl.appendChild(half1);
        dominoEl.appendChild(half2);
        slotEl.appendChild(dominoEl);
        dominoPalette.appendChild(slotEl);
        dominoElements[id] = { element: dominoEl, slotId: slotEl.id, currentValues: [...dominoValue], placed: false, position: null, rotation: 0 };
        updateDominoVisuals(dominoEl, dominoElements[id]);
        addInteractionListeners(dominoEl);
    });
}

// --- INTERACTION LOGIC ---
let activeDomino = null, isDragging = false, startX, startY, offsetX, offsetY, mouseDownTime;

function addInteractionListeners(el) {
    el.addEventListener('mousedown', onInteractionStart);
    el.addEventListener('touchstart', onInteractionStart, { passive: false });
}

function onInteractionStart(e) {
    if (e.button === 2) return; 
    
    activeDomino = e.target.closest('.domino');
    if (!activeDomino) return;
    
    mouseDownTime = Date.now();
    isDragging = false; 
    
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    startX = clientX; 
    startY = clientY;
    
    document.addEventListener('mousemove', onInteractionMove);
    document.addEventListener('touchmove', onInteractionMove, { passive: false });
    document.addEventListener('mouseup', onInteractionEnd);
    document.addEventListener('touchend', onInteractionEnd);
}

function onInteractionMove(e) {
    if (!activeDomino) return;
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    if (!isDragging && (Math.abs(clientX - startX) > 5 || Math.abs(clientY - startY) > 5)) {
        isDragging = true;
        activeDomino.classList.add('dragging');
        const rect = activeDomino.getBoundingClientRect();
        offsetX = clientX - rect.left; 
        offsetY = clientY - rect.top;
        
        const id = activeDomino.dataset.id;
        if (dominoElements[id].placed) removeDominoFromBoard(id);
        
        document.body.appendChild(activeDomino);
        activeDomino.style.position = 'absolute';
    }
    
    if (isDragging) {
        e.preventDefault();
        activeDomino.style.left = `${clientX - offsetX}px`;
        activeDomino.style.top = `${clientY - offsetY}px`;
    }
}

function onInteractionEnd(e) {
    if (!activeDomino) return;

    const timeElapsed = Date.now() - mouseDownTime;

    if (!isDragging && timeElapsed < 200) {
        rotateDomino(activeDomino);
    } 
    else if (isDragging) {
        const boardRect = boardGrid.getBoundingClientRect();
        const dominoLeft = parseFloat(activeDomino.style.left);
        const dominoTop = parseFloat(activeDomino.style.top);
        let placed = false;
        
        if (dominoLeft < boardRect.right && dominoLeft + activeDomino.offsetWidth > boardRect.left &&
            dominoTop < boardRect.bottom && dominoTop + activeDomino.offsetHeight > boardRect.top) {
            
            const finalR = Math.round((dominoTop - boardRect.top) / 62);
            const finalC = Math.round((dominoLeft - boardRect.left) / 62);
            if (tryPlaceDomino(activeDomino, finalR, finalC)) placed = true;
        }
        
        if (!placed) moveDominoToPalette(activeDomino);
        activeDomino.classList.remove('dragging');
    }
    
    activeDomino = null;
    isDragging = false;
    document.removeEventListener('mousemove', onInteractionMove);
    document.removeEventListener('touchmove', onInteractionMove);
    document.removeEventListener('mouseup', onInteractionEnd);
    document.removeEventListener('touchend', onInteractionEnd);
}

function rotateDomino(el) {
    if (!el) return;
    const id = el.dataset.id;
    const dominoState = dominoElements[id];
    const wasVertical = dominoState.rotation === 90 || dominoState.rotation === 270;
    dominoState.rotation = (dominoState.rotation + 90) % 360;
    const isVertical = dominoState.rotation === 90 || dominoState.rotation === 270;
    if (wasVertical && !isVertical) dominoState.currentValues.reverse();
    updateDominoVisuals(el, dominoState);
    if (dominoState.placed) {
        const { r, c } = dominoState.position;
        removeDominoFromBoard(id);
        if (!tryPlaceDomino(el, r, c)) moveDominoToPalette(el);
    }
}

function updateDominoVisuals(el, state) {
    const isVertical = state.rotation === 90 || state.rotation === 270;
    el.classList.toggle('rotated', isVertical);
    if (el.parentElement.classList.contains('domino-slot')) {
        el.parentElement.classList.toggle('rotated-slot', isVertical);
    }
    const [val1, val2] = state.currentValues;
    el.children[0].innerHTML = ''; el.children[0].appendChild(createPipContainer(val1));
    el.children[1].innerHTML = ''; el.children[1].appendChild(createPipContainer(val2));
}

function tryPlaceDomino(dominoEl, r, c) {
    const id = dominoEl.dataset.id;
    const dominoState = dominoElements[id];
    const isVertical = dominoState.rotation === 90 || dominoState.rotation === 270;
    const cell1Coord = `${r},${c}`;
    const cell2Coord = isVertical ? `${r + 1},${c}` : `${r},${c + 1}`;
    if (isPlacementValid(cell1Coord, cell2Coord, id)) {
        placeDominoOnBoard(dominoEl, r, c);
        return true;
    }
    return false;
}

function isPlacementValid(coord1, coord2, dominoId) {
    const shapeCoords = new Set(puzzle.shape.map(cell => `${cell.r},${cell.c}`));
    const cell1Valid = shapeCoords.has(coord1) && (!boardState[coord1] || boardState[coord1].dominoId === dominoId);
    const cell2Valid = shapeCoords.has(coord2) && (!boardState[coord2] || boardState[coord2].dominoId === dominoId);
    return cell1Valid && cell2Valid;
}

function placeDominoOnBoard(dominoEl, r, c) {
    const id = dominoEl.dataset.id;
    const dominoState = dominoElements[id];
    const isVertical = dominoState.rotation === 90 || dominoState.rotation === 270;
    const [val1, val2] = dominoState.currentValues;
    dominoContainer.appendChild(dominoEl);
    dominoEl.style.position = 'absolute';
    dominoEl.style.pointerEvents = 'auto';
    dominoEl.style.left = `${c * 62}px`;
    dominoEl.style.top = `${r * 62}px`;
    dominoState.placed = true;
    dominoState.position = { r, c };
    boardState[`${r},${c}`] = { dominoId: id, value: val1 };
    if (isVertical) {
        boardState[`${r + 1},${c}`] = { dominoId: id, value: val2 };
    } else {
        boardState[`${r},${c + 1}`] = { dominoId: id, value: val2 };
    }
    if (Object.keys(boardState).length === puzzle.shape.length) {
        checkSolution();
    }
}

function removeDominoFromBoard(id) {
    const dominoState = dominoElements[id];
    if (!dominoState || !dominoState.placed) return;
    dominoState.placed = false;
    dominoState.position = null;
    const keysToRemove = Object.keys(boardState).filter(key => boardState[key].dominoId === id);
    keysToRemove.forEach(key => delete boardState[key]);
    document.querySelectorAll('.region-rule.incorrect-rule').forEach(el => el.classList.remove('incorrect-rule'));
}

function moveDominoToPalette(dominoEl) {
    const id = dominoEl.dataset.id;
    removeDominoFromBoard(id);
    dominoEl.style.position = 'relative';
    dominoEl.style.left = 'auto';
    dominoEl.style.top = 'auto';
    dominoEl.style.pointerEvents = 'auto';
    const slotEl = document.getElementById(dominoElements[id].slotId);
    slotEl.appendChild(dominoEl);
}

// --- INITIALIZE GAME ---
document.addEventListener('DOMContentLoaded', () => {
    if (puzzle) {
        initializeBoard();
        initializeDominoes();
    } else {
        gameContainer.innerHTML = 
            '<p class="text-red-500 font-bold">Error: Could not generate a puzzle. Please refresh the page.</p>';
    }
});