using System;
using System.Collections.Generic;

namespace R6AC.Agent.Core;

public static class Whitelist
{
    public static readonly HashSet<string> SafeProcessNames = new(StringComparer.OrdinalIgnoreCase)
    {
        // System
        "explorer", "svchost", "csrss", "winlogon", "services", "lsass",
        "taskmgr", "mmc", "wermgr", "conhost", "dllhost", "sihost",
        
        // Communication (players use these)
        "discord", "teamspeak3", "mumble", "ts3client_win64",
        
        // Browsers (players may have open)
        "chrome", "msedge", "firefox", "brave",
        
        // Streaming — ONLY flag if game is also running AND confidence of other signals is high
        "obs64", "obs32", "streamlabs", "xsplit",
        
        // Common dev tools that are NOT cheats
        "code", "devenv", "rider64", "notepad++",
        
        // System utilities
        "msiexec", "tasklist", "powershell", "cmd",
        
        // Hardware monitoring (common on gaming PCs)
        "hwinfo64", "msi afterburner", "rtss", "gpuz", "cpuz",
        
        // Anti-virus (do NOT flag AV software)
        "msmpeng", "avgui", "avastui", "bdagent", "ekrn",
        
        // ElectroLAN (explicitly whitelisted)
        "electro", "electrolan",
        
        // Nvidia / AMD overlays
        "nvcontainer", "nvtelemetry", "radeonmenu",
    };

    public static readonly HashSet<string> SafeUsbVidPid = new(StringComparer.OrdinalIgnoreCase)
    {
        // Mainstream gaming mice (Logitech, Razer, SteelSeries, Corsair, HyperX, Zowie)
        "VID_046D",  // Logitech
        "VID_1532",  // Razer (Note: only flag specific PID combos, not entire vendor)
        "VID_1038",  // SteelSeries
        "VID_1B1C",  // Corsair
        "VID_0951",  // HyperX / Kingston
        "VID_04D9",  // Holtek (many budget keyboards)
        "VID_03F0",  // HP peripherals
        "VID_045E",  // Microsoft peripherals
        "VID_04F2",  // Chicony (keyboards)
        "VID_0BDA",  // Realtek USB hubs
        "VID_0458",  // KYE / Genius
        
        // Common USB hubs
        "VID_05E3",  // Genesys Logic
        "VID_2109",  // VLI USB hub
        "VID_0424",  // Microchip hub
        
        // ElectroLAN network adapter
        "VID_0BDA&PID_8153",  // Realtek USB Ethernet (common in ElectroLAN setups)
        
        // Headsets
        "VID_047F",  // Plantronics
        "VID_0D8C",  // Generic USB audio
        "VID_1130",  // Tenx Technology audio
    };
}
