from fastapi.testclient import TestClient

import main
from main import app


client = TestClient(app)


def test_analyze_unsupported_image_returns_422(monkeypatch):
    def _bad_download(_url, _budget_ms):
        raise main.UnprocessableImageError('Định dạng ảnh không được hỗ trợ')

    monkeypatch.setattr(main, '_download_image_bytes', _bad_download)

    response = client.post('/analyze', json={'image_url': 'https://example.com/image.txt', 'category': 'sneaker'})

    assert response.status_code == 422
    body = response.json()
    assert body['error']['message'] == 'Định dạng ảnh không được hỗ trợ'


def test_analyze_retryable_failure_returns_500(monkeypatch):
    def _fails(_url, _budget_ms):
        raise main.RetryableServiceError('Tải ảnh xuống thất bại tạm thời')

    monkeypatch.setattr(main, '_download_image_bytes', _fails)

    response = client.post('/analyze', json={'image_url': 'https://example.com/image.jpg', 'category': 'sneaker'})

    assert response.status_code == 500
    body = response.json()
    assert body['error']['message'] == 'Tải ảnh xuống thất bại tạm thời'
    assert body['error']['code'] == 'retryable_error'


def test_analyze_requires_cloudinary_configuration(monkeypatch):
    monkeypatch.setenv('STORAGE_DRIVER', 'cloudinary')
    monkeypatch.delenv('CLOUDINARY_CLOUD_NAME', raising=False)
    monkeypatch.delenv('CLOUDINARY_API_KEY', raising=False)
    monkeypatch.delenv('CLOUDINARY_API_SECRET', raising=False)
    monkeypatch.setattr(main, '_download_image_bytes', lambda _url, _budget_ms: b'raw-bytes')
    monkeypatch.setattr(main, '_remove_background', lambda _image_bytes, _budget_ms: b'processed-bytes')

    response = client.post('/analyze', json={'image_url': 'https://example.com/image.jpg', 'category': 'sneaker'})

    assert response.status_code == 500
    body = response.json()
    assert body['error']['message'] == 'Thông tin xác thực Cloudinary chưa được cấu hình'
    assert body['error']['code'] == 'retryable_error'
