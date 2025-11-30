import { dates } from "./Dates.js";

const para1 = document.getElementById("para");
const inputbox = document.getElementById("I1");
const btn = document.getElementById("B1");
const stocksappear = document.getElementById("list");
const genbtn = document.getElementById("B2");
const list_stock = [];

// Panels
const actionPanel = document.querySelector('.action-panel'); 
const loadingPanel = document.querySelector('.loading-panel');
const apiMsg = document.getElementById('api-msg');
const outputPanel = document.querySelector('.output-panel');

// 🔴 1. API KEYS
// THIS IS CORRECT
const polygonApiKey = import.meta.env.VITE_api_polygon;
const GROQ_API_KEY = import.meta.env.VITE_api_groq;

genbtn.disabled = true; 
const punchSound = new Audio('punch.mp3'); // Make sure punch.mp3 is in your folder
// Event Listeners
genbtn.addEventListener('click', fetchStockdata);

btn.addEventListener('click', (e) => {
    e.preventDefault();
    punchSound.currentTime = 0; // Rewind to start (allows rapid clicking)
    punchSound.play().catch(e => console.log("Audio couldn't play automatically"));
    if (inputbox.value.length > 0) {
        if (list_stock.length >= 3) {
            para1.style.color = 'red';
            para1.textContent = 'Maximum 3 tickers allowed!';
            return;
        }
        genbtn.disabled = false;
        const newticker = inputbox.value;
        list_stock.push(newticker.toUpperCase());
        inputbox.value = ''; 
        para1.style.color = 'black'; 
        renderTickers();
    } else {
        para1.style.color = 'red';
        para1.textContent = 'You must add at least one ticker.';
    }
});

function renderTickers() {
    stocksappear.innerHTML = '';
    list_stock.forEach((ticker) => {
        const tickerspn = document.createElement('span');
        tickerspn.textContent = ticker;
        tickerspn.classList.add('ticker');
        tickerspn.style.margin = "0 10px"; 
        tickerspn.style.fontWeight = "bold";
        stocksappear.appendChild(tickerspn);
    });
}

async function fetchStockdata() {
    actionPanel.style.display = 'none'; 
    loadingPanel.style.display = 'flex';
    
    try {
        const stockdata = await Promise.all(list_stock.map(async (ticker) => {
            const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${dates.startDate}/${dates.endDate}?apiKey=${polygonApiKey}`;
            const response = await fetch(url);
            
            if (response.status === 200) {
                const data = await response.json();
                apiMsg.innerText = 'Creating report using my psychic abilities...';
                return `Ticker: ${ticker}, Data: ${JSON.stringify(data.results)}`;
            } else {
                apiMsg.innerText = 'Error fetching data for ' + ticker;
                return null;
            }
        }));

        const validData = stockdata.filter(item => item !== null);
        
        if (validData.length === 0) {
            throw new Error("No valid stock data found.");
        }

        fetchReportData(validData.join('\n'));

    } catch (err) {
        apiMsg.innerText = 'Error fetching stock data';
        console.error('error', err);
        // Reset UI on error
        setTimeout(() => {
            loadingPanel.style.display = 'none';
            actionPanel.style.display = 'block';
        }, 2000);
    }
}

async function fetchReportData(stockDataString) {
    const messages = [
        {
            role: "system",
            content: `You are the Greatest Psychic of the 21st Century, Reigen Arataka. 
            Your task: Analyze these stocks by reading their "aura" and "evil spirits".
            Style Guide:
            1. USE EMOJIS FREQUENTLY (e.g., ✨, 👻, 📉, 🧂, 💸, 🔮).
            2. Be overconfident but vaguely nonsensical.
            3. Mention your "Special Moves" (like 'Salt Splash' or 'Sorcery Crush').
            4. Keep it brief and punchy.`
        },
        {
            role: "user",
            content: `Here is the market data: ${stockDataString}. What do the spirits say?`
        }
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}` 
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile', 
                messages: messages,
                temperature: 1.1 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Groq API Error: ${response.status}`);
        }

        const data = await response.json();
        renderReport(data.choices[0].message.content);

    } catch (err) {
        console.error('Full Error:', err);
        renderReport(`Reigen's Prediction: \n\n(Spirits are busy: ${err.message}) \n\n...but buy low, sell high!`);
    }
}

function renderReport(output) {
    loadingPanel.style.display = 'none';
    outputPanel.style.display = 'flex';
    performSaltSplash();
    const report = document.createElement('p');
    report.className = "prediction-text";
    report.style.color = getRandomDarkColor(); 
    report.innerText = output;
    
    outputPanel.appendChild(report);
}

function getRandomDarkColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 10)];
    }
    return color;
}
/* --- NEW FEATURE: SALT SPLASH --- */
function performSaltSplash() {
    const saltCount = 80; // Number of grains
    
    for (let i = 0; i < saltCount; i++) {
        const salt = document.createElement('div');
        salt.className = 'salt-grain';
        
        // Randomize position (left/right)
        salt.style.left = Math.random() * 100 + 'vw';
        
        // Randomize size slightly
        const size = Math.random() * 5 + 3 + 'px'; // 3px to 8px
        salt.style.width = size;
        salt.style.height = size;

        // Randomize speed (0.5s to 2.5s)
        const duration = Math.random() * 2 + 0.5 + 's';
        salt.style.animationDuration = duration;
        
        // Add to body
        document.body.appendChild(salt);

        // Cleanup: Remove element after animation finishes
        setTimeout(() => {
            salt.remove();
        }, 3000); // 3 seconds is enough for even the slowest grain
    }
}
