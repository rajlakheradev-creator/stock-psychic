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

genbtn.disabled = true; 
const punchSound = new Audio('/media/punch.mp3');
const loadingMusic = new Audio('/media/loading.m4a');
loadingMusic.volume = 0.4;
const loadingMusicStartAt = 5; // skip first 5 seconds

loadingMusic.addEventListener('ended', () => {
    loadingMusic.currentTime = loadingMusicStartAt;
    loadingMusic.play().catch(e => console.log("Loading music couldn't replay automatically"));
});
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

// Updates the visible ticker list from the current in-memory selections.
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

// Fetches recent Polygon market data for each selected ticker, then starts report generation.
async function fetchStockdata() {
    actionPanel.style.display = 'none'; 
    loadingPanel.style.display = 'flex';
    loadingMusic.currentTime = loadingMusicStartAt;
    loadingMusic.play().catch(e => console.log("Loading music couldn't play automatically"));
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
        loadingMusic.pause();
        loadingMusic.currentTime = 0;
        apiMsg.innerText = 'Error fetching stock data';
        console.error('error', err);
        // Reset UI on error
        setTimeout(() => {
            loadingPanel.style.display = 'none';
            actionPanel.style.display = 'block';
        }, 2000);
    }
}

// Sends the collected stock data to the server-side Groq proxy and renders the AI report.
async function fetchReportData(stockDataString) {
    const messages = [
  {
    role: "system",
    content: `
You are the Greatest Psychic of the 21st Century, Reigen Arataka.

Your task: Analyze these stocks by reading their "aura" and "evil spirits".

Style Guide:
1. USE only 2 or fewer EMOJIS per line FREQUENTLY (✨, 👻, 📉, 🧂, 💸, 🔮).
2. Be overconfident but vaguely nonsensical.
3. Mention your "Special Moves" (Salt Splash, Sorcery Crush, etc.).
4. You MUST return the report in EXACTLY FOUR HTML SECTIONS:

<section id="pattern-detected">
  <h2>Pattern Detected</h2>
  {{pattern}}
</section>

<section id="spirits-advice">
  <h2>Spirit's Advice</h2>
  {{advice}}
</section>

<section id="risk-zone">
  <h2>Risk Zone</h2>
  {{risk}}
</section>

<section id="special-move">
  <h2>Special Move</h2>
  {{move}}
</section>

Rules:
- Do NOT add extra sections.
- Do NOT wrap everything inside one block.
- Replace {{pattern}}, {{advice}}, {{risk}}, {{move}} with your generated content.
- Output ONLY valid HTML.
`
  },
  {
    role: "user",
    content: `Here is the market data: ${stockDataString}. What do the spirits say?`
  }
];


    try {
        const response = await fetch('/api/groq', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile', 
                messages: messages,
                temperature: 1.1 
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Groq API Error: ${response.status}`);
        }

        const data = await response.json();
        renderReport(data.choices[0].message.content);

    } catch (err) {
        console.error('Full Error:', err);
        renderReport(`Reigen's Prediction: \n\n(Spirits are busy: ${err.message}) \n\n...but buy low, sell high!`);
    }
}

// Replaces the loading state with the final prediction text and reset button.
function renderReport(output) {
    loadingMusic.pause();
    loadingMusic.currentTime = 0;
    loadingPanel.style.display = 'none';
    outputPanel.style.display = 'flex';
    performSaltSplash();

    outputPanel.querySelectorAll('.prediction-text, .try-again-btn').forEach((item) => {
        item.remove();
    });

    const report = document.createElement('p');
    report.className = "prediction-text";
    report.style.color = getRandomDarkColor(); 
    report.innerText = output;

    const tryAgainBtn = document.createElement('button');
    tryAgainBtn.type = 'button';
    tryAgainBtn.className = 'try-again-btn';
    tryAgainBtn.textContent = 'Try Other Stock';
    tryAgainBtn.addEventListener('click', resetApp);

    outputPanel.appendChild(report);
    outputPanel.appendChild(tryAgainBtn);
}

// Clears all selections and returns the interface to its starting state.
function resetApp() {
    list_stock.length = 0;
    stocksappear.innerHTML = '';
    inputbox.value = '';
    genbtn.disabled = true;
    apiMsg.innerText = 'Contacting Spirits...';
    para1.style.color = 'rgb(1, 18, 5)';
    para1.textContent = 'Add up to 3 stock tickers below to get a super accurate stock Predictions report⚡';
    outputPanel.style.display = 'none';
    actionPanel.style.display = 'block';
    loadingMusic.pause();
    loadingMusic.currentTime = 0;
}

// Generates a random dark-ish color for the prediction text.
function getRandomDarkColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 10)];
    }
    return color;
}
/* --- NEW FEATURE: SALT SPLASH --- */
// Creates the falling salt animation that plays when a report is shown.
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
