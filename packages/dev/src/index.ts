#!/usr/bin/env node
import 'source-map-support/register'

import { app } from './core'

import './commands/start'
import './commands/build'

app.parse()
