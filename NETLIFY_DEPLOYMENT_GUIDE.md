# 🚀 NETLIFY DEPLOYMENT GUIDE - ACG StaffLink

## ✅ PREREQUISITES COMPLETED
- ✅ Code pushed to GitHub: https://github.com/onebase1/acg_staff_link_3
- ✅ Environment variables ready
- ✅ Build configuration verified

---

## 📋 STEP-BY-STEP DEPLOYMENT

### STEP 1: Go to Netlify
1. Open: https://app.netlify.com
2. Sign in with your account

### STEP 2: Import Project
1. Click **"Add new site"** button (top right)
2. Select **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub account (if not already done)
5. Search for and select: **`onebase1/acg_staff_link_3`**

### STEP 3: Configure Build Settings
On the "Site settings" page, configure:

**Basic build settings:**
- **Branch to deploy:** `main`
- **Base directory:** (leave empty)
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### STEP 4: Add Environment Variables ⚠️ CRITICAL
Click **"Add environment variables"** and add these:

```
VITE_SUPABASE_URL = https://rzzxxkppkiasuouuglaf.supabase.co

VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTYwNDgsImV4cCI6MjA3NzE3MjA0OH0.eYyjJTxHeYSGJEmDhOEq-b1v473kg-OqHhAtC4BBHrY
```

**⚠️ IMPORTANT:** 
- Only add the `VITE_` prefixed variables
- DO NOT add `SUPABASE_SERVICE_KEY` (security risk!)
- DO NOT add API keys (OpenAI, Resend, Twilio) - those are for Edge Functions only

### STEP 5: Deploy!
1. Click **"Deploy acg_staff_link_3"**
2. Wait 3-5 minutes for the build to complete
3. You'll get a URL like: `https://acg-staff-link-3.netlify.app`

---

## 🎯 AFTER DEPLOYMENT

### Verify Deployment
1. **Open your Netlify URL**
2. **Test login** with:
   - Email: `info@guest-glow.com`
   - Password: `Dominion#2025`
3. **Check key features:**
   - Dashboard loads
   - Shifts page works
   - Staff page works
   - Data loads from Supabase

### Custom Domain (Optional)
1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow instructions to configure DNS

---

## 🔧 BUILD CONFIGURATION

Your `package.json` already has the correct build command:
```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

Vite will output to `dist/` directory automatically.

---

## 🆘 TROUBLESHOOTING

### Build Fails with "Command not found"
**Solution:** Netlify should auto-detect Node.js. If not, add:
```
NODE_VERSION = 18
```
to environment variables.

### Build Fails with "Module not found"
**Solution:** Make sure `package-lock.json` is committed to GitHub (it is ✅)

### App Loads but Shows Errors
**Solution:** Check browser console. Most likely:
- Missing environment variables
- CORS issues (check Supabase CORS settings)

### "Failed to fetch" Errors
**Solution:** 
1. Go to Supabase Dashboard → Settings → API
2. Add your Netlify URL to allowed origins:
   - `https://acg-staff-link-3.netlify.app`
   - `https://*.netlify.app` (for preview deploys)

---

## 🎉 AUTO-DEPLOY ENABLED

Once deployed, Netlify will automatically:
- ✅ Deploy every push to `main` branch
- ✅ Create preview deploys for pull requests
- ✅ Run builds on every commit

---

## 📊 DEPLOYMENT CHECKLIST

- [ ] Go to https://app.netlify.com
- [ ] Import GitHub repo: `onebase1/acg_staff_link_3`
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `dist`
- [ ] Add environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Test login at your Netlify URL
- [ ] Add Netlify URL to Supabase CORS settings

---

## 🔗 USEFUL LINKS

- **Netlify Dashboard:** https://app.netlify.com
- **GitHub Repo:** https://github.com/onebase1/acg_staff_link_3
- **Supabase Dashboard:** https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf
- **Netlify Docs:** https://docs.netlify.com

---

## 🎯 NEXT STEPS AFTER DEPLOYMENT

1. **Test all critical workflows:**
   - Login/Signup
   - Shift creation
   - Staff management
   - Timesheet approval
   - Invoice generation

2. **Configure Supabase Edge Functions:**
   - Update webhook URLs to point to your Netlify domain
   - Test email notifications
   - Test SMS/WhatsApp (if configured)

3. **Monitor deployment:**
   - Check Netlify build logs
   - Monitor Supabase logs
   - Check browser console for errors

---

**Ready to deploy? Follow the steps above!** 🚀

