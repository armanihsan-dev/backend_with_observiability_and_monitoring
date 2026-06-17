// This file is loaded via -r flag BEFORE app.ts
// It must remain synchronous and have no top-level await
require('dotenv').config();

const { initTracer } = require('./config/tracer');
initTracer();
