/**
 * @file audit
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const elliptic = require('elliptic');

const defaultEncryptAlgorithm = 'secp256k1';
const defaultEc = elliptic.ec(defaultEncryptAlgorithm);

const auditRules = {
  address: {
    type: 'string',
    required: true,
    validator(value) {
      AElf.utils.base58.decode(value);
    }
  },
  pubKey: {
    type: 'string',
    required: true,
    validator(value) {
      return defaultEc.keyFromPublic(value, 'hex');
    }
  },
  timestamp: {
    type: 'string',
    required: true
  },
  signature: {
    type: 'string',
    required: true
  }
};

function verify(msg, publicKey, signature = '') {
  const keyPair = defaultEc.keyFromPublic(publicKey, 'hex');
  const r = signature.slice(0, 64);
  const s = signature.slice(64, 128);
  const recoveryParam = signature.slice(128);
  const signatureObj = {
    r,
    s,
    recoveryParam
  };
  try {
    const result = keyPair.verify(msg, signatureObj);
    return result;
  } catch (e) {
    return false;
  }
}

module.exports = options => {
  return async function audit(ctx, next) {
    // const isLocal = ctx.app.config.env === 'local';
    const {
      address,
      signature,
      pubKey,
      timestamp
    } = ctx.request.query;
    if (address && signature) {
      try {
        ctx.app.validator.validate(auditRules, {
          address,
          signature,
          pubKey,
          timestamp
        });
        Object.entries(auditRules).forEach(([ key, rule ]) => {
          if (rule.validator) {
            rule.validator(ctx.request.query[key]);
          }
          return true;
        });
        const {
          expired = 300 * 1000 // s, 300秒
        } = options;
        const now = new Date().getTime();
        if (+timestamp >= now - expired && +timestamp <= now + expired) {
          ctx.isAudit = verify(+timestamp, pubKey, signature);
          await next();
        } else {
          ctx.isAudit = false;
          await next();
        }
      } catch (e) {
        ctx.isAudit = false;
        await next();
      }
    } else {
      ctx.isAudit = false;
      await next();
    }
  };
};
