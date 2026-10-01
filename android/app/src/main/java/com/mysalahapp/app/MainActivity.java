package com.mysalahapp.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CurrentLocationSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
