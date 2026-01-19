import requests
import json

url = 'http://127.0.0.1:5000/api/chat'
payload = {
    'message': 'What are common signs of nitrogen deficiency in wheat?',
    'language': 'hi'
}

try:
    # Increase timeout to allow model warm-up / longer inference
    r = requests.post(url, json=payload, timeout=300)
    print('STATUS', r.status_code)
    try:
        print(json.dumps(r.json(), indent=2, ensure_ascii=False))
    except Exception:
        print(r.text)
except Exception as e:
    print('ERROR', str(e))
