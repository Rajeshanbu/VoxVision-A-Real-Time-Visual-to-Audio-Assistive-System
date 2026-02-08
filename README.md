# VisionAID AI

VisionAID AI is a real-time assistive navigation web application for the visually impaired. It uses the device camera to detect objects, read text, and provide audio guidance.

## Prerequisites

- **Node.js** (LTS version recommended) installed on your computer.
- A **smartphone** (Android/iOS) connected to the **same Wi-Fi network** as your computer.
- (Optional) A clear space to test navigation.

## How to Run

1.  **Open Terminal**: Navigate to the project folder.
    ```bash
    cd "C:\Users\SEC\Documents\project phase 2"
    ```

2.  **Install Dependencies** (if you haven't already):
    ```bash
    npm install
    ```

3.  **Start the Server**:
    Run the following command to start the app and expose it to your network:
    ```bash
    npm run dev -- --host
    ```

4.  **Connect Mobile Device**:
    - Look at the terminal output for the **Network** URL.
      - Example: `➜  Network: http://192.168.1.5:5173/`
    - Open Chrome or Safari on your phone.
    - Type that exact URL into the address bar.

5.  **Grant Permissions**:
    - The browser will ask for Camera access. Tap **Allow**.
    - Ensure your volume is up.

## Troubleshooting

- **"Site can't be reached"**: Ensure your phone and PC are on the same Wi-Fi. Check your PC's firewall settings.
- **"Camera error"**: Ensure you tapped "Allow". If using Chrome on Android, check Site Settings > Camera.
- **No Audio**: ensure you have tapped the "START SYSTEM" button on the screen. Browsers block auto-playing audio.
