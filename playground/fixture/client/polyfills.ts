import WebSocket = require('ws')
import { install } from 'source-map-support'

Object.assign(global, { WebSocket })
install({ hookRequire: true })
