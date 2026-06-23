import { PrismaClient } from '../../prisma/generated/client'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

const isDev = !app.isPackaged

function getDatabaseUrl() {
  let dbPath: string
  if (isDev) {
    dbPath = path.join(app.getAppPath(), 'prisma', 'public.db')
  } else {
    dbPath = path.join(app.getPath('userData'), 'public.db')
  }

  // Ensure parent directory exists
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // In production, copy template database if it doesn't exist
  if (!isDev && !fs.existsSync(dbPath)) {
    const templatePath = path.join(app.getAppPath(), 'prisma', 'public.db')
    if (fs.existsSync(templatePath)) {
      try {
        fs.copyFileSync(templatePath, dbPath)
      } catch (err) {
        console.error('Failed to copy database template to userData', err)
      }
    }
  }

  return `file:${dbPath.replace(/\\/g, '/')}`
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

    // Ensure schema is updated for existing database files

    try {
      // 2. Create Suggestion table if not exists
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Suggestion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          userId TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
        )
      `)
      console.log('Successfully checked/created Suggestion table')
    } catch (err) {
      console.error('Failed to check/create Suggestion table:', err)
    }

    try {
      // 3. Check if column generationCount exists in Question
      const tableInfo: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(Question)`)
      const hasGenerationCount = tableInfo.some((col: any) => col.name === 'generationCount')
      if (!hasGenerationCount) {
        await prisma.$executeRawUnsafe(`ALTER TABLE Question ADD COLUMN generationCount INTEGER NOT NULL DEFAULT 0`)
        console.log('Successfully added generationCount column to Question table')
      }
    } catch (err) {
      console.error('Failed to check/add generationCount column:', err)
    }
  } catch (error) {
    console.error('Prisma initialization error', error)
    throw error
  }
}