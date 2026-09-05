# VCRLT Game Pad — Architecture, Real UDP Pairing & GitHub Actions Build

**Product:** VCRLT Game Pad  
**Controller Layout:** dani.x240  
**Target Runtimes:** Android Controller APK & Windows PC Receiver (.exe)

---

## ⚡ How Real Pairing Works Between Android & Windows

1. **Local Wi-Fi Network**:
   - Make sure your Android Phone and Windows PC are connected to the same Wi-Fi router (or phone Mobile Hotspot).

2. **Launch Windows Receiver (`vcrlt_windows_receiver.exe`)**:
   - The PC opens a high-performance UDP socket on port **`48270`**.
   - It detects your PC's local IP (e.g. `192.168.1.50`) and displays a 6-digit Fast-Pair PIN (default: `482731`).
   - It begins broadcasting a lightweight discovery beacon (`VCRLT_BEACON`) on the local network every second.

3. **Launch Android App (`vcrlt_android_controller.apk`)**:
   - The phone listens for the beacon and automatically lists your computer under **Discovered Computers**.
   - You can also manually tap the IP field and enter your PC's IP.
   - Tap **"Connect"** or **"Pair & Launch Gamepad"**.

4. **Bidirectional Handshake & Low-Latency Input Stream**:
   - Phone sends `VCRLT_PAIR_REQ` with the PIN.
   - PC verifies the PIN and replies with `VCRLT_PAIR_ACK`.
   - The phone immediately enters full-screen controller mode and streams normalized input packets (`VcrltPacket`) at **120 Hz (~1.8 ms latency)** directly to the PC's UDP port.
   - The PC Receiver maps inputs into the **ViGEm / XInput virtual controller** (Xbox 360 controller #1) recognized by Steam, Epic Games, EA, RetroArch, and all Windows games.
   - In-game rumble feedback is transmitted back to the phone as `VCRLT_VIBRATE` packets, triggering real physical vibration!

---

## 📦 How to Build on GitHub (Zero-Setup CI)

1. **Create a GitHub Repository**:
   - Create a new repository on [GitHub.com](https://github.com/new).
   - Push this workspace to your repository (`main` or `master` branch).

2. **GitHub Actions Automatically Trigger**:
   - `.github/workflows/android.yml`:
     Scaffolds Android platform files, downloads Flutter 3.29, compiles the release APK (`app-release.apk` & split-ABIs), and uploads the APKs to the GitHub Actions Artifacts tab.
   - `.github/workflows/windows.yml`:
     Scaffolds Windows platform files, enables desktop support, compiles `Release/vcrlt_windows_receiver.exe`, compresses it with runtime DLLs into `VCRLT-PC-Receiver-Windows-x64.zip`, and uploads the ZIP to GitHub Artifacts.

3. **Download Your Built Binaries**:
   - On your GitHub repo, go to the **"Actions"** tab.
   - Click the latest workflow run.
   - Under **Artifacts**, download `VCRLT-Controller-Android-APKs` for your phone and `VCRLT-PC-Receiver-Windows-x64` for your PC!
