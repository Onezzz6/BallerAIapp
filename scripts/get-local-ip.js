#!/usr/bin/env node

/**
 * Get the active local IP address that can be used by Expo
 * This script prioritizes non-localhost, non-internal IPs
 */

const { networkInterfaces } = require('os');

function getLocalIP() {
  const interfaces = networkInterfaces();
  let ip = 'localhost'; // Default fallback
  
  // First pass: look for non-internal, non-localhost IPv4 addresses
  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      // Skip over internal, non-ipv4 addresses
      if (iface.family !== 'IPv4' || iface.internal) continue;
      
      // Skip localhost
      if (iface.address === '127.0.0.1') continue;
      
      // Found a good one!
      ip = iface.address;
      break;
    }
  }
  
  // Output just the IP address (to be captured by the script)
  console.log(ip);
  return ip;
}

getLocalIP(); 