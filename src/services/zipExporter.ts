/**
 * Directly downloads the 100% complete workspace zip file containing:
 * - .github/workflows/android.yml (Android APK Action)
 * - .github/workflows/windows.yml (Windows Receiver EXE Action)
 * - flutter_source/ (All Dart & Flutter controllers, protocol, models)
 * - src/ (Web controllers, simulators, layouts)
 * - All assets, documentation, and configuration files
 */
export async function downloadProjectZip(): Promise<void> {
  try {
    const link = document.createElement('a');
    link.href = '/vcrlt-gamepad-complete-project.zip';
    link.download = 'vcrlt-gamepad-complete-100-percent.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    // Fallback if browser blocks link click
    window.open('/vcrlt-gamepad-complete-project.zip', '_blank');
  }
}
