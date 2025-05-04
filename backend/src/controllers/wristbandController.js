/*
 * File Path: backend/src/controllers/wristbandController.js
 * Purpose: Verifies ALL Token contract for wristband tasks in Allur Space Console.
 * How It Works:
 *   - Uses web3.js to interact with the ALL Token contract (0x732bd2988098244fe6133dfd304216764f1f088e).
 *   - Validates contract address and balance for wristband transactions.
 *   - Logs verification to idurar_db.logs and ERROR_LOG.md.
 * Mechanics:
 *   - `verifyALLToken`: Checks contract address, retrieves balance, validates functionality.
 *   - Supports retries for Ethereum node connectivity issues.
 *   - Integrates with programManager.js for wristband task processing.
 * Dependencies:
 *   - web3@4.7.0: Ethereum blockchain interaction.
 *   - logUtils.js: MongoDB logging.
 *   - fileUtils.js: Error logging to ERROR_LOG.md.
 * Dependents:
 *   - programManager.js: Calls verifyALLToken for wristband tasks.
 * Why It’s Here:
 *   - Verifies ALL Token contract, addressing issue #47 (User, 05/01/2025).
 * Change Log:
 *   - 05/02/2025: Created with web3.js for ALL Token verification (Grok).
 *   - 05/08/2025: Fixed TypeError: Web3 is not a constructor (Grok).
 *     - Why: Incorrect web3 initialization caused startup error (User, 05/02/2025).
 *     - How: Updated import to Web3.Web3, added error handling for ETH_NODE_URL.
 *     - Test: Run npm start, POST /api/grok/edit with wristband task, verify balance.
 * Test Instructions:
 *   - Run `npm start`, call verifyALLToken with mock wallet address.
 *   - Verify idurar_db.logs shows "ALL Token contract verified" with balance.
 *   - Check ERROR_LOG.md for any verification errors.
 *   - Integrate with programManager.js, submit wristband task, confirm token verification.
 * Rollback Instructions:
 *   - Delete wristbandController.js (`rm backend/src/controllers/wristbandController.js`).
 *   - Update programManager.js to skip ALL Token verification.
 *   - Verify wristband tasks process without token checks.
 * Future Enhancements:
 *   - Add transaction support for wristbands (Sprint 4).
 *   - Integrate with CRM for user wallet management (Sprint 3).
 */

const Web3 = require('web3').Web3; // Correct import for web3@4.7.0
const { logInfo, logError } = require('../utils/logUtils');
const { appendLog, errorLogPath } = require('../utils/fileUtils');

// Validate ETH_NODE_URL
const ETH_NODE_URL = process.env.ETH_NODE_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
if (!ETH_NODE_URL.includes('infura.io') && !ETH_NODE_URL.includes('alchemy.com')) {
  console.warn('wristbandController: ETH_NODE_URL may be invalid. Using fallback Infura URL.');
}

const web3 = new Web3(ETH_NODE_URL);
const ALL_TOKEN_ADDRESS = '0x732bd2988098244fe6133dfd304216764f1f088e';
const ALL_TOKEN_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
];

const contract = new web3.eth.Contract(ALL_TOKEN_ABI, ALL_TOKEN_ADDRESS);

/**
 * Verifies ALL Token contract and balance for a wallet.
 * @param {string} walletAddress - Wallet address to check balance.
 * @returns {Promise<Object>} Verification result with balance.
 */
async function verifyALLToken(walletAddress) {
  if (!web3.utils.isAddress(walletAddress)) {
    await logError('Invalid wallet address', 'wristbandController', {
      walletAddress,
      timestamp: new Date().toISOString(),
    });
    throw new Error('Invalid wallet address');
  }

  let attempt = 0;
  const maxAttempts = 3;
  while (attempt < maxAttempts) {
    try {
      // Verify contract address
      const code = await web3.eth.getCode(ALL_TOKEN_ADDRESS);
      if (code === '0x') {
        throw new Error('Invalid contract address: No code found');
      }

      // Get balance
      const balance = await contract.methods.balanceOf(walletAddress).call();
      const balanceInEther = web3.utils.fromWei(balance, 'ether');

      await logInfo('ALL Token contract verified', 'wristbandController', {
        walletAddress,
        contractAddress: ALL_TOKEN_ADDRESS,
        balance: balanceInEther,
        timestamp: new Date().toISOString(),
      });
      await appendLog(errorLogPath, `# ALL Token Verification\nWallet: ${walletAddress}\nContract: ${ALL_TOKEN_ADDRESS}\nBalance: ${balanceInEther} ALL`);

      return { success: true, balance: balanceInEther };
    } catch (err) {
      attempt++;
      await logError(`ALL Token verification attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'wristbandController', {
        walletAddress,
        contractAddress: ALL_TOKEN_ADDRESS,
        stack: err.stack,
        attempt,
        timestamp: new Date().toISOString(),
      });
      if (attempt >= maxAttempts) {
        await appendLog(errorLogPath, `# ALL Token Verification Error\nWallet: ${walletAddress}\nContract: ${ALL_TOKEN_ADDRESS}\nError: ${err.message}\nStack: ${err.stack}`);
        throw new Error(`ALL Token verification failed after ${maxAttempts} attempts: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
}

module.exports = { verifyALLToken };
