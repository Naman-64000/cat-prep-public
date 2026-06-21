import { PrismaClient } from '@prisma/client'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged

function getDatabaseUrl() {
  let dbPath: string
  if (isDev) {
    dbPath = path.join(app.getAppPath(), 'prisma', 'dev.db')
  } else {
    dbPath = path.join(app.getPath('userData'), 'dev.db')
  }

  // Ensure parent directory exists
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // In production, copy template database if it doesn't exist
  if (!isDev && !fs.existsSync(dbPath)) {
    const templatePath = path.join(app.getAppPath(), 'prisma', 'dev.db')
    if (fs.existsSync(templatePath)) {
      try {
        fs.copyFileSync(templatePath, dbPath)
      } catch (err) {
        console.error('Failed to copy database template to userData', err)
      }
    }
  }

  return `file:${dbPath}`
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl()
    }
  }
})

export async function initializePrisma() {
  try {
    await prisma.$connect()
  } catch (error) {
    console.error('Prisma initialization error', error)
    throw error
  }
}