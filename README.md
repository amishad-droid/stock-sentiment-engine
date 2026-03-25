# Stock Sentiment & Price Prediction Engine

A full-stack web app that processes financial news, scores sentiment using NLP techniques, and predicts short-term stock price direction using three ML classifiers.

Built with Python (Flask), vanilla JavaScript, and Chart.js.

---

## Features

- Sentiment analysis on financial news articles
- Price direction prediction (bullish / bearish / neutral)
- Three ML model comparison: logistic regression, random forest, gradient boosting
- 7-day price trend chart
- 30-day sentiment distribution chart
- REST API backend (`/api/analyze/<ticker>`)

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | Python, Flask                     |
| Frontend | HTML, CSS, Vanilla JavaScript     |
| Charts   | Chart.js                          |
| ML/NLP   | Simulated (swap in real models)   |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/stock-sentiment-engine.git
cd stock-sentiment-engine
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

Activate it:
- **Mac/Linux:** `source venv/bin/activate`
- **Windows:**   `venv\Scripts\activate`

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the app

```bash
python app.py
```

Open your browser and go to: **http://127.0.0.1:5000**

---

## Project Structure

```
stock-sentiment-engine/
├── app.py                  # Flask backend & API routes
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Main HTML page
└── static/
    ├── css/
    │   └── style.css       # Stylesheet
    └── js/
        └── main.js         # Frontend logic & charts
```

---

## API Endpoints

| Method | Endpoint                | Description                        |
|--------|-------------------------|------------------------------------|
| GET    | `/`                     | Main web interface                 |
| GET    | `/api/tickers`          | List all available tickers         |
| GET    | `/api/analyze/<ticker>` | Full analysis for a given ticker   |

Example:
```bash
curl http://127.0.0.1:5000/api/analyze/AAPL
```

---

## Roadmap / Future Improvements

- [ ] Integrate real news API (NewsAPI, Alpha Vantage)
- [ ] Add real NLP sentiment model (VADER, FinBERT)
- [ ] Train actual ML classifiers on historical data
- [ ] Add more tickers and crypto support
- [ ] Deploy to Heroku / Render / Railway

---

## Disclaimer

This is a portfolio/educational project. All predictions use simulated data and are not financial advice.
