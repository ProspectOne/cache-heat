const https = require('https');

const fetch = async (url, method) => {
  method = method || 'GET';

  const options = { method };

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, function (res) {
      res.setEncoding('utf8');

      if (method === 'HEAD') {
        return resolve(res.headers)
      }

      res.on('data', function (chunk) {
        resolve(chunk);
      });
    });

    req.on('error', function (e) {
      reject(e);
    });

    req.end();
  });
};

const splitByBatches = (array, size) => {
  const chunked = [];

  for (let i = 0, j = array.length; i < j; i += size) {
    chunked.push(array.slice(i, i + size));
  }

  return chunked;
};

const initSingleHeater = (config) => {
  const { name, interval, batch, urls } = config;
  const handler = async () => {
    const batches = splitByBatches(urls, batch);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      console.log(`[${name}] start processing bath ${i + 1}`);
      await Promise.all(batch.map(url => new Promise(resolve => {
        const start = new Date();
        fetch(`${url}?t=${Date.now()}`, 'HEAD').then(res => {
          console.log(`[${name}][${url}] fetching took ${new Date() - start}ms`);
          resolve(res);
        });
      })));
      console.log(`[${name}] batch processed`);
    }

    console.log(`[${name}] wait for the next tick`)
  };

  console.log(`[${name}] set heating interval to ${interval}ms`);
  handler();
  setInterval(handler, interval)
};

(async () => {
  const sourcesUrl = process.env.SOURCES_URL;

  if (!sourcesUrl) throw new Error('Please set SOURCES_URL env variable with the link to json config');

  const sources = JSON.parse(await fetch(sourcesUrl, 'GET'));

  console.log('initialize heater');

  for (const source of sources) {
    initSingleHeater(source);
  }
})();
