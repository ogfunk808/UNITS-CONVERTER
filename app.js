import { initVisualizer, resetCamera, updateVisualization } from './visualizer.js';

// Unit Definitions & Conversion Data
const CONVERSIONS = {
    length: {
        base: 'm',
        name: 'Length',
        units: {
            'm': { label: 'Meters (m)', factor: 1.0, description: 'SI unit of length. Equal to the path travelled by light in vacuum in 1/299792458 seconds.' },
            'km': { label: 'Kilometers (km)', factor: 1000.0, description: 'Equal to 1,000 meters. Commonly used for geographical distances.' },
            'cm': { label: 'Centimeters (cm)', factor: 0.01, description: 'Equal to 1/100 of a meter. Common metric unit for smaller measurements.' },
            'mm': { label: 'Millimeters (mm)', factor: 0.001, description: 'Equal to 1/1,000 of a meter. Used for high precision engineering.' },
            'mi': { label: 'Miles (mi)', factor: 1609.344, description: 'Imperial unit equal to 5,280 feet or 1,760 yards.' },
            'yd': { label: 'Yards (yd)', factor: 0.9144, description: 'Imperial unit equal to 3 feet or 36 inches.' },
            'ft': { label: 'Feet (ft)', factor: 0.3048, description: 'Imperial unit. Historically based on the human foot, standardized to 12 inches.' },
            'in': { label: 'Inches (in)', factor: 0.0254, description: 'Imperial unit. Defined as exactly 25.4 millimeters.' }
        }
    },
    area: {
        base: 'm²',
        name: 'Area',
        units: {
            'm²': { label: 'Square Meters (m²)', factor: 1.0, description: 'SI derived unit of area. A square with sides of one meter.' },
            'km²': { label: 'Square Kilometers (km²)', factor: 1000000.0, description: 'Equal to 1,000,000 square meters. Used for countries and regions.' },
            'cm²': { label: 'Square Centimeters (cm²)', factor: 0.0001, description: 'Equal to 1/10,000 of a square meter.' },
            'mi²': { label: 'Square Miles (mi²)', factor: 2589988.11, description: 'Imperial area unit equal to 640 acres.' },
            'ac': { label: 'Acres (ac)', factor: 4046.856, description: 'Traditional unit of land area. Approximately 43,560 square feet.' },
            'ha': { label: 'Hectares (ha)', factor: 10000.0, description: 'Non-SI metric unit equal to 10,000 square meters or a square of 100m sides.' },
            'ft²': { label: 'Square Feet (ft²)', factor: 0.09290304, description: 'Imperial area unit. A square with sides of one foot.' }
        }
    },
    volume: {
        base: 'L',
        name: 'Volume',
        units: {
            'L': { label: 'Liters (L)', factor: 1.0, description: 'Metric volume unit. Equivalent to 1 cubic decimeter (dm³).' },
            'mL': { label: 'Milliliters (mL)', factor: 0.001, description: 'Equal to 1/1,000 of a liter, or 1 cubic centimeter (cc).' },
            'm³': { label: 'Cubic Meters (m³)', factor: 1000.0, description: 'SI unit of volume. A cube with edges of one meter.' },
            'gal': { label: 'Gallons (US gal)', factor: 3.785411784, description: 'US liquid unit equal to 4 quarts or 128 fluid ounces.' },
            'qt': { label: 'Quarts (US qt)', factor: 0.946352946, description: 'US liquid unit equal to 2 pints or 32 fluid ounces.' },
            'cup': { label: 'Cups (US cup)', factor: 0.2365882365, description: 'US cooking volume unit. Standardized to 8 fluid ounces.' },
            'fl oz': { label: 'Fluid Ounces (US fl oz)', factor: 0.02957352956, description: 'US liquid unit. Approximately the volume of 1 ounce of water.' }
        }
    },
    mass: {
        base: 'kg',
        name: 'Mass',
        units: {
            'kg': { label: 'Kilograms (kg)', factor: 1.0, description: 'SI base unit of mass. Defined by fixing the Planck constant.' },
            'g': { label: 'Grams (g)', factor: 0.001, description: 'Equal to 1/1,000 of a kilogram. Standard chemical measurement unit.' },
            'mg': { label: 'Milligrams (mg)', factor: 0.000001, description: 'Equal to 1/1,000,000 of a kilogram. Used for small dosages.' },
            'lb': { label: 'Pounds (lb)', factor: 0.45359237, description: 'Avoirdupois weight unit. Defined as exactly 0.45359237 kilograms.' },
            'oz': { label: 'Ounces (oz)', factor: 0.028349523, description: 'Imperial weight unit equal to 1/16 of a pound.' },
            'st': { label: 'Stones (st)', factor: 6.35029318, description: 'Imperial unit of weight equal to 14 pounds. Used for body mass.' }
        }
    },
    temperature: {
        isSpecial: true,
        name: 'Temperature',
        units: {
            '°C': { label: 'Celsius (°C)', description: 'Metric scale. 0°C is water freezing point, 100°C is boiling point.' },
            '°F': { label: 'Fahrenheit (°F)', description: 'Imperial scale. 32°F is water freezing point, 212°F is boiling point.' },
            'K': { label: 'Kelvin (K)', description: 'SI unit of absolute temperature. 0 K is absolute zero (-273.15°C).' }
        },
        convert: (val, from, to) => {
            let celsius;
            if (from === '°C') celsius = val;
            else if (from === '°F') celsius = (val - 32) * 5/9;
            else if (from === 'K') celsius = val - 273.15;
            
            if (to === '°C') return celsius;
            else if (to === '°F') return (celsius * 9/5) + 32;
            else if (to === 'K') return celsius + 273.15;
            return val;
        }
    },
    speed: {
        base: 'm/s',
        name: 'Speed',
        units: {
            'm/s': { label: 'Meters per second (m/s)', factor: 1.0, description: 'SI unit of speed. Distance of 1 meter covered in 1 second.' },
            'km/h': { label: 'Kilometers per hour (km/h)', factor: 0.277777778, description: 'Metric speed unit. Commonly used for road traffic speeds.' },
            'mph': { label: 'Miles per hour (mph)', factor: 0.44704, description: 'Imperial speed unit commonly used in USA and UK.' },
            'knot': { label: 'Knots (kn)', factor: 0.514444444, description: 'Nautical speed unit equal to 1 nautical mile per hour.' }
        }
    },
    digital: {
        base: 'B',
        name: 'Data Storage',
        units: {
            'B': { label: 'Bytes (B)', factor: 1.0, description: 'Basic unit of digital information, consisting of 8 bits.' },
            'KB': { label: 'Kilobytes (KB)', factor: 1024.0, description: 'Equal to 1,024 Bytes.' },
            'MB': { label: 'Megabytes (MB)', factor: 1048576.0, description: 'Equal to 1,024 KB or 1,048,576 Bytes.' },
            'GB': { label: 'Gigabytes (GB)', factor: 1073741824.0, description: 'Equal to 1,024 MB. Common unit for RAM and hard drives.' },
            'TB': { label: 'Terabytes (TB)', factor: 1099511627776.0, description: 'Equal to 1,024 GB.' }
        }
    },
    time: {
        base: 's',
        name: 'Time',
        units: {
            's': { label: 'Seconds (s)', factor: 1.0, description: 'SI base unit of time duration.' },
            'min': { label: 'Minutes (min)', factor: 60.0, description: 'Equal to 60 seconds.' },
            'hr': { label: 'Hours (hr)', factor: 3600.0, description: 'Equal to 60 minutes or 3,600 seconds.' },
            'day': { label: 'Days (d)', factor: 86400.0, description: 'Equal to 24 hours or 86,400 seconds.' }
        }
    }
};

// Application State
let currentCategory = 'length';
let visualizerReady = false;

// DOM Elements
const inputVal = document.getElementById('input-value');
const selectFrom = document.getElementById('select-from');
const selectTo = document.getElementById('select-to');
const outputValDisplay = document.getElementById('output-value-display');
const outputUnitDisplay = document.getElementById('output-unit-display');
const formulaDisplay = document.getElementById('formula-display');
const outputScientific = document.getElementById('output-scientific');
const infoBoxDetails = document.getElementById('info-box-details');
const visualizationModeBadge = document.getElementById('visualization-mode-badge');
const btnClearInput = document.getElementById('btn-clear-input');
const btnSwapUnits = document.getElementById('btn-swap-units');
const btnCopyResult = document.getElementById('btn-copy-result');
const btnResetView = document.getElementById('btn-reset-view');

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.log('SW registration note:', err);
        });
    });
}

// Initialize SPA Routing
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupConverterEvents();
    changeCategory('length');

    // Initialize 3D Engine
    initVisualizer('three-canvas', 'canvas-loader', () => {
        visualizerReady = true;
        triggerRecalculation();
    });
});

// Setup SPA navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .footer-link-item');
    const sections = document.querySelectorAll('.spa-section');

    const handleRoute = (targetId) => {
        // Toggle active section with a clean GSAP fade transition
        sections.forEach(section => {
            if (section.id === targetId) {
                section.style.display = 'block';
                gsap.fromTo(section, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4 });
                section.classList.add('active');
            } else {
                section.style.display = 'none';
                section.classList.remove('active');
            }
        });

        // Sync header active styles
        navLinks.forEach(link => {
            if (link.dataset && link.dataset.target === targetId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Trigger visualizer resize if entering the converter
        if (targetId === 'converter-section' && visualizerReady) {
            window.dispatchEvent(new Event('resize'));
        }
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = e.currentTarget.dataset.target;
            if (targetId) {
                handleRoute(targetId);
            }
        });
    });

    // Logo returns to Home Converter
    document.getElementById('nav-logo').addEventListener('click', () => {
        handleRoute('converter-section');
    });
}

// Setup Event Listeners for Converter
function setupConverterEvents() {
    // Category click handler
    const categorySelector = document.getElementById('category-selector');
    categorySelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;
        
        // Update active class
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Transition Category
        changeCategory(btn.dataset.category);
    });

    // Inputs change handlers
    inputVal.addEventListener('input', triggerRecalculation);
    selectFrom.addEventListener('change', triggerRecalculation);
    selectTo.addEventListener('change', triggerRecalculation);

    // Clear input button
    btnClearInput.addEventListener('click', () => {
        inputVal.value = '';
        inputVal.focus();
        triggerRecalculation();
    });

    // Swap units button
    btnSwapUnits.addEventListener('click', () => {
        const temp = selectFrom.value;
        selectFrom.value = selectTo.value;
        selectTo.value = temp;
        
        // Spin swap icon slightly
        const swapIcon = btnSwapUnits.querySelector('i');
        gsap.to(swapIcon, { rotate: '+=180', duration: 0.3 });

        triggerRecalculation();
    });

    // Copy result button
    btnCopyResult.addEventListener('click', () => {
        const resultString = `${inputVal.value} ${selectFrom.value} = ${outputValDisplay.textContent} ${selectTo.value}`;
        navigator.clipboard.writeText(resultString).then(() => {
            showToast(`<i class="fa-solid fa-check"></i> Copied: ${resultString}`);
        }).catch(err => {
            showToast(`<i class="fa-solid fa-xmark"></i> Failed to copy`);
        });
    });

    // Reset camera button
    btnResetView.addEventListener('click', () => {
        resetCamera();
        const resetIcon = btnResetView.querySelector('i');
        gsap.to(resetIcon, { rotate: '+=360', duration: 0.5 });
    });
}

// Transition to new unit category
function changeCategory(categoryKey) {
    currentCategory = categoryKey;
    const catData = CONVERSIONS[categoryKey];
    
    // Clear & Populating unit lists
    selectFrom.innerHTML = '';
    selectTo.innerHTML = '';

    const keys = Object.keys(catData.units);
    keys.forEach(unitKey => {
        const unit = catData.units[unitKey];
        
        const optionFrom = document.createElement('option');
        optionFrom.value = unitKey;
        optionFrom.textContent = unit.label;
        selectFrom.appendChild(optionFrom);

        const optionTo = document.createElement('option');
        optionTo.value = unitKey;
        optionTo.textContent = unit.label;
        selectTo.appendChild(optionTo);
    });

    // Set sensible defaults
    if (keys.length > 1) {
        selectFrom.value = keys[0];
        selectTo.value = keys[1];
    }

    visualizationModeBadge.textContent = `${catData.name} sandbox`;

    triggerRecalculation();
}

// Calculate and render current state
function triggerRecalculation() {
    const rawVal = parseFloat(inputVal.value);
    const val = isNaN(rawVal) ? 0 : rawVal;

    const fromUnit = selectFrom.value;
    const toUnit = selectTo.value;
    const catData = CONVERSIONS[currentCategory];

    if (!fromUnit || !toUnit) return;

    let result = 0;
    
    // Calculation Process
    if (catData.isSpecial) {
        // Use special temperature conversion function
        result = catData.convert(val, fromUnit, toUnit);
    } else {
        const fromFactor = catData.units[fromUnit].factor;
        const toFactor = catData.units[toUnit].factor;
        result = val * (fromFactor / toFactor);
    }

    // Display updates
    updateOutputText(val, fromUnit, toUnit, result);

    // Update 3D visualizer
    if (visualizerReady) {
        updateVisualization(currentCategory, val, fromUnit, toUnit, result);
    }
}

// Update the numerical output elements
function updateOutputText(val, fromUnit, toUnit, result) {
    // 1. Value displays
    // Formats: small decimals standard, large/tiny in scientific notation
    const resultFormatted = formatNumber(result);
    outputValDisplay.textContent = resultFormatted;
    outputUnitDisplay.textContent = toUnit;

    // 2. Scientific notation display
    outputScientific.textContent = (isNaN(result) || result === 0) ? "0e+0" : result.toExponential(4);

    // 3. Formula banner
    let formulaUnitBase = 1;
    let baseResult = 0;
    const catData = CONVERSIONS[currentCategory];
    
    if (catData.isSpecial) {
        baseResult = catData.convert(1, fromUnit, toUnit);
    } else {
        baseResult = 1 * (catData.units[fromUnit].factor / catData.units[toUnit].factor);
    }
    
    formulaDisplay.textContent = `1 ${fromUnit} = ${formatNumber(baseResult)} ${toUnit}`;

    // 4. Update the info box description
    const fromDesc = catData.units[fromUnit].description || '';
    const toDesc = catData.units[toUnit].description || '';
    infoBoxDetails.innerHTML = `
        <div style="margin-bottom: 0.5rem;"><strong>${fromUnit}</strong>: ${fromDesc}</div>
        <div><strong>${toUnit}</strong>: ${toDesc}</div>
    `;
}

// Helper to format float output beautifully and cleanly
function formatNumber(num) {
    if (num === 0 || isNaN(num)) return '0';
    const absVal = Math.abs(num);
    if (absVal < 1e-5 || absVal >= 1e8) {
        return num.toExponential(4);
    }
    // Clean string representation without extra trailing zero artifacts
    return parseFloat(num.toFixed(6)).toString();
}

// Toast notification helper
function showToast(htmlContent) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = htmlContent;
    
    toast.classList.add('show');
    
    // Clear previous timeouts
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
export { CONVERSIONS };
