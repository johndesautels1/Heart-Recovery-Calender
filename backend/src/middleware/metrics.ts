import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

export const metricsMiddleware = (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(client.register.metrics());
};