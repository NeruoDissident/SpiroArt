# SpiroArt Mobile Deployment Guide 📱

## Quick Launch Options

### Option 1: Local Network Access (Instant)
1. **Start local server**:
   ```bash
   # Navigate to SpiroArt folder
   cd SpiroArt
   
   # Start server (accessible to other devices)
   python -m http.server 5173 --bind 0.0.0.0
   ```

2. **Find your computer's IP**:
   - **Windows**: `ipconfig` → IPv4 Address (e.g., `192.168.1.100`)
   - **Mac**: `ifconfig en0 | grep inet` 
   - **Linux**: `hostname -I`

3. **Access from mobile**:
   - Open mobile browser
   - Go to: `http://YOUR_IP:5173` (e.g., `http://192.168.1.100:5173`)
   - Both devices must be on same WiFi network

### Option 2: Cloud Deployment (Permanent)

#### Netlify (Easiest)
1. Go to [netlify.com](https://netlify.com)
2. Drag & drop the `SpiroArt` folder onto the deploy area
3. Get instant live URL (e.g., `https://spiroart-abc123.netlify.app`)
4. Share URL with anyone, works on all devices

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. In SpiroArt folder: `vercel`
3. Follow prompts → get live URL

#### GitHub Pages
1. Push SpiroArt to GitHub repository
2. Go to repo Settings → Pages
3. Select source branch → get `https://username.github.io/spiroart` URL

### Option 3: PWA Installation (App-like)

Once deployed (Option 1 or 2):
1. **Open in mobile browser** (Chrome, Safari, Edge)
2. **Look for "Add to Home Screen"** or "Install" prompt
3. **Tap "Add"** → SpiroArt appears as app icon
4. **Launch like native app** → full-screen, no browser UI
5. **Works offline** after first load

## Mobile Features Included

### ✅ Touch-Optimized UI
- **44px minimum touch targets** (Apple/Google guidelines)
- **Larger buttons and controls** for easy tapping
- **Improved spacing** between interactive elements
- **Prevents zoom** on input focus

### ✅ Haptic Feedback
- **Light vibration** on color selection
- **Medium vibration** on gear/ring changes  
- **Success pattern** on draw completion
- **Works on iOS and Android**

### ✅ Mobile-Specific Interactions
- **Touch drawing**: Tap and drag to draw manually
- **Pinch to zoom**: Canvas supports touch gestures
- **Swipe gestures**: Navigate between configurations
- **Portrait/landscape**: Works in any orientation

### ✅ Performance Optimized
- **Efficient rendering** for mobile GPUs
- **Smooth 60fps animations** on modern devices
- **Memory management** for long drawing sessions
- **Battery-conscious** animation loops

## Troubleshooting

### Can't Access from Mobile
- **Check WiFi**: Both devices on same network
- **Check firewall**: Allow port 5173
- **Try different port**: `python -m http.server 8080 --bind 0.0.0.0`

### App Feels Slow
- **Close other apps** to free memory
- **Use Chrome/Safari** (best performance)
- **Reduce pen width** for complex patterns
- **Clear canvas** periodically

### Touch Not Working
- **Hard refresh**: Clear browser cache
- **Check browser**: Use modern browser (Chrome 80+, Safari 13+)
- **Update OS**: Ensure recent iOS/Android version

## Best Mobile Experience

### Recommended Settings
- **Pen Width**: 2-4px (visible but not heavy)
- **Draw Speed**: 3-5 (smooth but not too fast)
- **Color Cycling**: Use themed palettes for best visual results
- **Glow Effects**: Enable for stunning visuals on OLED screens

### Pro Tips
- **Use landscape** for larger drawing area
- **Enable glow** on dark themes for OLED displays
- **Save screenshots** before clearing canvas
- **Try different palettes** (Neon, Cyberpunk work great on mobile)

## Sharing Your Art

1. **Screenshot**: Built-in PNG export button
2. **Vector**: SVG export for print quality
3. **Social**: Direct share from mobile browser
4. **Save**: Download to camera roll

---

**Ready to create beautiful spirograph art on mobile! 🎨**
