# Heart Recovery Calendar - Deployment Guide

## 🚀 Quick Deployment Steps

### Option 1: Local Development
```bash
# 1. Extract the frontend
tar -xzf Heart-Recovery-Frontend.tar.gz
cd Heart-Recovery-Calendar/frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# Access at http://localhost:3000
```

### Option 2: Production Build
```bash
# 1. Extract and setup
tar -xzf Heart-Recovery-Frontend.tar.gz
cd Heart-Recovery-Calendar/frontend
npm install

# 2. Build for production
npm run build

# 3. Serve the dist folder with any static server
npx serve dist -p 3000
```

### Option 3: Deploy to Vercel (Recommended)
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
cd Heart-Recovery-Calendar/frontend
vercel

# Follow the prompts
```

### Option 4: Deploy to Netlify
1. Build the project: `npm run build`
2. Drag the `dist` folder to Netlify
3. Configure environment variables in Netlify dashboard

## 🔧 Environment Variables

For production deployment, update these variables:

```env
VITE_API_URL=https://your-backend-api.com/api
```

## 📱 Testing Checklist

Before deploying, test:
- [ ] Login functionality
- [ ] Dashboard data loading
- [ ] Calendar event creation
- [ ] Vitals recording
- [ ] Medication management
- [ ] Responsive design on mobile
- [ ] API connectivity

## 🌐 Production Considerations

1. **HTTPS:** Ensure both frontend and backend use HTTPS
2. **CORS:** Configure backend CORS for your frontend domain
3. **Environment:** Use production environment variables
4. **Database:** Use production PostgreSQL instance
5. **Monitoring:** Set up error tracking (e.g., Sentry)

## 🎯 Backend Requirements

Ensure your backend has:
- PostgreSQL database running
- All tables created (users, calendars, events, vitals, medications, meals)
- Demo user seeded (demo@example.com / password123)
- CORS configured for frontend domain
- JWT secret configured

## ✅ Success Indicators

Your deployment is successful when:
1. Users can login
2. Dashboard shows real data
3. Events can be created/edited
4. Vitals charts display properly
5. No console errors in browser
6. API calls complete successfully

---
Generated: October 25, 2025
