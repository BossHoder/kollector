from fastapi.testclient import TestClient

import main
from main import app


client = TestClient(app)


def test_analyze_allows_null_metadata_with_processed_image(monkeypatch):
    monkeypatch.setattr(main, '_download_image_bytes', lambda url, budget_ms: b'raw-bytes')
    monkeypatch.setattr(main, '_remove_background', lambda image_bytes, budget_ms: b'processed-bytes')
    monkeypatch.setattr(main, '_upload_processed_image', lambda image_bytes, category, budget_ms: 'https://cdn.example.com/processed.png')
    monkeypatch.setattr(main, '_extract_metadata', lambda image_bytes, category, budget_ms: {'brand': None, 'model': None, 'colorway': None})

    response = client.post('/analyze', json={'image_url': 'https://example.com/image.jpg', 'category': 'sneaker'})

    assert response.status_code == 200
    payload = response.json()
    assert payload['processed_image_url'] == 'https://cdn.example.com/processed.png'
    assert payload['brand'] is None
    assert payload['model'] is None
    assert payload['colorway'] is None


def test_analyze_falls_back_to_partial_when_metadata_extraction_errors(monkeypatch):
    monkeypatch.setattr(main, '_download_image_bytes', lambda url, budget_ms: b'raw-bytes')
    monkeypatch.setattr(main, '_remove_background', lambda image_bytes, budget_ms: b'processed-bytes')
    monkeypatch.setattr(main, '_upload_processed_image', lambda image_bytes, category, budget_ms: 'https://cdn.example.com/processed.png')

    def _metadata_error(_image_bytes, _category, _budget_ms):
        raise main.RetryableServiceError('Vision model unavailable')

    monkeypatch.setattr(main, '_extract_metadata', _metadata_error)

    response = client.post('/analyze', json={'image_url': 'https://example.com/image.jpg', 'category': 'sneaker'})

    assert response.status_code == 200
    payload = response.json()
    assert payload['processed_image_url'] == 'https://cdn.example.com/processed.png'
    assert payload['brand'] is None
    assert payload['model'] is None
    assert payload['colorway'] is None
