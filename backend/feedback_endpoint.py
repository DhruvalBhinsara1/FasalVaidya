# ============================================================================
# FEEDBACK API ENDPOINT
# ============================================================================
# Add this to backend/app.py

@app.route('/api/feedback', methods=['POST'])
@validate_device_id
def submit_feedback():
    """Submit user feedback for a scan result"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'scan_id' not in data or 'rating' not in data:
            return jsonify({
                'error': 'Missing required fields',
                'required': ['scan_id', 'rating']
            }), 400
        
        scan_id = data['scan_id']
        rating = data['rating']
        feedback_text = data.get('feedback_text', '')
        user_id = g.user_id
        
        # Validate rating
        if rating not in ['thumbs_up', 'thumbs_down']:
            return jsonify({
                'error': 'Invalid rating',
                'valid_values': ['thumbs_up', 'thumbs_down']
            }), 400
        
        # Get scan details for AI snapshot
        cursor = get_db().cursor()
        cursor.execute('''
            SELECT d.confidence, d.detected_class
            FROM diagnoses d
            JOIN leaf_scans ls ON d.scan_id = ls.id
            WHERE ls.id = ? AND ls.user_id = ?
        ''', (scan_id, user_id))
        
        scan_data = cursor.fetchone()
        if not scan_data:
            return jsonify({'error': 'Scan not found'}), 404
        
        ai_confidence = scan_data['confidence']
        detected_class = scan_data['detected_class']
        
        # Flag for review if high confidence but negative feedback
        is_flagged = (ai_confidence and ai_confidence > 0.8 and rating == 'thumbs_down')
        
        # Insert feedback
        cursor.execute('''
            INSERT INTO user_feedback (
                user_id, scan_id, rating, ai_confidence, 
                detected_class, feedback_text, is_flagged
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id, scan_id, rating, ai_confidence,
            detected_class, feedback_text, is_flagged
        ))
        
        get_db().commit()
        feedback_id = cursor.lastrowid
        
        logger.info(f"Feedback submitted: {feedback_id} - {rating} for scan {scan_id}")
        
        return jsonify({
            'success': True,
            'feedback_id': feedback_id,
            'message': 'Feedback submitted successfully',
            'is_flagged': is_flagged
        }), 201
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/feedback/<int:scan_id>', methods=['GET'])
@validate_device_id
def get_scan_feedback(scan_id):
    """Get feedback for a specific scan"""
    try:
        user_id = g.user_id
        cursor = get_db().cursor()
        
        cursor.execute('''
            SELECT id, rating, feedback_text, created_at
            FROM user_feedback
            WHERE scan_id = ? AND user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        ''', (scan_id, user_id))
        
        feedback = cursor.fetchone()
        
        if feedback:
            return jsonify({
                'success': True,
                'feedback': {
                    'id': feedback['id'],
                    'rating': feedback['rating'],
                    'feedback_text': feedback['feedback_text'],
                    'created_at': feedback['created_at']
                }
            }), 200
        else:
            return jsonify({
                'success': True,
                'feedback': None
            }), 200
            
    except Exception as e:
        logger.error(f"Error getting feedback: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
