const dns = require('dns');

// Configure custom DNS servers for direct resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  } else if (typeof options === 'number') {
    options = { family: options };
  } else if (!options) {
    options = {};
  }
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return originalLookup(hostname, options, callback);
  }

  // Use resolve4 (which uses our configured DNS servers)
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || !addresses.length) {
      // Fallback to default OS lookup if custom resolution fails
      return originalLookup(hostname, options, callback);
    }
    
    if (options.all) {
      const results = addresses.map(addr => ({ address: addr, family: 4 }));
      return callback(null, results);
    } else {
      return callback(null, addresses[0], 4);
    }
  });
};

console.log('[DNS Override] Successfully patched dns.lookup supporting options.all');
