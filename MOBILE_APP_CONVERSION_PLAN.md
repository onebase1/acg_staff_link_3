# 📱 ACG StaffLink Mobile App Conversion Plan

## Executive Summary

Convert ACG StaffLink into native iOS and Android mobile apps, primarily for the **Staff Portal**, while keeping admin/agency operations on desktop web. This will enable push notifications, offline capabilities, and better mobile UX.

---

## 🎯 Strategic Approach: Hybrid Apps with Capacitor

### **Recommended Technology: Ionic Capacitor**

**Why Capacitor?**
- ✅ **Reuse 95% of existing React code** - No need to rebuild from scratch
- ✅ **One codebase** → iOS + Android + Web (PWA)
- ✅ **Native features** - Push notifications, camera, GPS, biometrics
- ✅ **App Store ready** - Can publish to Apple App Store and Google Play
- ✅ **Backed by Ionic** - Mature, well-maintained, excellent docs
- ✅ **TypeScript/React** - Same stack you're already using
- ✅ **No learning curve** - Just add native wrappers to existing app

**Alternative (Not Recommended)**:
- ❌ **React Native** - Would require complete rewrite, different components
- ❌ **Flutter** - Requires learning Dart, complete rewrite
- ❌ **Native (Swift/Kotlin)** - 2x dev effort, maintain 2 separate codebases

---

## 📊 App Strategy: Staff-Only Mobile App

### **Phase 1: Staff Portal Mobile App (Recommended)**

**Target Users**: Care workers, nurses, support workers

**Core Features**:
- 📅 My Shifts calendar (clock in/out with GPS)
- 📋 Profile completion & document uploads
- 📱 Push notifications (shift reminders, new assignments)
- 💬 WhatsApp integration (already built)
- 📸 Camera for photo ID & certificates
- 🗺️ GPS tracking during shifts (already built)
- 📄 View timesheets and pay slips
- 🔔 Real-time alerts

**Why Staff-Only First?**
- ✅ Highest impact - Staff are mobile workers, need app most
- ✅ Clear use case - Push notifications for shifts are killer feature
- ✅ Simpler scope - Fewer screens, focused functionality
- ✅ Faster to market - Can launch in 4-6 weeks
- ✅ Better UX - Mobile-first design for mobile workers

### **Phase 2: Admin Dashboard (Optional, Later)**

**Desktop/Tablet Web** (Keep as is):
- Full admin dashboard
- Shift management & scheduling
- Invoicing & billing
- Reports & analytics
- Client management

**Why Keep Admin on Web?**
- ✅ Complex workflows better on desktop
- ✅ Large forms and data entry
- ✅ Multiple tabs/windows workflow
- ✅ No mobile app needed for office staff
- ✅ Saves development time

---

## 🏗️ Technical Implementation Plan

### **Architecture: Progressive Enhancement**

```
┌─────────────────────────────────────────────────────────┐
│                    CURRENT WEB APP                       │
│                 (React + Vite + Supabase)               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
          ┌───────────────────────────────┐
          │   ADD CAPACITOR WRAPPER        │
          │   (iOS + Android Support)      │
          └───────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │  iOS   │      │Android │      │  PWA   │
    │  App   │      │  App   │      │  Web   │
    └────────┘      └────────┘      └────────┘
```

**Key Point**: Your existing React app becomes the mobile app with minimal changes!

---

## 📋 Step-by-Step Conversion Process

### **Phase 1: Preparation (Week 1)**

#### 1.1 Code Refactoring
- ✅ Separate Staff Portal routes from Admin routes
- ✅ Create dedicated layout for mobile (already mostly done)
- ✅ Ensure all components are mobile-responsive
- ✅ Extract shared components

#### 1.2 Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "ACG StaffLink" "com.agilecaregroup.stafflink"
npm install @capacitor/ios @capacitor/android
```

#### 1.3 Add Mobile-Specific Plugins
```bash
npm install @capacitor/push-notifications
npm install @capacitor/camera
npm install @capacitor/geolocation
npm install @capacitor/haptics
npm install @capacitor/status-bar
npm install @capacitor/splash-screen
npm install @capacitor/local-notifications
```

---

### **Phase 2: Mobile Build Setup (Week 2)**

#### 2.1 Configure Capacitor

**File**: `capacitor.config.ts`
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agilecaregroup.stafflink',
  appName: 'ACG StaffLink',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#06b6d4",
      showSpinner: true
    }
  }
};

export default config;
```

#### 2.2 Build Mobile Projects
```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

#### 2.3 Configure Build Scripts

**Update `package.json`**:
```json
{
  "scripts": {
    "build": "vite build",
    "build:mobile": "vite build && npx cap sync",
    "ios": "npx cap open ios",
    "android": "npx cap open android",
    "sync": "npx cap sync"
  }
}
```

---

### **Phase 3: Native Features Implementation (Week 3-4)**

#### 3.1 Push Notifications

**Create**: `src/services/pushNotifications.ts`
```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';

export const initPushNotifications = async (staffId: string) => {
  // Request permission
  const permission = await PushNotifications.requestPermissions();

  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }

  // Listen for registration
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push token:', token.value);

    // Save token to staff table
    await supabase
      .from('staff')
      .update({ push_token: token.value })
      .eq('id', staffId);
  });

  // Handle received notifications
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });

  // Handle notification tap
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push tapped:', notification);
    // Navigate to relevant screen
  });
};
```

#### 3.2 Camera Integration

**Update**: `src/pages/ProfileSetup.jsx`
```typescript
import { Camera } from '@capacitor/camera';

const takePhoto = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera
  });

  // Upload to Supabase storage
  const blob = await (await fetch(image.dataUrl)).blob();
  // ... existing upload logic
};
```

#### 3.3 Enhanced GPS Tracking

**Update**: `src/services/gpsTracking.ts`
```typescript
import { Geolocation } from '@capacitor/geolocation';

export const startGPSTracking = async (shiftId: string) => {
  // Request permissions
  const permission = await Geolocation.requestPermissions();

  if (permission.location === 'granted') {
    // Watch position every 5 minutes
    const watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      (position) => {
        // Update staff location in Supabase
        updateStaffLocation(shiftId, position.coords);
      }
    );

    return watchId;
  }
};
```

#### 3.4 Biometric Authentication

**Create**: `src/services/biometrics.ts`
```typescript
import { NativeBiometric } from '@capacitor-community/native-biometric';

export const setupBiometrics = async () => {
  const available = await NativeBiometric.isAvailable();

  if (available.isAvailable) {
    await NativeBiometric.setCredentials({
      username: userEmail,
      password: secureToken,
      server: "com.agilecaregroup.stafflink"
    });
  }
};

export const authenticateWithBiometrics = async () => {
  const result = await NativeBiometric.verifyIdentity({
    reason: "Log in to ACG StaffLink",
    title: "Biometric Authentication"
  });

  if (result.verified) {
    const credentials = await NativeBiometric.getCredentials({
      server: "com.agilecaregroup.stafflink"
    });

    return credentials;
  }
};
```

---

### **Phase 4: UI/UX Mobile Optimization (Week 4-5)**

#### 4.1 Changes Needed (Minimal!)

**Your app is already mobile-optimized!** 🎉

However, add these enhancements:

**Native Statusbar**:
```typescript
import { StatusBar, Style } from '@capacitor/status-bar';

// In App.tsx
useEffect(() => {
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: Style.Light });
    StatusBar.setBackgroundColor({ color: '#06b6d4' });
  }
}, []);
```

**Splash Screen**:
- Design: ACG logo with gradient background
- Duration: 2 seconds
- Assets needed: Various icon sizes (1024x1024, 512x512, etc.)

**Bottom Navigation** (Mobile-Only):
```tsx
// Add to StaffPortal layout
<div className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
  <nav className="flex justify-around py-2">
    <NavButton icon={Calendar} label="Shifts" />
    <NavButton icon={User} label="Profile" />
    <NavButton icon={FileText} label="Docs" />
    <NavButton icon={DollarSign} label="Pay" />
  </nav>
</div>
```

**Haptic Feedback**:
```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const hapticsImpact = async () => {
  await Haptics.impact({ style: ImpactStyle.Medium });
};

// Use on button clicks, swipes, etc.
```

#### 4.2 What Stays the Same

✅ **All existing components** - No rewrite needed
✅ **All Supabase queries** - Work exactly the same
✅ **All existing routes** - No changes needed
✅ **All styling** - TailwindCSS works in Capacitor
✅ **All Edge Functions** - Backend unchanged

---

### **Phase 5: Backend Enhancements (Week 5)**

#### 5.1 Add Push Notification Column to Staff Table

```sql
ALTER TABLE staff ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;
COMMENT ON COLUMN staff.push_token IS 'FCM/APNS push notification token';
```

#### 5.2 Create Push Notification Edge Function

**File**: `supabase/functions/send-push-notification/index.ts`
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { staff_id, title, body, data } = await req.json();

  // Get staff push token
  const { data: staff } = await supabase
    .from('staff')
    .select('push_token, push_enabled')
    .eq('id', staff_id)
    .single();

  if (!staff?.push_token || !staff.push_enabled) {
    return new Response(JSON.stringify({ error: 'No push token' }), { status: 400 });
  }

  // Send via FCM (Android) / APNS (iOS)
  const fcmResponse = await fetch('https://fcm.googleapis.com/v1/projects/YOUR_PROJECT/messages:send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        token: staff.push_token,
        notification: { title, body },
        data
      }
    })
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

#### 5.3 Integrate Push Notifications

**Update**: `shift-reminder-engine` Edge Function
```typescript
// After creating reminder, send push notification
await supabase.functions.invoke('send-push-notification', {
  body: {
    staff_id: shift.staff_id,
    title: '🔔 Shift Reminder',
    body: `Your shift at ${shift.client_name} starts in 2 hours`,
    data: {
      type: 'shift_reminder',
      shift_id: shift.id,
      action: 'view_shift'
    }
  }
});
```

---

### **Phase 6: App Store Preparation (Week 6)**

#### 6.1 Apple App Store Requirements

**Developer Account**:
- Apple Developer Program: $99/year
- Register at: https://developer.apple.com

**App Assets**:
- App Icon: 1024x1024px (no transparency)
- Screenshots:
  - iPhone 6.7" (3 required)
  - iPhone 6.5" (3 required)
  - iPad Pro 12.9" (3 required)
- Privacy Policy URL
- Support URL
- App Description (4000 chars max)
- Keywords (100 chars)

**App Store Connect Setup**:
1. Create app listing
2. Add app description and screenshots
3. Set pricing (Free)
4. Add age rating (4+)
5. Add privacy policy
6. Submit for review (7-10 days)

#### 6.2 Google Play Store Requirements

**Developer Account**:
- Google Play Console: $25 one-time fee
- Register at: https://play.google.com/console

**App Assets**:
- App Icon: 512x512px
- Feature Graphic: 1024x500px
- Screenshots: At least 2 (1080x1920px)
- Privacy Policy URL
- App Description (4000 chars)
- Short Description (80 chars)

**Google Play Console Setup**:
1. Create app listing
2. Add app content rating questionnaire
3. Add data safety form
4. Upload APK/AAB bundle
5. Submit for review (1-3 days)

#### 6.3 App Signing & Build

**iOS** (requires Mac):
```bash
# Open Xcode
npx cap open ios

# Configure signing in Xcode
# Build → Archive → Distribute to App Store
```

**Android**:
```bash
# Generate signed APK
cd android
./gradlew bundleRelease

# Upload to Play Console
```

---

## 💰 Cost Breakdown

### **Development Costs**

| Phase | Time | Cost (If Outsourced) | DIY Notes |
|-------|------|---------------------|-----------|
| Phase 1: Preparation | 1 week | $2,000 - $3,000 | You can do this |
| Phase 2: Mobile Setup | 1 week | $2,500 - $4,000 | Mostly config |
| Phase 3: Native Features | 2 weeks | $5,000 - $8,000 | Most complex |
| Phase 4: UI Optimization | 1-2 weeks | $3,000 - $5,000 | Minimal work needed |
| Phase 5: Backend | 1 week | $2,000 - $3,000 | You can do this |
| Phase 6: App Store | 1 week | $1,500 - $2,500 | Admin work |
| **TOTAL** | **6-8 weeks** | **$16,000 - $25,000** | **DIY: $0 + time** |

### **Ongoing Costs**

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Program | $99 | Annual |
| Google Play Console | $25 | One-time |
| Push Notification Service (FCM) | Free | N/A |
| App Store Maintenance | $500-1000 | Annual |
| **TOTAL** | **$624 first year, $599/year after** | |

---

## ⚡ Quick Start Option: Capacitor PWA First

### **Test the Waters Without Full App Store Deployment**

Before committing to full native apps, you can:

1. **Install Capacitor** (1 day)
2. **Build as PWA** (Progressive Web App)
3. **Test on devices** using local builds
4. **Get feedback** from staff
5. **Then decide** on App Store deployment

**Benefits**:
- Test native features locally
- No App Store fees yet
- Faster iteration
- Can still add to home screen on iOS/Android

**Command**:
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
npx cap run ios  # Test locally
npx cap run android  # Test locally
```

---

## 🎯 Recommended Phases

### **Phase 1: PWA + Local Testing (Month 1)**
- Install Capacitor
- Test on staff devices
- Gather feedback
- Cost: $0

### **Phase 2: Add Core Features (Month 2)**
- Push notifications
- Camera integration
- GPS tracking
- Biometrics
- Cost: Time only

### **Phase 3: App Store Deployment (Month 3)**
- Prepare assets
- Submit to stores
- Launch to staff
- Cost: $124 + time

### **Phase 4: Iterate & Improve (Ongoing)**
- Based on staff feedback
- Add features as needed
- Monitor analytics

---

## 📊 Feature Comparison: Web vs Mobile App

| Feature | Current Web | Mobile App | Benefit |
|---------|-------------|------------|---------|
| View Shifts | ✅ | ✅ | Same |
| Clock In/Out | ✅ | ✅ + GPS | Better accuracy |
| Profile Upload | ✅ | ✅ + Camera | Easier docs |
| Notifications | Email/WhatsApp | Push | Instant alerts |
| Offline Access | ❌ | ✅ | Work without WiFi |
| Biometric Login | ❌ | ✅ | Faster, secure |
| Home Screen Icon | PWA only | Native | Better UX |
| App Store | ❌ | ✅ | Professional |
| Background GPS | ❌ | ✅ | Auto tracking |
| Local Storage | Limited | Full | Caching |

---

## 🚀 Success Metrics

### **Track These KPIs**

**Adoption**:
- % of staff with app installed
- Target: 80%+ within 3 months

**Engagement**:
- Daily active users
- Shift check-ins via app
- Target: 70%+ of shifts

**Performance**:
- Profile completion rate
- Document upload rate
- Target: 95%+ complete profiles

**Satisfaction**:
- App store ratings
- Staff feedback surveys
- Target: 4.5+ stars

---

## 📋 Action Items for Future

### **Before Starting Development**

- [ ] Decide: Staff-only or include admin?
- [ ] Register Apple Developer account ($99)
- [ ] Register Google Play Console ($25)
- [ ] Design app icon and splash screen
- [ ] Write privacy policy (required)
- [ ] Set up Firebase for push notifications (free)
- [ ] Create app store descriptions and screenshots
- [ ] Test Capacitor with existing app (1 day)

### **During Development**

- [ ] Install Capacitor and plugins
- [ ] Configure iOS and Android projects
- [ ] Implement push notifications
- [ ] Add camera integration
- [ ] Test on physical devices
- [ ] Create app store assets
- [ ] Submit for review

### **Post-Launch**

- [ ] Monitor crash reports
- [ ] Track usage analytics
- [ ] Gather staff feedback
- [ ] Iterate on features
- [ ] Regular updates (monthly)

---

## 🎉 Summary

### **The Good News**

✅ Your app is **already 95% ready** for mobile
✅ **Capacitor makes it easy** - no rewrite needed
✅ **Staff Portal is perfect** for mobile app
✅ **Keep admin on web** - simpler and faster
✅ **Native features** will massively improve UX
✅ **Timeline: 6-8 weeks** total
✅ **Cost: ~$600/year** ongoing

### **My Recommendation**

1. **Start with Capacitor PWA** - Test locally first (Week 1-2)
2. **Add push notifications** - Biggest impact feature (Week 3-4)
3. **Polish and submit** - App Store deployment (Week 5-6)
4. **Launch to staff** - Beta test with small group first
5. **Iterate based on feedback** - Continuous improvement

### **Timeline to Launch**

- **Fast Track**: 6 weeks (focused effort)
- **Comfortable**: 8 weeks (part-time work)
- **With Testing**: 10 weeks (beta + iterations)

---

## 📞 Next Steps

When you're ready to start:

1. **Test Capacitor**: `npm install @capacitor/core @capacitor/cli`
2. **Run locally**: `npx cap run ios` or `npx cap run android`
3. **See it work**: Your existing app running natively!

I'll be here to help with implementation when you're ready! 🚀
