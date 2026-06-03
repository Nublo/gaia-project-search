import { execSync, spawnSync } from 'child_process';
import * as readline from 'readline';

/**
 * Returns true if a utun interface with an IPv4 address exists.
 * CyberGhost VPN creates such an interface when connected.
 */
function isVpnConnected(): boolean {
  try {
    const output = execSync('ifconfig', { encoding: 'utf8' });
    // CyberGhost VPN on macOS creates an ipsec interface when connected
    return /^ipsec\d+:.*UP/m.test(output);
  } catch {
    return false;
  }
}

function openCyberGhost(): void {
  spawnSync('open', ['-a', 'CyberGhost VPN'], { stdio: 'ignore' });
}

function prompt(question: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Ensures CyberGhost VPN is connected before proceeding.
 * - Interactive (TTY): opens the app and waits for the user to connect.
 * - Unattended (no TTY): logs and exits so the caller can retry later.
 */
export async function ensureVpnConnected(): Promise<void> {
  if (isVpnConnected()) {
    console.log('✅ VPN is connected.');
    return;
  }

  const interactive = process.stdin.isTTY;

  if (!interactive) {
    console.error('⚠️  VPN not connected (unattended mode). Aborting — will retry on next run.');
    process.exit(2);
  }

  console.log('⚠️  VPN not detected. Opening CyberGhost VPN...');
  openCyberGhost();
  console.log('   Please connect to a server in CyberGhost VPN.');
  await prompt('   Press Enter once connected to continue...');

  if (!isVpnConnected()) {
    console.error('❌ VPN still not detected. Aborting.');
    process.exit(1);
  }

  console.log('✅ VPN connected. Proceeding with collection.');
}
