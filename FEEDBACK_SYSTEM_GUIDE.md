# Feedback System Implementation Guide

## Overview

The feedback system allows users to rate the accuracy of ML diagnosis results with thumbs up/down feedback. This data is collected for future ML model improvement through reward/punishment mechanisms.

## Architecture

### 1. Database Schema

The feedback system works with both **local SQLite** (backend) and **Supabase PostgreSQL** (admin dashboard).

#### Local SQLite (Backend)

The `user_feedback` table in local SQLite:

```sql
CREATE TABLE user_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  scan_id INTEGER NOT NULL,
  rating TEXT CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  ai_confidence REAL,
  detected_class TEXT,
  feedback_text TEXT,
  is_flagged BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES leaf_scans(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_user_feedback_scan_id ON user_feedback(scan_id);
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_rating ON user_feedback(rating);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at);
```

#### Supabase PostgreSQL (Admin Dashboard)

The `user_feedback` table in Supabase:

```sql
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  scan_id UUID REFERENCES leaf_scans(id),
  rating TEXT CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  ai_confidence DECIMAL(5,2),
  detected_class TEXT,
  feedback_text TEXT,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_feedback_scan_id ON user_feedback(scan_id);
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_rating ON user_feedback(rating);
CREATE INDEX idx_user_feedback_flagged ON user_feedback(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at);
```

**Key Fields:**
- `rating`: User feedback (thumbs_up or thumbs_down)
- `ai_confidence`: Snapshot of AI confidence at feedback time
- `detected_class`: Snapshot of detected class at feedback time
- `is_flagged`: Auto-flagged if high confidence (>0.8) but negative feedback
- `feedback_text`: Optional text feedback (future enhancement)

### 2. Backend API Endpoints

#### Submit Feedback
```
POST /api/feedback
```

**Request Body:**
```json
{
  "scan_id": 123,
  "rating": "thumbs_up",
  "feedback_text": "optional text"
}
```

**Response:**
```json
{
  "success": true,
  "feedback_id": 456,
  "is_flagged": false,
  "message": "Feedback submitted successfully"
}
```

**Auto-Flagging Logic:**
- If AI confidence > 0.8 AND rating = thumbs_down → is_flagged = TRUE
- This identifies high-confidence misclassifications for review

#### Get Feedback
```
GET /api/feedback/<scan_id>
```

**Response:**
```json
{
  "success": true,
  "feedback": {
    "rating": "thumbs_up",
    "feedback_text": null,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Implementation Location:** `backend/app.py` (lines 2263-2380)

### 3. Mobile App Integration

#### API Service (`frontend/src/api/feedback.ts`)

```typescript
export interface FeedbackData {
  scan_id: number;
  rating: 'thumbs_up' | 'thumbs_down';
  feedback_text?: string;
}

export interface FeedbackResponse {
  success: boolean;
  feedback_id?: number;
  message?: string;
  is_flagged?: boolean;
  feedback?: {
    rating: string;
    feedback_text: string | null;
    created_at: string;
  } | null;
}

// Submit feedback
export async function submitFeedback(data: FeedbackData): Promise<FeedbackResponse>

// Get existing feedback
export async function getScanFeedback(scanId: number): Promise<FeedbackResponse>
```

#### Results Screen UI (`frontend/src/screens/ResultsScreen.tsx`)

**Features:**
- Loads existing feedback on mount
- Displays thumbs up/down buttons
- Shows "Was this diagnosis accurate?" prompt
- Disabled after submission to prevent duplicates
- Shows thank you message after submission
- Error handling with user-friendly messages
- Bilingual support (English/Hindi)

**UI Components:**
```tsx
{/* Feedback Section */}
<Card style={styles.feedbackCard}>
  <View style={styles.feedbackContent}>
    <Text style={styles.feedbackTitle}>
      {isHindi ? 'क्या यह निदान सटीक था?' : 'Was this diagnosis accurate?'}
    </Text>
    <View style={styles.feedbackButtons}>
      {/* Thumbs Up Button */}
      <TouchableOpacity
        style={[
          styles.feedbackButton,
          feedbackRating === 'thumbs_up' && styles.feedbackButtonActive,
        ]}
        onPress={() => handleFeedback('thumbs_up')}
        disabled={feedbackSubmitting || feedbackRating !== null}
      >
        <Ionicons name="thumbs-up" size={24} />
        <Text>{isHindi ? 'हाँ' : 'Yes'}</Text>
      </TouchableOpacity>
      
      {/* Thumbs Down Button */}
      <TouchableOpacity ... />
    </View>
  </View>
</Card>
```

### 4. Admin Dashboard Integration

#### Scans Page (`AdminDashboard/frontend/src/app/dashboard/scans/page.tsx`)

**Architecture Note**: The admin dashboard fetches feedback data from the **Flask backend API** (which uses SQLite), not directly from Supabase. This is because:
- Mobile app → Flask backend → SQLite (local storage)
- Admin dashboard → Flask backend → SQLite (via API)
- This ensures data consistency across all components

**API Endpoints Used**:
- `GET /api/feedback/all` - Get all feedback grouped by scan (most recent per scan)
- `GET /api/feedback/stats` - Get feedback statistics (thumbs up/down/flagged counts)

**Features:**
1. **Feedback Stats Cards:**
   - Positive Feedback (👍 count)
   - Negative Feedback (👎 count)
   - Flagged for Review (⚠ count)

2. **Per-Scan Feedback Badge:**
   - Green badge for thumbs_up
   - Red badge for thumbs_down
   - Yellow ring if flagged for review
   - Displays warning icon (⚠) for flagged items

**Implementation:**
```tsx
{/* Feedback Badge */}
{scan.feedback && (
  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${
    scan.feedback.rating === 'thumbs_up' 
      ? 'bg-green-100 text-green-700' 
      : 'bg-red-100 text-red-700'
  } ${scan.feedback.is_flagged ? 'ring-2 ring-yellow-400' : ''}`}>
    <span>{scan.feedback.rating === 'thumbs_up' ? '👍' : '👎'}</span>
    <span>User Feedback</span>
    {scan.feedback.is_flagged && (
      <span className="text-yellow-600" title="Flagged for review">⚠</span>
    )}
  </div>
)}
```

## User Flow

### Mobile App Flow

1. **User completes scan** → Results displayed
2. **Feedback prompt shown**: "Was this diagnosis accurate?"
3. **User taps thumbs up/down**
   - Button becomes active/highlighted
   - Other button remains disabled
   - "Thank you for your feedback!" message shown
4. **Feedback persists** on subsequent views of same scan

### Admin Dashboard Flow

1. **Admin opens Scans page**
2. **Stats overview shows**:
   - Total positive feedback
   - Total negative feedback
   - Flagged items count
3. **Each scan card shows**:
   - Feedback badge if exists
   - Warning icon if flagged
4. **Admin can identify**:
   - User satisfaction levels
   - Potential misclassifications
   - Model accuracy issues

## Future ML Integration

### Reward/Punishment Mechanism

The feedback data can be used to improve the ML model:

#### 1. **Accuracy Tracking**
```python
# Calculate model accuracy from user feedback
accuracy = thumbs_up_count / (thumbs_up_count + thumbs_down_count)
```

#### 2. **Misclassification Identification**
```python
# Query flagged feedback (high confidence but wrong)
flagged_scans = db.query("""
  SELECT * FROM user_feedback
  WHERE is_flagged = TRUE
  AND ai_confidence > 0.8
  AND rating = 'thumbs_down'
""")

# These are high-priority cases for model retraining
```

#### 3. **Retraining Dataset**
```python
# Build training dataset from feedback
positive_samples = scans with thumbs_up (reinforce correct behavior)
negative_samples = scans with thumbs_down + is_flagged (correct misclassifications)

# Use in next training cycle with appropriate weighting
```

#### 4. **Confidence Calibration**
```python
# Adjust confidence thresholds based on feedback
if high_confidence_but_wrong_frequently:
    reduce_confidence_threshold()
    add_uncertainty_margin()
```

## Testing Checklist

- [ ] **Backend:**
  - [ ] POST /api/feedback creates record
  - [ ] GET /api/feedback/<scan_id> returns feedback
  - [ ] Auto-flagging works for high confidence + negative feedback
  - [ ] Duplicate submissions handled correctly

- [ ] **Mobile App:**
  - [ ] Feedback buttons displayed on Results screen
  - [ ] Thumbs up submission works
  - [ ] Thumbs down submission works
  - [ ] Existing feedback loads on mount
  - [ ] Buttons disabled after submission
  - [ ] Thank you message shows
  - [ ] Error handling works
  - [ ] Hindi translation correct

- [ ] **Admin Dashboard:**
  - [ ] Feedback stats cards display correct counts
  - [ ] Scan cards show feedback badges
  - [ ] Flagged items show warning icon
  - [ ] Badge colors correct (green/red)
  - [ ] Ring indicator for flagged items

- [ ] **Database:**
  - [ ] user_feedback table accessible
  - [ ] RLS policies work correctly
  - [ ] Indexes improve query performance
  - [ ] Foreign keys enforce referential integrity

## Files Modified

### Backend
- `backend/app.py` - Added feedback endpoints

### Mobile App
- `frontend/src/api/feedback.ts` - NEW feedback API service
- `frontend/src/api/index.ts` - Export feedback module
- `frontend/src/screens/ResultsScreen.tsx` - Added feedback UI

### Admin Dashboard
- `AdminDashboard/frontend/src/app/dashboard/scans/page.tsx` - Added feedback display

### Database
- `supabase_schema/04_admin_schema.sql` - user_feedback table (pre-existing)

## Metrics & Analytics

### Key Metrics to Track

1. **Overall Satisfaction Rate**
   ```
   satisfaction_rate = thumbs_up / (thumbs_up + thumbs_down) * 100
   ```

2. **Model Accuracy by Crop Type**
   ```sql
   SELECT 
     crops.name,
     COUNT(*) FILTER (WHERE rating = 'thumbs_up') as positive,
     COUNT(*) FILTER (WHERE rating = 'thumbs_down') as negative,
     ROUND(COUNT(*) FILTER (WHERE rating = 'thumbs_up')::numeric / 
           COUNT(*)::numeric * 100, 2) as accuracy_pct
   FROM user_feedback
   JOIN leaf_scans ON user_feedback.scan_id = leaf_scans.id
   JOIN crops ON leaf_scans.crop_id = crops.id
   GROUP BY crops.name;
   ```

3. **Flagged Cases Analysis**
   ```sql
   SELECT 
     detected_class,
     ai_confidence,
     COUNT(*) as flagged_count
   FROM user_feedback
   WHERE is_flagged = TRUE
   GROUP BY detected_class, ai_confidence
   ORDER BY flagged_count DESC;
   ```

## Maintenance & Monitoring

### Regular Tasks

1. **Weekly Review**: Check flagged items count
2. **Monthly Analysis**: Calculate model accuracy trends
3. **Quarterly Retraining**: Use feedback data to retrain model
4. **Data Cleanup**: Archive old feedback (>1 year) if needed

### Alerts

- **High Negative Feedback Rate**: Alert if thumbs_down > 30% in 24h
- **Flagged Item Spike**: Alert if flagged count increases >50% week-over-week
- **Low Feedback Rate**: Alert if <10% of scans receive feedback

## API Rate Limiting

Consider implementing rate limiting to prevent abuse:

```python
# Example: Max 1 feedback per scan per user
@app.route('/api/feedback', methods=['POST'])
@validate_device_id
def submit_feedback():
    existing = db.query("""
        SELECT id FROM user_feedback
        WHERE scan_id = ? AND user_id = ?
    """, [scan_id, user_id])
    
    if existing:
        return {"error": "Feedback already submitted"}, 400
```

## Security Considerations

1. **Authentication**: All endpoints use `@validate_device_id` decorator
2. **Authorization**: RLS policies ensure users can only view/modify their feedback
3. **Input Validation**: Rating must be 'thumbs_up' or 'thumbs_down'
4. **SQL Injection**: Use parameterized queries
5. **XSS Prevention**: Sanitize feedback_text if displayed

## Troubleshooting

### Common Issues

**Issue**: Feedback not saving
- Check device authentication
- Verify scan_id exists
- Check database connection
- Review backend logs

**Issue**: Feedback not loading in mobile app
- Check API endpoint URL
- Verify network connectivity
- Check console logs for errors
- Ensure scan_id is correct

**Issue**: Admin dashboard not showing feedback
- Verify Supabase query permissions
- Check RLS policies
- Ensure feedback data exists
- Review browser console

**Issue**: Auto-flagging not working
- Verify ai_confidence value captured
- Check flagging logic (confidence > 0.8)
- Review database trigger (if any)

## Next Steps

1. **Test end-to-end flow** with real devices
2. **Add optional text feedback** field
3. **Create admin page** for reviewing flagged items
4. **Implement ML retraining pipeline** using feedback data
5. **Add analytics dashboard** showing feedback trends
6. **Set up monitoring alerts** for feedback metrics
7. **A/B test different feedback prompts** to increase response rate

## Contact & Support

For issues or questions:
- Check backend logs: `backend/logs/`
- Review mobile app console
- Check Supabase dashboard for data
- Reference this guide for troubleshooting steps
