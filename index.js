const crypto = require('crypto');
const process = require('process');
const { Datastore } = require('@google-cloud/datastore');
const H = require('./helpers');

// Test secrets
const QUID_API_SECRET = 'ks-CBX74QJJBPTJ21N4AGS3I0NXGFKD5B39';

// Entities
const E_JAR = 't-PennyJar';
const E_RECEIPT = 't-Receipt';

const datastore = new Datastore({ projectId: process.env.PROJECT_ID || 'sweartax' });

function validatePayment(receipt) {
  if (!receipt) return false;
  const payload = [receipt.id, receipt.userHash, receipt.merchantID, receipt.productID, receipt.currency, receipt.amount, receipt.tsUnix].join(',');

  // Hash secret
  const secret = crypto
    .createHash('SHA256')
    .update(process.env.QUID_API_SECRET || QUID_API_SECRET)
    .digest('base64');

  // Calculate signature of payload using secret
  const sig = crypto
    .createHmac('SHA256', secret)
    .update(payload)
    .digest('base64');

  return sig === receipt.sig;
}

async function createPennyJar({ who }) {
  const code = H.randomString(8);

  const jarEntity = {
    key: datastore.key([E_JAR, code]),
    data: {
      who,
      createdOn: Date.now(),
      amount: 0,
    },
  };

  // Saves the entity
  H.log(`Saving ${jarEntity.key.name}: ${jarEntity.data.origin} : ${code}`);
  return datastore.insert(jarEntity).then(() => H.makeSuccess({ code }));
}

async function lookupPennyJar({ code }) {
  const key = datastore.key([E_JAR, code]);
  const entity = await datastore.get(key);

  if (!entity || entity.length === 0 || !entity[0]) {
    return H.makeError('NOT_FOUND', 'Invalid code');
  }

  return H.makeSuccess(entity[0]);
}

async function donate({ code, receipt }) {
  console.log('Donation:', code, receipt);
  if (!validatePayment(receipt)) {
    return H.makeError('BAD_RECEIPT', 'Invalid receipt');
  }

  const amount = parseFloat(receipt.amount);
  const transaction = datastore.transaction();

  try {
    await transaction.run();
    const receiptKey = datastore.key([E_RECEIPT, receipt.id]);
    let results = await transaction.get(receiptKey);
    console.log(results);
    if (results && results.length > 0 && results[0] !== undefined) {
      throw new Error('RECEIPT_REUSED');
    }

    const key = datastore.key([E_JAR, code]);
    results = await transaction.get(key);
    if (!results || results.length === 0 || !results[0]) {
      throw new Error('NOT_FOUND');
    }

    const jar = results[0];
    jar.amount += amount;

    transaction.save([
      {
        key,
        data: jar,
      },
      {
        key: receiptKey,
        data: receipt,
      },
    ]);

    transaction.commit();
  } catch (err) {
    console.error('Error during donation:', err);
    transaction.rollback();
    return H.makeError('DONATE_ERROR', err);
  }

  return H.makeSuccess('ok');
}

function processCORS(req, res) {
  // CORS setup
  const origin = req.headers.origin || req.headers.referer;
  H.log(`${req.method}:${origin} ${req.originalUrl}`);

  // Send response to OPTIONS requests
  res.set('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Origin', origin);

  if (req.method === 'OPTIONS') {
    // 204 Success, no data
    res.status(204).send('');
    return false;
  }

  if (req.method !== 'POST') {
    return H.sendError(res, 403, 'SERVER_ERROR', `Bad request method: ${req.method}`);
  }

  return true;
}

exports.donate = async (req, res) => {
  if (!processCORS(req, res)) return {};

  // Body is already parsed (as JSON or whatever the content-type is) by cloud functions.
  const { code, receipt } = req.body;

  try {
    const result = await donate({ code, receipt });
    if (result.success) {
      return H.send(res, 200, result);
    }
    return H.send(res, 500, result);
  } catch (e) {
    return H.sendError(res, 500, 'EXCEPTION', e);
  }
};

exports.create = async (req, res) => {
  if (!processCORS(req, res)) return {};

  // Body is already parsed (as JSON or whatever the content-type is) by cloud functions.
  const { who } = req.body;

  try {
    const result = await createPennyJar({ who });
    if (result.success) {
      return H.send(res, 200, result);
    }
    return H.send(res, 500, result);
  } catch (e) {
    return H.sendError(res, 500, 'EXCEPTION', e);
  }
};

exports.lookup = async (req, res) => {
  if (!processCORS(req, res)) return {};

  // Body is already parsed (as JSON or whatever the content-type is) by cloud functions.
  const { code } = req.body;

  try {
    const result = await lookupPennyJar({ code });
    if (result.success) {
      return H.send(res, 200, result);
    }
    return H.send(res, 500, result);
  } catch (e) {
    return H.sendError(res, 500, 'EXCEPTION', e);
  }
};
