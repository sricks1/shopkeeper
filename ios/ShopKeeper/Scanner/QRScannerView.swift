import AVFoundation
import SwiftUI
import VisionKit

/// Sheet content that scans a QR code and hands the raw payload string back
/// through `onScan`, then dismisses itself. The caller (`ToolsListView`)
/// runs the payload through `DeepLink.parse` — this view doesn't know
/// anything about `DeepLink`, just strings.
///
/// `DataScannerViewController` needs real camera hardware:
/// `.isSupported` is `false` on every Simulator, so this checks
/// availability up front and shows an explanatory message instead of a
/// black or crashing screen. That degraded state is the only thing
/// anyone can verify about this feature until it runs on a physical
/// device. Camera-permission denial gets its own message with a direct
/// link to Settings.
struct QRScannerView: View {
    let onScan: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var availability: Availability = .checking
    @State private var hasScanned = false

    private enum Availability {
        case checking
        case unsupportedDevice
        case cameraDenied
        case ready
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Scan QR Code")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                }
        }
        .task {
            await checkAvailability()
        }
    }

    @ViewBuilder
    private var content: some View {
        switch availability {
        case .checking:
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .unsupportedDevice:
            ContentUnavailableView {
                Label("Scanning Not Available", systemImage: "qrcode.viewfinder")
            } description: {
                Text("This device doesn't support the QR scanner — that includes every Simulator. Try a physical iPhone or iPad, or open the tool from its link instead.")
            }
        case .cameraDenied:
            ContentUnavailableView {
                Label("Camera Access Needed", systemImage: "camera.fill")
            } description: {
                Text("ShopKeeper needs camera access to scan tool QR codes. Enable it in Settings > ShopKeeper > Camera.")
            } actions: {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
            }
        case .ready:
            DataScannerRepresentable(onScan: handleScan)
                .ignoresSafeArea()
        }
    }

    private func handleScan(_ payload: String) {
        guard !hasScanned else { return }
        hasScanned = true
        onScan(payload)
        dismiss()
    }

    private func checkAvailability() async {
        guard DataScannerViewController.isSupported else {
            availability = .unsupportedDevice
            return
        }

        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            availability = DataScannerViewController.isAvailable ? .ready : .unsupportedDevice
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            availability = granted
                ? (DataScannerViewController.isAvailable ? .ready : .unsupportedDevice)
                : .cameraDenied
        case .denied, .restricted:
            availability = .cameraDenied
        @unknown default:
            availability = .unsupportedDevice
        }
    }
}
