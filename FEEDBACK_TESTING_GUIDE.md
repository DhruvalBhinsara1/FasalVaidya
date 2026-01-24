# Feedback System - Quick Testing Guide

## Prerequisites
- Backend running on Flask (`python app.py`)
- Mobile app running on Expo (`npx expo start`)
- AdminDashboard running (`npm run dev`)
- Supabase connection established

## Testing Steps

### 1. Backend API Testing

#### Test Feedback Submission
```bash
# Windows PowerShell
$deviceId = "test-device-123"
$scanId = 1  # Replace with actual scan ID

# Submit thumbs up
curl -X POST http://localhost:5000/api/feedback `
  -H "Content-Type: application/json" `
  -H "X-User-ID: $deviceId" `
  -d "{\"scan_id\": $scanId, \"rating\": \"thumbs_up\"}"

# Expected response:
# {
#   "success": true,
#   "feedback_id": 123,
#   "is_flagged": false,
#   "message": "Feedback submitted successfully"
# }
```

#### Test Feedback Retrieval
```bash
curl http://localhost:5000/api/feedback/$scanId `
  -H "X-User-ID: $deviceId"

# Expected response:
# {
#   "success": true,
#   "feedback": {
#     "rating": "thumbs_up",
#     "feedback_text": null,
#     "created_at": "2024-01-15T10:30:00Z"
#   }
# }
```

### 2. Mobile App Testing

#### Test Feedback UI
1. **Open Results Screen**
   - Perform a scan or navigate to existing result
   - Scroll to bottom of screen

2. **Verify Feedback Section Appears**
   - Should see: "Was this diagnosis accurate?" (or Hindi equivalent)
   - Two buttons: 👍 Yes and 👎 No

3. **Test Thumbs Up**
   - Tap "Yes" button
   - Button should highlight in green
   - "No" button should become disabled
   - Should see: "Thank you for your feedback!"

4. **Test Feedback Persistence**
   - Exit Results screen
   - Return to same scan result
   - Feedback state should be restored (button still highlighted)

5. **Test Thumbs Down**
   - Use different scan
   - Tap "No" button
   - Button should highlight in red
   - "Yes" button should become disabled

6. **Test Error Handling**
   - Disconnect from network
   - Try to submit feedback
   - Should see error message

### 3. Admin Dashboard Testing

#### Test Feedback Display
1. **Open Admin Dashboard**
   - Navigate to: http://localhost:3000/dashboard/scans

2. **Verify Feedback Stats Cards**
   - Should see 3 new cards:
     - Positive Feedback (👍 count)
     - Negative Feedback (👎 count)  
     - Flagged for Review (⚠ count)

3. **Verify Scan Card Badges**
   - Scans with feedback show badge
   - Green badge for thumbs_up
   - Red badge for thumbs_down
   - Yellow ring if flagged
   - Warning icon (⚠) for flagged items

4. **Test Auto-Flagging**
   - Find scan with high AI confidence (>80%)
   - Submit thumbs_down via mobile
   - Refresh admin dashboard
   - Should show yellow flag on that scan

### 4. Database Verification

#### Check Supabase Data
1. **Open Supabase Dashboard**
   - Go to Table Editor
   - Select `user_feedback` table

2. **Verify Record Created**
   ```sql
   SELECT * FROM user_feedback 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **Check Flagged Records**
   ```sql
   SELECT 
     scan_id,
     rating,
     ai_confidence,
     detected_class,
     is_flagged,
     created_at
   FROM user_feedback
   WHERE is_flagged = TRUE
   ORDER BY created_at DESC;
   ```

### 5. End-to-End Flow

#### Complete User Journey
1. **Mobile: Perform Scan**
   - Take photo of crop leaf
   - Wait for diagnosis

2. **Mobile: Submit Feedback**
   - On Results screen, scroll down
   - Tap thumbs up or down
   - Verify thank you message

3. **Admin: Verify Feedback**
   - Open Admin Dashboard
   - Find the scan in list
   - Verify feedback badge appears
   - Check stats cards updated

4. **Database: Confirm Storage**
   - Query user_feedback table
   - Verify record exists with correct:
     - scan_id
     - user_id
     - rating
     - ai_confidence (captured at submission time)
     - is_flagged (if applicable)

## Common Issues & Solutions

### Issue: Feedback not saving
**Check:**
- Backend logs for errors
- Network connectivity
- Device ID authentication
- scan_id validity

**Solution:**
```bash
# Check backend logs
tail -f backend/logs/app.log

# Verify scan exists
SELECT * FROM leaf_scans WHERE id = <scan_id>;
```

### Issue: Feedback not appearing in mobile app
**Check:**
- API endpoint URL
- Console logs for errors
- scan_id parameter

**Solution:**
```typescript
// Add to ResultsScreen.tsx for debugging
useEffect(() => {
  console.log('Scan ID:', scanResult.scan_id);
  console.log('Feedback rating:', feedbackRating);
}, [scanResult, feedbackRating]);
```

### Issue: Admin dashboard not showing feedback
**Check:**
- Supabase RLS policies
- Query permissions
- Data actually exists

**Solution:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_feedback';

-- Test query without RLS
SET role TO postgres;
SELECT * FROM user_feedback;
```

### Issue: Auto-flagging not working
**Check:**
- AI confidence value in diagnoses table
- Flagging logic in backend

**Solution:**
```python
# Add debug logging to backend/app.py
print(f"AI Confidence: {ai_confidence}")
print(f"Rating: {rating}")
print(f"Should flag: {ai_confidence > 0.8 and rating == 'thumbs_down'}")
```

## Success Criteria

### Mobile App ✅
- [ ] Feedback section visible on Results screen
- [ ] Buttons clickable and responsive
- [ ] Correct button highlights after submission
- [ ] Thank you message displays
- [ ] Buttons disabled after submission
- [ ] Feedback persists on revisit
- [ ] Error handling works
- [ ] Hindi translation correct

### Admin Dashboard ✅
- [ ] Stats cards show correct counts
- [ ] Feedback badges appear on scan cards
- [ ] Badge colors correct (green/red)
- [ ] Flagged items show warning icon
- [ ] Yellow ring on flagged items
- [ ] Counts update in real-time

### Backend ✅
- [ ] POST /api/feedback creates record
- [ ] GET /api/feedback/<scan_id> returns data
- [ ] Auto-flagging works correctly
- [ ] Duplicate submissions handled
- [ ] Authentication enforced
- [ ] Error responses proper

### Database ✅
- [ ] Records created in user_feedback
- [ ] Foreign keys valid
- [ ] Indexes improve performance
- [ ] RLS policies work
- [ ] Timestamps accurate

## Performance Testing

### Load Test
```bash
# Test 100 feedback submissions
for i in {1..100}; do
  curl -X POST http://localhost:5000/api/feedback \
    -H "Content-Type: application/json" \
    -H "X-User-ID: test-$i" \
    -d "{\"scan_id\": $((RANDOM % 50 + 1)), \"rating\": \"thumbs_up\"}"
done
```

### Query Performance
```sql
-- Check query execution time
EXPLAIN ANALYZE
SELECT * FROM user_feedback
WHERE scan_id IN (SELECT id FROM leaf_scans LIMIT 100);
```

## Next Steps After Testing

1. **Document Bugs**: Create issues for any failures
2. **Optimize**: Improve slow queries or UI responsiveness
3. **Monitor**: Set up alerts for feedback metrics
4. **Analyze**: Review feedback data for ML insights
5. **Iterate**: Enhance based on user feedback

## Support

For issues during testing:
- Check `FEEDBACK_SYSTEM_GUIDE.md` for detailed documentation
- Review backend logs in `backend/logs/`
- Check mobile app console output
- Verify Supabase dashboard for data integrity
