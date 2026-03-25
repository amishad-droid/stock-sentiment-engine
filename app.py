from flask import Flask, render_template, jsonify, request
import random
import math

app = Flask(__name__)

# ── Simulated stock data (replace with real API calls later) ──────────────────
STOCK_DATA = {
    "AAPL": {
        "name": "Apple Inc.",
        "price": 211.45, "change": 2.3,
        "avg_sentiment": 0.62, "articles": 1243,
        "prediction": "up", "confidence": 74,
        "models": {"logistic_regression": 71, "random_forest": 74, "gradient_boosting": 77},
        "prices": [205.1, 207.4, 206.8, 209.2, 208.5, 210.1, 211.45],
        "sentiment_dist": [18, 14, 9, 11, 22, 26],
        "news": [
            {"headline": "Apple Vision Pro sees surge in enterprise adoption across Fortune 500 companies", "sentiment": 0.81, "source": "Reuters", "time": "2h ago"},
            {"headline": "iPhone 17 supply chain ramps up; analysts raise price targets ahead of launch", "sentiment": 0.74, "source": "Bloomberg", "time": "4h ago"},
            {"headline": "Apple Services revenue hits all-time high, beating Wall Street estimates by 8%", "sentiment": 0.79, "source": "CNBC", "time": "6h ago"},
            {"headline": "Concerns mount over EU antitrust investigation into App Store fee structure", "sentiment": -0.44, "source": "FT", "time": "9h ago"},
            {"headline": "Apple expands AI features to older iPhone models via iOS update", "sentiment": 0.61, "source": "TechCrunch", "time": "12h ago"},
        ],
    },
    "GOOGL": {
        "name": "Alphabet Inc.",
        "price": 178.90, "change": 1.1,
        "avg_sentiment": 0.51, "articles": 987,
        "prediction": "up", "confidence": 68,
        "models": {"logistic_regression": 65, "random_forest": 68, "gradient_boosting": 70},
        "prices": [174.2, 175.8, 176.5, 175.9, 177.1, 178.0, 178.90],
        "sentiment_dist": [15, 16, 12, 13, 24, 20],
        "news": [
            {"headline": "Google Gemini Ultra beats GPT-4o on key benchmarks in independent testing", "sentiment": 0.77, "source": "The Verge", "time": "1h ago"},
            {"headline": "Alphabet Cloud division reports 28% YoY growth, narrowing gap with AWS", "sentiment": 0.72, "source": "Bloomberg", "time": "3h ago"},
            {"headline": "DOJ antitrust trial ruling expected to impact Google search default agreements", "sentiment": -0.61, "source": "WSJ", "time": "5h ago"},
            {"headline": "YouTube Shorts monetization improvements drive creator ecosystem growth", "sentiment": 0.58, "source": "Reuters", "time": "8h ago"},
            {"headline": "Waymo expands robotaxi operations to three new US cities", "sentiment": 0.65, "source": "TechCrunch", "time": "11h ago"},
        ],
    },
    "MSFT": {
        "name": "Microsoft Corp.",
        "price": 415.20, "change": 0.8,
        "avg_sentiment": 0.69, "articles": 1102,
        "prediction": "up", "confidence": 79,
        "models": {"logistic_regression": 75, "random_forest": 79, "gradient_boosting": 81},
        "prices": [409.5, 411.2, 412.8, 411.5, 413.4, 414.6, 415.20],
        "sentiment_dist": [12, 10, 8, 14, 28, 28],
        "news": [
            {"headline": "Microsoft Copilot now integrated across entire Office 365 suite globally", "sentiment": 0.84, "source": "Bloomberg", "time": "2h ago"},
            {"headline": "Azure AI services revenue doubles year-over-year on enterprise demand", "sentiment": 0.88, "source": "CNBC", "time": "4h ago"},
            {"headline": "Microsoft beats Q3 earnings estimates; raises full-year guidance", "sentiment": 0.79, "source": "Reuters", "time": "5h ago"},
            {"headline": "Xbox Game Pass subscriber growth slows despite new title releases", "sentiment": -0.32, "source": "IGN", "time": "8h ago"},
            {"headline": "Microsoft expands data center capacity with $3B investment in Asia Pacific", "sentiment": 0.67, "source": "FT", "time": "10h ago"},
        ],
    },
    "TSLA": {
        "name": "Tesla Inc.",
        "price": 248.60, "change": -3.1,
        "avg_sentiment": -0.18, "articles": 1876,
        "prediction": "down", "confidence": 63,
        "models": {"logistic_regression": 58, "random_forest": 63, "gradient_boosting": 65},
        "prices": [261.4, 258.2, 255.9, 257.1, 252.3, 250.8, 248.60],
        "sentiment_dist": [28, 22, 11, 9, 18, 12],
        "news": [
            {"headline": "Tesla Q1 deliveries miss estimates for second consecutive quarter", "sentiment": -0.72, "source": "Bloomberg", "time": "1h ago"},
            {"headline": "Musk announces new affordable Model 2 production timeline pushed to 2026", "sentiment": -0.48, "source": "Reuters", "time": "3h ago"},
            {"headline": "Tesla Cybertruck recall expanded to 46,000 units over trim issue", "sentiment": -0.65, "source": "CNBC", "time": "6h ago"},
            {"headline": "Full Self-Driving v13 receives positive safety scores in independent audit", "sentiment": 0.61, "source": "TechCrunch", "time": "9h ago"},
            {"headline": "Tesla Energy division sets quarterly record with Megapack deployments", "sentiment": 0.55, "source": "WSJ", "time": "12h ago"},
        ],
    },
    "NVDA": {
        "name": "NVIDIA Corp.",
        "price": 892.35, "change": 4.7,
        "avg_sentiment": 0.81, "articles": 2341,
        "prediction": "up", "confidence": 88,
        "models": {"logistic_regression": 82, "random_forest": 88, "gradient_boosting": 89},
        "prices": [841.2, 855.6, 862.4, 858.9, 871.3, 883.1, 892.35],
        "sentiment_dist": [8, 7, 6, 8, 30, 41],
        "news": [
            {"headline": "NVIDIA H200 GPU demand far exceeds supply as AI training boom accelerates", "sentiment": 0.91, "source": "Bloomberg", "time": "1h ago"},
            {"headline": "Blackwell architecture chips begin shipping; first benchmarks shatter records", "sentiment": 0.88, "source": "Reuters", "time": "2h ago"},
            {"headline": "NVIDIA data center revenue up 427% YoY; raises next quarter guidance", "sentiment": 0.93, "source": "CNBC", "time": "4h ago"},
            {"headline": "Export restrictions on advanced chips to China tightened by Commerce Dept.", "sentiment": -0.51, "source": "WSJ", "time": "7h ago"},
            {"headline": "NVIDIA partners with leading hospitals for medical imaging AI platform", "sentiment": 0.71, "source": "TechCrunch", "time": "10h ago"},
        ],
    },
    "AMZN": {
        "name": "Amazon.com Inc.",
        "price": 195.40, "change": 1.9,
        "avg_sentiment": 0.58, "articles": 1455,
        "prediction": "up", "confidence": 71,
        "models": {"logistic_regression": 67, "random_forest": 71, "gradient_boosting": 73},
        "prices": [189.2, 191.4, 192.8, 191.9, 193.5, 194.7, 195.40],
        "sentiment_dist": [14, 13, 11, 12, 26, 24],
        "news": [
            {"headline": "AWS re:Invent announcements drive record cloud contract signings", "sentiment": 0.78, "source": "Reuters", "time": "2h ago"},
            {"headline": "Amazon Prime membership grows to 240M globally, advertising revenue surges", "sentiment": 0.74, "source": "Bloomberg", "time": "4h ago"},
            {"headline": "Anthropic partnership expands with $4B additional investment commitment", "sentiment": 0.82, "source": "CNBC", "time": "5h ago"},
            {"headline": "FTC launches new investigation into Amazon marketplace seller practices", "sentiment": -0.55, "source": "FT", "time": "8h ago"},
            {"headline": "Amazon pharmacy and healthcare division reports profitability for first time", "sentiment": 0.66, "source": "WSJ", "time": "11h ago"},
        ],
    },
    "META": {
        "name": "Meta Platforms",
        "price": 528.75, "change": 2.4,
        "avg_sentiment": 0.54, "articles": 1334,
        "prediction": "up", "confidence": 72,
        "models": {"logistic_regression": 68, "random_forest": 72, "gradient_boosting": 74},
        "prices": [515.3, 518.9, 521.4, 520.1, 523.8, 526.4, 528.75],
        "sentiment_dist": [16, 12, 10, 13, 25, 24],
        "news": [
            {"headline": "Meta AI assistant surpasses 500M monthly active users across all platforms", "sentiment": 0.83, "source": "Bloomberg", "time": "1h ago"},
            {"headline": "Instagram and WhatsApp ad revenue beats estimates; margins expand", "sentiment": 0.76, "source": "CNBC", "time": "3h ago"},
            {"headline": "Ray-Ban Meta smart glasses sell out globally; waitlist exceeds 1M", "sentiment": 0.71, "source": "TechCrunch", "time": "6h ago"},
            {"headline": "EU regulators open probe into Meta Platforms data practices under DSA", "sentiment": -0.58, "source": "Reuters", "time": "9h ago"},
            {"headline": "Threads reaches 200M users; monetization rollout begins in US market", "sentiment": 0.64, "source": "WSJ", "time": "12h ago"},
        ],
    },
}


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    tickers = list(STOCK_DATA.keys())
    return render_template("index.html", tickers=tickers)


@app.route("/api/analyze/<ticker>")
def analyze(ticker):
    ticker = ticker.upper()
    if ticker not in STOCK_DATA:
        return jsonify({"error": f"Ticker '{ticker}' not found."}), 404
    return jsonify(STOCK_DATA[ticker])


@app.route("/api/tickers")
def tickers():
    result = [
        {"symbol": k, "name": v["name"], "price": v["price"], "change": v["change"]}
        for k, v in STOCK_DATA.items()
    ]
    return jsonify(result)


# ── Run ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True)
