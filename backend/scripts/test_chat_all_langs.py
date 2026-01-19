import requests
import json

url = 'http://127.0.0.1:5000/api/chat'
question = 'What are common signs of nitrogen deficiency in wheat?'
languages = ['en','hi','ta','te','bn','mr','gu','kn','ml','pa']

results = []
for lang in languages:
    payload = {'message': question, 'language': lang}
    print('='*60)
    print('Language:', lang)
    try:
        r = requests.post(url, json=payload, timeout=300)
        print('STATUS', r.status_code)
        try:
            data = r.json()
            model = data.get('model')
            resp = data.get('response','')
            print('MODEL', model)
            print('RESPONSE (first 800 chars):')
            print(resp[:800])
            results.append({'language': lang, 'status': r.status_code, 'model': model, 'response': resp})
        except Exception as e:
            print('Failed to parse JSON:', e)
            print(r.text)
            results.append({'language': lang, 'status': r.status_code, 'error': str(e)})
    except Exception as e:
        print('ERROR', str(e))
        results.append({'language': lang, 'error': str(e)})

# Save results
with open('chat_all_langs_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print('\nSaved results to chat_all_langs_results.json')
