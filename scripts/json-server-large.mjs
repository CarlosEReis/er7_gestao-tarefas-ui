#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, isAbsolute, join } from 'node:path';
import { parseArgs } from 'node:util';
import { App } from '@tinyhttp/app';
import { cors } from '@tinyhttp/cors';
import { watch } from 'chokidar';
import JSON5 from 'json5';
import { Low } from 'lowdb';
import { DataFile, JSONFile } from 'lowdb/node';
import { json } from 'milliparsec';
import sirv from 'sirv';
import { NormalizedAdapter } from '../node_modules/json-server/lib/adapters/normalized-adapter.js';
import { Observer } from '../node_modules/json-server/lib/adapters/observer.js';
import { parseWhere } from '../node_modules/json-server/lib/parse-where.js';
import { isItem, Service } from '../node_modules/json-server/lib/service.js';

const RESERVED_QUERY_KEYS = new Set(['_sort', '_page', '_per_page', '_embed', '_where']);

function parseListParams(req) {
  const queryString = req.url.split('?')[1] ?? '';
  const params = new URLSearchParams(queryString);
  const filterParams = new URLSearchParams();

  for (const [key, value] of params.entries()) {
    if (!RESERVED_QUERY_KEYS.has(key)) {
      filterParams.append(key, value);
    }
  }

  let where = parseWhere(filterParams.toString());
  const rawWhere = params.get('_where');
  if (typeof rawWhere === 'string') {
    try {
      const parsed = JSON.parse(rawWhere);
      if (typeof parsed === 'object' && parsed !== null) {
        where = parsed;
      }
    } catch {
      // Keep parsed query params when _where is invalid.
    }
  }

  const page = params.get('_page');
  const perPage = params.get('_per_page');

  return {
    where,
    sort: params.get('_sort') ?? undefined,
    page: page === null ? undefined : Number.parseInt(page, 10),
    perPage: perPage === null ? undefined : Number.parseInt(perPage, 10),
    embed: req.query['_embed'],
  };
}

function list(service, name) {
  return (req, res, next) => {
    const { where, sort, page, perPage, embed } = parseListParams(req);
    res.locals['data'] = service.find(name, {
      where,
      sort,
      page: Number.isNaN(page) ? undefined : page,
      perPage: Number.isNaN(perPage) ? undefined : perPage,
      embed,
    });
    next?.();
  };
}

function findById(service, name) {
  return (req, res, next) => {
    const { id = '' } = req.params;
    res.locals['data'] = service.findById(name, id, req.query);
    next?.();
  };
}

function create(service, name) {
  return async (req, res, next) => {
    if (!isItem(req.body)) {
      res.status(400).json({ error: 'Body must be a JSON object' });
      return;
    }

    res.locals['data'] = await service.create(name, req.body);
    next?.();
  };
}

function updateById(service, name, patch = false) {
  return async (req, res, next) => {
    const { id = '' } = req.params;
    if (!isItem(req.body)) {
      res.status(400).json({ error: 'Body must be a JSON object' });
      return;
    }

    res.locals['data'] = patch
      ? await service.patchById(name, id, req.body)
      : await service.updateById(name, id, req.body);
    next?.();
  };
}

function destroyById(service, name) {
  return async (req, res, next) => {
    const { id = '' } = req.params;
    res.locals['data'] = await service.destroyById(name, id, req.query['_dependent']);
    next?.();
  };
}

function sendData(req, res) {
  const { data } = res.locals;
  if (data === undefined) {
    res.status(404).json({ error: 'Not Found' });
    return;
  }

  if (req.method === 'POST') {
    res.status(201);
  }
  res.json(data);
}

function collectionName(req) {
  return req.params.name ?? '';
}

function createApp(db, { payloadLimit, staticDirs }) {
  const service = new Service(db);
  const app = new App();

  app.use(sirv('public', { dev: true }));
  staticDirs
    .map((path) => (isAbsolute(path) ? path : join(process.cwd(), path)))
    .forEach((dir) => app.use(sirv(dir, { dev: true })));

  app
    .use((req, res, next) => (
      cors({
        allowedHeaders: req.headers['access-control-request-headers']
          ?.split(',')
          .map((header) => header.trim()),
      })(req, res, next)
    ))
    .options('*', cors());

  app.use(json({ payloadLimit }));

  app.get('/', (_req, res) => res.json(db.data));

  app.get('/tickets/arquivos', list(service, 'arquivos'));
  app.get('/tickets/arquivos/:id', findById(service, 'arquivos'));
  app.post('/tickets/arquivos', create(service, 'arquivos'));
  app.put('/tickets/arquivos/:id', updateById(service, 'arquivos'));
  app.patch('/tickets/arquivos/:id', updateById(service, 'arquivos', true));
  app.delete('/tickets/arquivos/:id', destroyById(service, 'arquivos'));
  app.use('/tickets/arquivos', sendData);

  app.get('/:name', (req, res, next) => list(service, collectionName(req))(req, res, next));
  app.get('/:name/:id', (req, res, next) => findById(service, collectionName(req))(req, res, next));
  app.post('/:name', (req, res, next) => create(service, collectionName(req))(req, res, next));
  app.put('/:name/:id', (req, res, next) => updateById(service, collectionName(req))(req, res, next));
  app.patch('/:name/:id', (req, res, next) => updateById(service, collectionName(req), true)(req, res, next));
  app.delete('/:name/:id', (req, res, next) => destroyById(service, collectionName(req))(req, res, next));

  app.use('/:name', sendData);

  return app;
}

const { values, positionals } = parseArgs({
  options: {
    port: { type: 'string', short: 'p', default: process.env['PORT'] ?? '3000' },
    host: { type: 'string', short: 'h', default: process.env['HOST'] ?? '127.0.0.1' },
    static: { type: 'string', short: 's', multiple: true, default: [] },
    limit: { type: 'string', short: 'l', default: process.env['JSON_SERVER_LIMIT'] ?? '52428800' },
  },
  allowPositionals: true,
});

const file = positionals[0] ?? 'db.json';
const port = Number.parseInt(values.port, 10);
const host = values.host;
const payloadLimit = Number.parseInt(values.limit, 10);

if (!existsSync(file)) {
  console.error(`File ${file} not found`);
  process.exit(1);
}

if (readFileSync(file, 'utf-8').trim() === '') {
  writeFileSync(file, '{}');
}

const adapter = extname(file) === '.json5'
  ? new DataFile(file, { parse: JSON5.parse, stringify: JSON5.stringify })
  : new JSONFile(file);
const observer = new Observer(new NormalizedAdapter(adapter));
const db = new Low(observer, {});
await db.read();

const app = createApp(db, {
  payloadLimit,
  staticDirs: values.static,
});

app.listen(port, () => {
  console.log(`JSON Server started on http://${host}:${port}`);
  console.log(`Payload limit: ${payloadLimit} bytes`);
  console.log('Endpoints:');
  console.log(`http://${host}:${port}/tickets`);
  console.log(`http://${host}:${port}/tickets/arquivos`);
  console.log(`http://${host}:${port}/arquivos`);
}, host);

let writing = false;
observer.onWriteStart = () => {
  writing = true;
};
observer.onWriteEnd = () => {
  writing = false;
};

watch(file).on('change', async () => {
  if (!writing) {
    await db.read();
  }
});
