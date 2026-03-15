from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_analyze_rejects_missing_image_url():
    response = client.post('/analyze', json={'category': 'sneaker'})

    assert response.status_code == 422


def test_analyze_rejects_missing_category():
    response = client.post('/analyze', json={'image_url': 'https://example.com/img.png'})

    assert response.status_code == 422


def test_analyze_rejects_invalid_image_url_scheme():
    response = client.post('/analyze', json={'image_url': 'not-a-url', 'category': 'sneaker'})

    assert response.status_code == 422


def test_analyze_rejects_blank_category_as_invalid_request():
    response = client.post('/analyze', json={'image_url': 'https://example.com/img.png', 'category': '   '})

    assert response.status_code == 400
    assert response.json()['error']['code'] == 'invalid_request'
