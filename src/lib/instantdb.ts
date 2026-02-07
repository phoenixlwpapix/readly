'use client'

import { init } from '@instantdb/react'
import schema from '@/instant.schema'

const APP_ID = '08487724-c21a-4b32-bfbd-d6db9fb3072b'

export const db = init({ appId: APP_ID, schema })
