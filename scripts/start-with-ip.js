#!/usr/bin/env node

/**
 * This script determines the best IP address to use for Expo and starts the development server.
 * It tries multiple network interfaces and picks the most appropriate one.
 */

const { networkInterfaces } = require('os');
const { execSync, spawn } = require('child_process');

// Log all available network interfaces for debugging
const nets = networkInterfaces();
console.log('\nAvailable network interfaces:');
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      console.log(`Interface: ${name}, Address: ${net.address}`);
    }
  }
}

// Parse command-line arguments for manual IP override
const args = process.argv.slice(2);
let manualIp = null;
let ipIndex = args.indexOf('--ip');
if (ipIndex >= 0 && args.length > ipIndex + 1) {
  manualIp = args[ipIndex + 1];
  console.log(`Manual IP override: ${manualIp}`);
}

// Get IP address
let ipAddress = manualIp;

if (!ipAddress) {
  // Check for mobile hotspot or specific interfaces first (more likely to be the right one)
  const mobileInterfaces = ['en0', 'wlan0', 'eth0', 'Wi-Fi', 'Ethernet'];
  
  for (const iface of mobileInterfaces) {
    if (nets[iface]) {
      for (const net of nets[iface]) {
        if (net.family === 'IPv4' && !net.internal) {
          // Prefer addresses starting with 172.* or 192.168.* (common for mobile hotspots)
          if (net.address.startsWith('172.') || net.address.startsWith('192.168.')) {
            ipAddress = net.address;
            console.log(`Using preferred mobile interface: ${iface}, IP: ${ipAddress}`);
            break;
          }
        }
      }
      if (ipAddress) break;
    }
  }
  
  // If no preferred interface found, use any external interface
  if (!ipAddress) {
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          ipAddress = net.address;
          console.log(`Using fallback interface: ${name}, IP: ${ipAddress}`);
          break;
        }
      }
      if (ipAddress) break;
    }
  }
}

// Fall back to localhost if no IP was found
if (!ipAddress) {
  ipAddress = '127.0.0.1';
  console.warn('\x1b[33m%s\x1b[0m', 'Warning: Could not find an external IP address. Using localhost.');
} else {
  console.log('\x1b[32m%s\x1b[0m', `\nUsing IP address: ${ipAddress}`);
}

// Set the environment variable and start Expo
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = ipAddress;

console.log('\x1b[36m%s\x1b[0m', `Starting Expo with REACT_NATIVE_PACKAGER_HOSTNAME=${ipAddress}`);

// Use npx expo for more reliable execution
const expo = spawn('npx', ['expo', 'start', '--clear'], { 
  stdio: 'inherit',
  env: { ...process.env }
});

// Handle process exit
expo.on('exit', (code) => {
  process.exit(code);
});

// Handle errors
expo.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', 'Failed to start Expo:', err);
  process.exit(1);
}); 