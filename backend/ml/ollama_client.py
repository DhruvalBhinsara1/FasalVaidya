"""
Ollama Vision AI Client for FasalVaidya
=======================================
Provides AI-powered crop analysis using Ollama with vision models.
Supports image analysis for leaf deficiency detection insights.
"""

import os
import base64
import logging
import requests
from typing import Optional, List, Dict, Any
from pathlib import Path

logger = logging.getLogger('fasalvaidya.ollama')

# Configuration
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llava:7b')  # Vision-capable model
OLLAMA_TIMEOUT = int(os.getenv('OLLAMA_TIMEOUT', '120'))  # Longer timeout for vision

# System prompt for agricultural expert
SYSTEM_PROMPT = """You are FasalVaidya AI, an expert agricultural assistant specializing in crop nutrient deficiency analysis for Indian farmers. You communicate in a friendly, helpful manner in simple language.

Your expertise includes:
- NPK (Nitrogen, Phosphorus, Potassium) deficiency identification in crops
- Magnesium and micronutrient deficiency detection
- Organic and chemical fertilizer recommendations
- Sustainable farming practices suitable for Indian agriculture
- Regional crop-specific advice (wheat, rice, maize, tomato, banana, etc.)

When analyzing images:
- Describe visible symptoms (yellowing, browning, spots, wilting)
- Identify likely nutrient deficiencies based on visual patterns
- Provide confidence level in your assessment
- Suggest immediate remedial actions

When providing recommendations:
- Consider local availability of fertilizers in India
- Include both organic (compost, vermicompost, neem) and chemical options
- Mention application timing and dosage
- Warn about over-fertilization risks

Keep responses concise but informative. Use simple terms farmers can understand.
If asked in Hindi, respond in Hindi. Default to English."""

CONTEXT_TEMPLATE = """
=== Current Crop Context ===
Crop: {crop_name}
Recent Scan Results:
- Nitrogen (N): {n_score}% health ({n_severity})
- Phosphorus (P): {p_score}% health ({p_severity})
- Potassium (K): {k_score}% health ({k_severity})
- Overall Status: {overall_status}
- Detected Condition: {detected_class}

{history_summary}
===========================
"""


def check_ollama_available() -> Dict[str, Any]:
    """
    Check if Ollama server is available and which models are installed.
    
    Returns:
        dict with 'available' (bool), 'models' (list), 'error' (str if any)
    """
    try:
        response = requests.get(
            f"{OLLAMA_BASE_URL}/api/tags",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            models = [m.get('name', '') for m in data.get('models', [])]
            has_vision_model = any(
                model.startswith(('llava', 'bakllava', 'moondream', 'llama3.2-vision'))
                for model in models
            )
            return {
                'available': True,
                'models': models,
                'has_vision_model': has_vision_model,
                'recommended_model': OLLAMA_MODEL
            }
        else:
            return {
                'available': False,
                'error': f'Ollama returned status {response.status_code}'
            }
    except requests.exceptions.ConnectionError:
        return {
            'available': False,
            'error': 'Cannot connect to Ollama server. Please ensure Ollama is running.'
        }
    except requests.exceptions.Timeout:
        return {
            'available': False,
            'error': 'Connection to Ollama timed out.'
        }
    except Exception as e:
        logger.exception("ollama_check_failed")
        return {
            'available': False,
            'error': str(e)
        }


def build_context_message(scan_data: Optional[Dict] = None, history: Optional[List[Dict]] = None) -> str:
    """
    Build context string from scan data and history.
    
    Args:
        scan_data: Current/latest scan result
        history: List of recent scan history items
        
    Returns:
        Formatted context string
    """
    if not scan_data:
        return ""
    
    # Build history summary
    history_summary = ""
    if history and len(history) > 1:
        history_summary = f"Previous {len(history)-1} scans show similar patterns."
    
    return CONTEXT_TEMPLATE.format(
        crop_name=scan_data.get('crop_name', 'Unknown'),
        n_score=scan_data.get('n_score', 'N/A'),
        p_score=scan_data.get('p_score', 'N/A'),
        k_score=scan_data.get('k_score', 'N/A'),
        n_severity=scan_data.get('n_severity', 'unknown'),
        p_severity=scan_data.get('p_severity', 'unknown'),
        k_severity=scan_data.get('k_severity', 'unknown'),
        overall_status=scan_data.get('overall_status', 'unknown'),
        detected_class=scan_data.get('detected_class', 'Not analyzed'),
        history_summary=history_summary
    )


def encode_image_to_base64(image_path: str) -> Optional[str]:
    """
    Encode an image file to base64 for Ollama vision models.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Base64 encoded string or None if failed
    """
    try:
        path = Path(image_path)
        if not path.exists():
            logger.warning("image_not_found path=%s", image_path)
            return None
            
        with open(path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except Exception as e:
        logger.exception("image_encode_failed path=%s", image_path)
        return None


def chat_with_ollama(
    message: str,
    chat_history: Optional[List[Dict[str, str]]] = None,
    context: Optional[Dict] = None,
    image_base64: Optional[str] = None,
    model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send a chat message to Ollama and get a response.
    
    Args:
        message: User's message
        chat_history: List of previous messages [{'role': 'user'/'assistant', 'content': '...'}]
        context: Scan data context to include
        image_base64: Base64 encoded image for vision analysis
        model: Model to use (defaults to OLLAMA_MODEL)
        
    Returns:
        dict with 'success', 'response', 'error' (if any)
    """
    model = model or OLLAMA_MODEL
    
    # Check availability first
    status = check_ollama_available()
    if not status['available']:
        return {
            'success': False,
            'error': status.get('error', 'Ollama is not available'),
            'needs_connection': True
        }
    
    try:
        # Build messages array
        messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
        
        # Add context if available
        if context:
            context_msg = build_context_message(context)
            if context_msg:
                messages.append({
                    'role': 'system',
                    'content': f"Current analysis context:\n{context_msg}"
                })
        
        # Add chat history
        if chat_history:
            for msg in chat_history[-10:]:  # Keep last 10 messages for context
                messages.append({
                    'role': msg.get('role', 'user'),
                    'content': msg.get('content', '')
                })
        
        # Add current message with optional image
        current_message = {'role': 'user', 'content': message}
        if image_base64:
            current_message['images'] = [image_base64]
        messages.append(current_message)
        
        # Call Ollama API
        logger.info("ollama_chat_request model=%s messages=%d has_image=%s", 
                    model, len(messages), bool(image_base64))
        
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                'model': model,
                'messages': messages,
                'stream': False,
                'options': {
                    'temperature': 0.7,
                    'num_predict': 1024,
                }
            },
            timeout=OLLAMA_TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            assistant_message = data.get('message', {}).get('content', '')
            
            logger.info("ollama_chat_success model=%s response_length=%d", 
                       model, len(assistant_message))
            
            return {
                'success': True,
                'response': assistant_message,
                'model': model,
                'total_duration': data.get('total_duration'),
                'eval_count': data.get('eval_count')
            }
        else:
            error_msg = f"Ollama returned status {response.status_code}"
            try:
                error_data = response.json()
                error_msg = error_data.get('error', error_msg)
            except:
                pass
            
            logger.warning("ollama_chat_failed status=%d error=%s", 
                          response.status_code, error_msg)
            
            return {
                'success': False,
                'error': error_msg
            }
            
    except requests.exceptions.Timeout:
        logger.warning("ollama_chat_timeout model=%s", model)
        return {
            'success': False,
            'error': 'Request timed out. The AI is taking too long to respond.',
            'needs_connection': True
        }
    except requests.exceptions.ConnectionError:
        logger.warning("ollama_connection_failed")
        return {
            'success': False,
            'error': 'Cannot connect to AI server.',
            'needs_connection': True
        }
    except Exception as e:
        logger.exception("ollama_chat_error")
        return {
            'success': False,
            'error': str(e)
        }


def analyze_leaf_image(
    image_path: str,
    crop_name: str = "Unknown",
    additional_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze a leaf image using Ollama vision model.
    
    Args:
        image_path: Path to the leaf image
        crop_name: Name of the crop for context
        additional_context: Any additional context to include
        
    Returns:
        dict with analysis results
    """
    # Encode image
    image_base64 = encode_image_to_base64(image_path)
    if not image_base64:
        return {
            'success': False,
            'error': 'Failed to load image'
        }
    
    # Build analysis prompt
    prompt = f"""Analyze this {crop_name} leaf image for nutrient deficiencies.

Please identify:
1. Visible symptoms (color changes, spots, wilting, etc.)
2. Likely nutrient deficiency (N, P, K, Mg, or other)
3. Confidence level (low/medium/high)
4. Recommended actions

{additional_context or ''}"""
    
    return chat_with_ollama(
        message=prompt,
        image_base64=image_base64
    )


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("Checking Ollama availability...")
    status = check_ollama_available()
    print(f"Status: {status}")
    
    if status['available']:
        print("\nTesting chat...")
        result = chat_with_ollama(
            message="What are the common signs of nitrogen deficiency in wheat?",
            context={'crop_name': 'Wheat', 'n_score': 25, 'n_severity': 'critical'}
        )
        print(f"Result: {result}")
