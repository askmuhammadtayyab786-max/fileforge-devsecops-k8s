const fs = require('node:fs');

/**
 * Fixes: "Uploaded files not scanned for malware" (Tampering, PersistentVolume)
 *
 * Pluggable content scan run after a file lands on the PVC and before it is
 * marked "ready" for other users to download. Wire a real engine in by
 * setting CLAMAV_HOST/CLAMAV_PORT and installing `clamscan` (npm) — this
 * keeps the app functional in environments without ClamAV while making the
 * missing control explicit instead of silent.
 *
 * Returns { clean: boolean, reason?: string }
 */
async function scanFile(filePath) {
  if (!process.env.CLAMAV_HOST) {
    console.warn(
      `⚠️  Malware scanning is not configured (CLAMAV_HOST unset) — file ${filePath} was NOT scanned. ` +
        'Set CLAMAV_HOST/CLAMAV_PORT and add a ClamAV sidecar before handling untrusted uploads in production.'
    );
    return { clean: true, reason: 'scan-skipped-not-configured' };
  }

  try {
    // Optional dependency — only required when CLAMAV_HOST is actually set.
    const NodeClam = require('clamscan');
    const clamscan = await new NodeClam().init({
      clamdscan: { host: process.env.CLAMAV_HOST, port: Number.parseInt(process.env.CLAMAV_PORT) || 3310 },
    });
    const { isInfected, viruses } = await clamscan.isInfected(filePath);
    if (isInfected) {
      return { clean: false, reason: `infected: ${viruses.join(', ')}` };
    }
    return { clean: true };
  } catch (err) {
    console.error('Malware scan failed:', err.message);
    // Fail closed: if scanning is configured but errors, don't serve the file.
    return { clean: false, reason: `scan-error: ${err.message}` };
  }
}

module.exports = { scanFile };
