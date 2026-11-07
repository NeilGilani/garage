#!/usr/bin/env node
// Garage's bridge into Otto's toolbox: an ask_owner tool that pops a question up in the app
// and waits, as long as it takes, for the owner to answer. Speaks MCP over stdio.
import readline from 'node:readline';
import http from 'node:http';

const { GARAGE_URL = 'http://127.0.0.1:4777', GARAGE_SLUG } = process.env;

const TOOLS = [{
  name: 'ask_owner',
  description: 'Ask the business owner a question and wait for their answer. It pops up live in their workspace. ' +
    'Use it for decisions that are genuinely theirs (name direction, price, audience, tone, which of two paths). ' +
    'Give 2 to 4 short, concrete options; they can also type their own answer. Blocks until they answer.',
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'One clear question, under 140 characters.' },
      options: { type: 'array', items: { type: 'string' }, maxItems: 4, description: '2 to 4 short answer choices.' },
      why: { type: 'string', description: 'One short sentence on why you are asking.' },
    },
    required: ['question'],
  },
}];

function post(pathname, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(new URL(pathname, GARAGE_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) },
    }, res => {
      let s = '';
      res.setEncoding('utf8');
      res.on('data', c => { s += c; });
      res.on('end', () => { try { resolve(JSON.parse(s)); } catch { reject(new Error(s || 'Bad response')); } });
    });
    req.on('error', reject);
    req.end(data);
  });
}

const send = msg => process.stdout.write(JSON.stringify(msg) + '\n');

async function call(name, args) {
  if (name !== 'ask_owner') throw new Error(`Unknown tool ${name}`);
  const { answer } = await post(`/api/b/${GARAGE_SLUG}/ask`, args || {});
  return answer == null
    ? 'The owner did not answer (they may have stopped the run or stepped away). Make a reasonable call yourself and say what you chose.'
    : `The owner answered: ${answer}`;
}

readline.createInterface({ input: process.stdin }).on('line', async line => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const { id, method, params } = msg;
  if (id === undefined) return; // notifications
  try {
    if (method === 'initialize') {
      send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'garage', version: '0.1.0' } } });
    } else if (method === 'tools/list') {
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    } else if (method === 'tools/call') {
      const text = await call(params.name, params.arguments);
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
    } else {
      send({ jsonrpc: '2.0', id, result: {} });
    }
  } catch (e) {
    send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Couldn't reach the owner: ${e.message}` }], isError: true } });
  }
});
