const VaultPin = require('../models/VaultPin');
const sendResponse = require('../utils/response');

const requireVaultAuth = async (req, res, next) => {
      try {
            const userId = req.user._id;
            const pin = req.headers['x-vault-pin'];

            if (!pin) {
                  return sendResponse(res, 401, false, 'Vault PIN required (x-vault-pin header)');
            }

            const vaultPin = await VaultPin.findOne({ userId });
            if (!vaultPin) {
                  return sendResponse(res, 403, false, 'Vault PIN not set');
            }

            const isMatch = await vaultPin.matchPin(pin);
            if (!isMatch) {
                  return sendResponse(res, 401, false, 'Invalid Vault PIN');
            }

            next();
      } catch (error) {
            return sendResponse(res, 500, false, 'Error verifying vault PIN', null, { details: error.message });
      }
};

module.exports = requireVaultAuth;
