import Capacitor

// Capacitor registers plugins in the app target only through a bridge view controller subclass.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
