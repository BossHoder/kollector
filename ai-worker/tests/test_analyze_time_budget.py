from fastapi.testclient import TestClient

import main
from main import app


client = TestClient(app)


def test_analyze_download_stage_over_budget_returns_retryable_500(monkeypatch):
    monkeypatch.setattr(main, 'TOTAL_BUDGET_MS', 5)

    def _download(_url, _budget_ms):
        return b'bytes'

    def _remove(_image_bytes, _budget_ms):
        raise main.BudgetExceededError('Inference budget exceeded')

    monkeypatch.setattr(main, '_download_image_bytes', _download)
    monkeypatch.setattr(main, '_remove_background', _remove)

    response = client.post('/analyze', json={'image_url': 'https://example.com/image.jpg', 'category': 'sneaker'})

    assert response.status_code == 500
    body = response.json()
    assert body['error']['code'] == 'retryable_error'


def test_analyze_upload_budget_enforced(monkeypatch):
    monkeypatch.setattr(main, '_download_image_bytes', lambda _url, _budget_ms: b'bytes')
    monkeypatch.setattr(main, '_remove_background', lambda _image_bytes, _budget_ms: b'processed')

    def _upload(_image_bytes, _category, _budget_ms):
        raise main.BudgetExceededError('Upload budget exceeded')

    monkeypatch.setattr(main, '_upload_processed_image', _upload)

    response = client.post('/analyze', json={'image_url': 'https://example.com/image.jpg', 'category': 'sneaker'})

    assert response.status_code == 500
    assert response.json()['error']['message'] == 'Upload budget exceeded'
