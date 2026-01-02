"""
FasalVaidya Backend Test Suite
===============================
Run: pytest test_api.py -v
"""

import os
import sys
import json
import pytest
import tempfile
from io import BytesIO
from pathlib import Path
from PIL import Image

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import app, init_db

# Test image generator
def create_test_image(color=(0, 128, 0), size=(224, 224)):
    """Create a test leaf image."""
    img = Image.new('RGB', size, color)
    buffer = BytesIO()
    img.save(buffer, format='JPEG')
    buffer.seek(0)
    return buffer


@pytest.fixture
def client():
    """Create test client."""
    app.config['TESTING'] = True
    
    # Use temporary database
    with tempfile.TemporaryDirectory() as tmpdir:
        app.config['DATABASE'] = os.path.join(tmpdir, 'test.db')
        
        with app.test_client() as client:
            with app.app_context():
                init_db()
            yield client


class TestHealthEndpoint:
    """Test /api/health endpoint."""
    
    def test_health_check(self, client):
        """Test health check returns OK."""
        response = client.get('/api/health')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'ok'
        assert 'FasalVaidya' in data['message']


class TestCropsEndpoint:
    """Test /api/crops endpoint."""
    
    def test_get_crops(self, client):
        """Test listing supported crops."""
        response = client.get('/api/crops')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'crops' in data
        assert len(data['crops']) == 4
        
        # Check crop structure
        crop = data['crops'][0]
        assert 'id' in crop
        assert 'name' in crop
        assert 'name_hi' in crop
        assert 'icon' in crop
    
    def test_crops_include_wheat_rice_tomato_cotton(self, client):
        """Test all 4 crops are present."""
        response = client.get('/api/crops')
        data = response.get_json()
        
        crop_names = [c['name'] for c in data['crops']]
        assert 'Wheat' in crop_names
        assert 'Rice' in crop_names
        assert 'Tomato' in crop_names
        assert 'Cotton' in crop_names


class TestScansEndpoint:
    """Test /api/scans endpoint."""
    
    def test_upload_scan_without_image(self, client):
        """Test upload without image fails."""
        response = client.post('/api/scans')
        assert response.status_code == 400
    
    def test_upload_scan_with_image(self, client):
        """Test successful scan upload."""
        test_image = create_test_image()
        
        response = client.post(
            '/api/scans',
            data={
                'image': (test_image, 'test_leaf.jpg'),
                'crop_id': 1
            },
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 201
        
        data = response.get_json()
        assert 'scan_id' in data
        assert 'n_score' in data
        assert 'p_score' in data
        assert 'k_score' in data
        assert data['crop_id'] == 1
        assert data['crop_name'] == 'Wheat'
    
    def test_upload_scan_with_different_crops(self, client):
        """Test scan for different crop types."""
        for crop_id in [1, 2, 3, 4]:
            test_image = create_test_image()
            
            response = client.post(
                '/api/scans',
                data={
                    'image': (test_image, f'test_crop_{crop_id}.jpg'),
                    'crop_id': crop_id
                },
                content_type='multipart/form-data'
            )
            
            assert response.status_code == 201
            data = response.get_json()
            assert data['crop_id'] == crop_id
    
    def test_get_scans_empty(self, client):
        """Test getting scans when empty."""
        response = client.get('/api/scans')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'scans' in data
        assert len(data['scans']) == 0
    
    def test_get_scans_after_upload(self, client):
        """Test getting scans after uploading."""
        # Upload a scan
        test_image = create_test_image()
        client.post(
            '/api/scans',
            data={
                'image': (test_image, 'test.jpg'),
                'crop_id': 1
            },
            content_type='multipart/form-data'
        )
        
        # Get scans
        response = client.get('/api/scans')
        assert response.status_code == 200
        
        data = response.get_json()
        assert len(data['scans']) == 1
        
        scan = data['scans'][0]
        assert 'scan_id' in scan
        assert 'crop_name' in scan
        assert 'overall_status' in scan
    
    def test_get_single_scan(self, client):
        """Test getting single scan details."""
        # Upload a scan
        test_image = create_test_image()
        upload_response = client.post(
            '/api/scans',
            data={
                'image': (test_image, 'test.jpg'),
                'crop_id': 2
            },
            content_type='multipart/form-data'
        )
        
        scan_id = upload_response.get_json()['scan_id']
        
        # Get single scan
        response = client.get(f'/api/scans/{scan_id}')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['scan_id'] == scan_id
        assert data['crop_id'] == 2
        assert 'recommendations' in data
    
    def test_clear_scans(self, client):
        """Test clearing all scans."""
        # Upload some scans
        for _ in range(3):
            test_image = create_test_image()
            client.post(
                '/api/scans',
                data={
                    'image': (test_image, 'test.jpg'),
                    'crop_id': 1
                },
                content_type='multipart/form-data'
            )
        
        # Clear all
        response = client.delete('/api/scans')
        assert response.status_code == 200
        
        # Verify empty
        response = client.get('/api/scans')
        data = response.get_json()
        assert len(data['scans']) == 0


class TestDiagnosisScores:
    """Test NPK diagnosis scoring."""
    
    def test_scores_in_valid_range(self, client):
        """Test NPK scores are in valid range (0-100)."""
        test_image = create_test_image()
        
        response = client.post(
            '/api/scans',
            data={
                'image': (test_image, 'test.jpg'),
                'crop_id': 1
            },
            content_type='multipart/form-data'
        )
        
        data = response.get_json()
        
        assert 0 <= data['n_score'] <= 100
        assert 0 <= data['p_score'] <= 100
        assert 0 <= data['k_score'] <= 100
    
    def test_severity_levels(self, client):
        """Test severity levels are valid."""
        test_image = create_test_image()
        
        response = client.post(
            '/api/scans',
            data={
                'image': (test_image, 'test.jpg'),
                'crop_id': 1
            },
            content_type='multipart/form-data'
        )
        
        data = response.get_json()
        
        valid_severities = ['healthy', 'attention', 'critical']
        assert data['n_severity'] in valid_severities
        assert data['p_severity'] in valid_severities
        assert data['k_severity'] in valid_severities
        assert data['overall_status'] in valid_severities
    
    def test_confidence_scores(self, client):
        """Test confidence scores are present and valid."""
        test_image = create_test_image()
        
        response = client.post(
            '/api/scans',
            data={
                'image': (test_image, 'test.jpg'),
                'crop_id': 1
            },
            content_type='multipart/form-data'
        )
        
        data = response.get_json()
        
        assert 0 <= data['n_confidence'] <= 100
        assert 0 <= data['p_confidence'] <= 100
        assert 0 <= data['k_confidence'] <= 100


class TestRecommendations:
    """Test fertilizer recommendations."""
    
    def test_recommendations_structure(self, client):
        """Test recommendations have correct structure."""
        test_image = create_test_image()
        
        response = client.post(
            '/api/scans',
            data={
                'image': (test_image, 'test.jpg'),
                'crop_id': 1
            },
            content_type='multipart/form-data'
        )
        
        data = response.get_json()
        
        assert 'recommendations' in data
        assert 'n' in data['recommendations']
        assert 'p' in data['recommendations']
        assert 'k' in data['recommendations']
    
    def test_recommendations_bilingual(self, client):
        """Test recommendations include both English and Hindi."""
        # Create image that likely triggers a deficiency
        test_image = create_test_image(color=(200, 200, 100))  # Yellowish
        
        response = client.post(
            '/api/scans',
            data={
                'image': (test_image, 'test.jpg'),
                'crop_id': 1
            },
            content_type='multipart/form-data'
        )
        
        data = response.get_json()
        
        for nutrient in ['n', 'p', 'k']:
            rec = data['recommendations'][nutrient]
            assert 'en' in rec
            assert 'hi' in rec


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
