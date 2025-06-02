from flask import Flask, request, jsonify
from flask_cors import CORS
from pythainlp.tokenize import sent_tokenize, word_tokenize

app = Flask(__name__)
CORS(app)  # Разрешаем все домены (для локальной разработки)

@app.route("/segment", methods=["POST"])
def segment_thai():
    """
    Ожидает JSON: { "text": "<тайский текст>" }
    Возвращает JSON: { "sentences": [...], "words": [[...], [...], ...] }
     - sentences: список строк, каждая — отдельное предложение (по PyThaiNLP)
     - words: список списков, соответствующих sentences[i], где word_tokenize сегментирует i-е предложение
    """
    data = request.json
    text = data.get("text", "")
    # Разбиваем на предложения:
    sents = sent_tokenize(text)  # PyThaiNLP будет стараться разделить по тайским правилам
    # Для каждого предложения делаем word_tokenize
    words_per_sent = [word_tokenize(s) for s in sents]
    return jsonify({
        "sentences": sents,
        "words": words_per_sent
    })

if __name__ == "__main__":
    # Запуск: python app.py
    # По умолчанию слушает на http://localhost:5005
    app.run(host="0.0.0.0", port=5005)
