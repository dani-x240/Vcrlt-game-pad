# VCRLT Game Pad 🎮

Turn your Android smartphone into a low-latency wireless PlayStation 5 DualSense controller for PC gaming, paired with a zero-configuration Windows receiver that maps inputs straight to XInput/ViGEm.

![VCRLT Logo](public/app_icon.jpg)

---

## 🚀 Features

- **Full DualSense Layout & 2 dani.x240 Models**:
  - **dani.x240 Stealth Black**: Matte obsidian black console body with authentic Sony colors (Teal ▲, Coral ●, Blue ✕, Pink ■)
  - **dani.x240 Cyber Neon**: Deep midnight space blue with glowing white geometric glyphs and glowing cyan analog stick halos
  - Symmetrical dual analog sticks with dedicated **L3** and **R3** corner click triggers
  - Angled **L1 / L2** and **R1 / R2** shoulder bumpers and triggers
  - Center multi-touch **Touchpad** with click (for in-game maps and inventory)
  - Labeled **Share**, **PS**, and **Option** buttons
- **4 Fast Connection Methods**:
  - **Wi-Fi**: Automatic connection across your home network.
  - **Phone Hotspot**: Connect PC to phone hotspot with no external router needed.
  - **USB Cable**: Plug-in USB tethering for direct 0ms latency.
  - **Bluetooth**: Direct wireless Bluetooth gamepad pairing.
- **Zero-Configuration Windows Receiver**:
  - Automatically recognizes inputs and connects seamlessly
  - Injects directly into Windows as an XInput Virtual Gamepad (Steam, Epic Games, EA, Xbox, emulators)
  - Interactive live button feedback visualizer
  - Bi-directional rumble haptics support

---

## 📦 Automated GitHub Builds (Get APK & EXE)

This repository includes pre-configured **GitHub Actions CI/CD pipelines** that automatically compile the Android APK and Windows EXE as soon as you push code to GitHub:

### 1. Push to GitHub
If using Git:
```bash
git init
git add .
git commit -m "Initial commit - VCRLT Game Pad"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```
*(Or use the **Export to GitHub** feature directly from Google AI Studio).*

### 2. Automatic Cloud Builds
GitHub will automatically trigger two workflows:
- **`Build VCRLT Android APK`**: Scaffolds the Android project, runs Flutter 3.29, and compiles release APKs (`app-release.apk` & ABI splits).
- **`Build VCRLT Windows Receiver EXE`**: Compiles the native Windows desktop receiver executable (`vcrlt_windows_receiver.exe`) packaged inside `VCRLT-PC-Receiver-Windows-x64.zip`.

### 3. Download the Binaries
1. Go to your repository on **GitHub.com**.
2. Click the **Actions** tab at the top.
3. Click the latest workflow run.
4. Scroll to the **Artifacts** section at the bottom to download:
   - **`VCRLT-Controller-Android-APKs`**: Contains:
     - `VCRLT-Universal-Recommended.apk` (Universal FAT APK - Works on all devices)
     - `VCRLT-itel-A50-32bit.apk` (Optimized for itel A50 / Android Go 32-bit)
     - `VCRLT-64bit-arm64.apk` (For standard 64-bit phones)
     - `VCRLT-Debug-All-Devices.apk` (Bypasses any Android 14 security restrictions)
   - **`VCRLT-PC-Receiver-Windows-x64`** (Run `vcrlt_windows_receiver.exe` directly on your PC)

---

## 📱 How to Connect Phone & PC (Wi-Fi QR Code Only)

1. Connect both your phone and PC to the **same Wi-Fi or Phone Hotspot**.
2. Open `vcrlt_windows_receiver.exe` on your PC. It displays the **auto-generated Wi-Fi QR Code**.
3. Open `VCRLT Game Pad` on your phone and tap **"Scan QR Code"**.
4. Point your camera at the PC screen. The phone connects instantly and the PC switches straight to the controller input feed for GTA V and PC games!

---

## 📁 Repository Structure

```
├── .github/workflows/
│   ├── android.yml          # Automated Android APK build workflow
│   └── windows.yml          # Automated Windows EXE build workflow
├── flutter_source/
│   ├── android_controller/  # Complete Flutter source code for Android APK
│   ├── windows_receiver/    # Complete Flutter source code for Windows EXE
│   └── protocol/            # High-speed UDP packet definition
├── src/                     # React web simulator & actions studio
├── public/                  # App icon, logo, and static assets
└── README.md                # Project documentation
```
