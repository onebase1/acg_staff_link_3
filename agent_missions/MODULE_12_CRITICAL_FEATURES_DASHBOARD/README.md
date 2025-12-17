# MODULE 12: Critical Features Dashboard

**Status:** 🔴 NOT STARTED
**Priority:** MVP CRITICAL
**Estimated Time:** 5-6 hours
**Risk Level:** Low
**Dependencies:** Uses spec from CRITICAL_FEATURES_REGISTRY.md (MODULE_5)

---

## 🎯 MISSION OBJECTIVE

**Problem:** No visibility into health of critical features:
- Is Timesheet OCR working?
- Is GPS clock-in accurate?
- Are notifications delivering?
- When did something last fail?

**Solution:**
Build the dashboard specified in MODULE_5's CRITICAL_FEATURES_REGISTRY.md

**End State:** Real-time health dashboard for all critical features.

---

## 📊 CRITICAL FEATURES TO TRACK

| Feature | Health Metrics | Alert Threshold |
|---------|---------------|-----------------|
| **Timesheet OCR** | Upload success rate, OCR confidence | <80% success |
| **GPS Clock-In** | Validation success, accuracy | <90% accuracy |
| **Notifications** | Delivery rate by channel | <95% delivery |
| **Shift Matching** | Match success, avg time | <70% match |
| **Compliance** | Docs expiring, overdue | >5 overdue |
| **Invoice Gen** | Gen success, send success | <95% success |

---

## 📦 DELIVERABLES

### Phase 1: Database Schema (1 hour)
- [ ] Create `critical_features` table
- [ ] Create `feature_health_metrics` table
- [ ] Create health calculation functions
- [ ] Seed 6 critical features

### Phase 2: Metrics Collection (2 hours)
- [ ] Create Edge Function: `feature-health-collector`
- [ ] Calculate health for each feature
- [ ] Store metrics every 5 minutes
- [ ] Schedule on cron

### Phase 3: Dashboard UI (2-3 hours)
- [ ] Create `src/pages/CriticalFeatures.jsx`
- [ ] Display 6 features with health status
- [ ] Color coding: Green/Yellow/Red
- [ ] Click for detailed metrics
- [ ] Historical charts
- [ ] Alert configuration

---

## 🔧 DATABASE SCHEMA

```sql
CREATE TABLE critical_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_key TEXT UNIQUE NOT NULL,
    feature_name TEXT NOT NULL,
    description TEXT,
    health_status TEXT CHECK (health_status IN ('green', 'yellow', 'red')),
    last_checked TIMESTAMPTZ,
    alert_threshold JSONB,
    dependencies JSONB,
    known_issues JSONB
);

CREATE TABLE feature_health_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_key TEXT REFERENCES critical_features(feature_key),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    metrics JSONB NOT NULL,
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100)
);
```

---

## 📋 FEATURE DEFINITIONS

### 1. Timesheet OCR Upload
```json
{
  "feature_key": "timesheet_ocr",
  "metrics": {
    "upload_success_rate": "SELECT success/total FROM last 24h",
    "ocr_confidence_avg": "SELECT AVG(confidence) FROM extractions",
    "processing_time_avg": "SELECT AVG(time_ms)"
  },
  "thresholds": {
    "green": ">90% success, >80% confidence",
    "yellow": ">70% success, >60% confidence",
    "red": "<70% success OR <60% confidence"
  }
}
```

### 2. GPS Clock-In
```json
{
  "feature_key": "gps_clockin",
  "metrics": {
    "validation_success_rate": "Successful validations / total",
    "accuracy_avg": "AVG accuracy in meters",
    "geofence_violations": "Count outside geofence"
  }
}
```

---

## ✅ SUCCESS CRITERIA

- [ ] 6 critical features defined in database
- [ ] Health metrics collecting every 5 min
- [ ] Dashboard shows all features
- [ ] Status colors accurate
- [ ] Detail view shows metrics
- [ ] Historical chart working
- [ ] Alerts configured

---

## 📞 AGENT HANDOFF

**To Start:** Reference MODULE_5/CRITICAL_FEATURES_REGISTRY.md for specs
**When Done:** Test with real data
**Next Module:** MODULE_13 (Timesheet Upload Refactor)

