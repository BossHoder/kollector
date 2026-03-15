from fastapi.testclient import TestClient

import main
from main import app


client = TestClient(app)


def test_analyze_happy_path_returns_processed_url_and_metadata(monkeypatch):
    monkeypatch.setattr(main, '_download_image_bytes', lambda url, budget_ms: b'raw-bytes')
    monkeypatch.setattr(main, '_remove_background', lambda image_bytes, budget_ms: b'processed-bytes')
    monkeypatch.setattr(main, '_upload_processed_image', lambda image_bytes, category, budget_ms: 'https://cdn.example.com/processed.png')
    monkeypatch.setattr(
        main,
        '_extract_metadata',
        lambda image_bytes, category, budget_ms: {
            'brand': {'value': 'Nike', 'confidence': 0.95},
            'model': {'value': 'Air Jordan 1', 'confidence': 0.9},
            'colorway': {'value': 'Chicago', 'confidence': 0.85},
        },
    )

    response = client.post('/analyze', json={'image_url': 'https://example.com/image.jpg', 'category': 'sneaker'})

    assert response.status_code == 200
    payload = response.json()
    assert payload['processed_image_url'] == 'https://cdn.example.com/processed.png'
    assert payload['processedImageUrl'] == 'https://cdn.example.com/processed.png'
    assert payload['brand']['value'] == 'Nike'
