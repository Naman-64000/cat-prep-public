import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { app, BrowserWindow, ipcMain, nativeTheme, shell, dialog } from 'electron'
import { initializePrisma, prisma } from './prisma'
import { saveQuestionImage, getImagesDirectory, saveNoteImage } from './storage'
import { setupGemini, setCustomGeminiKey, verifyGeminiKey } from './gemini'
import { QuestionCreateRequest, QuestionAddImagesRequest, StudyLogRequest } from './types'
import { autoUpdater } from 'electron-updater'

const isDev = !app.isPackaged

let activeUserId: string | null = null

// Password hashing helper utilities
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex')
}

const ENCRYPTION_KEY = crypto.scryptSync('cat-prep-vault-secret', 'salt-key-99', 32)
const IV_LENGTH = 16

function encryptText(text: string): string {
  if (!text) return ''
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decryptText(text: string): string {
  if (!text) return ''
  try {
    const parts = text.split(':')
    const iv = Buffer.from(parts.shift() || '', 'hex')
    const encryptedText = Buffer.from(parts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (err) {
    console.error('Failed to decrypt text:', err)
    return ''
  }
}

function getSettingsPath() {
  const isAppDev = !app.isPackaged
  if (isAppDev) {
    return path.join(app.getAppPath(), 'prisma', 'settings.json')
  } else {
    return path.join(app.getPath('userData'), 'settings.json')
  }
}

function loadSettings() {
  // Global settings fallbacks can still be parsed, but user keys take priority
  const settingsPath = getSettingsPath()
  if (fs.existsSync(settingsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      if (data.geminiApiKey && !activeUserId) {
        setCustomGeminiKey(data.geminiApiKey)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }
}

function getSessionPath() {
  const isAppDev = !app.isPackaged
  if (isAppDev) {
    return path.join(app.getAppPath(), 'prisma', 'session.json')
  } else {
    return path.join(app.getPath('userData'), 'session.json')
  }
}

function saveSession(userId: string, rememberMe: boolean) {
  const sessionPath = getSessionPath()
  if (rememberMe) {
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days (industry standard for "Remember me")
    try {
      fs.writeFileSync(sessionPath, JSON.stringify({ userId, expiresAt, rememberMe }), 'utf8')
    } catch (err) {
      console.error('Failed to save session file:', err)
    }
  } else {
    if (fs.existsSync(sessionPath)) {
      try {
        fs.unlinkSync(sessionPath)
      } catch (err) {
        // ignore
      }
    }
  }
}

function loadPersistedSession() {
  const sessionPath = getSessionPath()
  if (fs.existsSync(sessionPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionPath, 'utf8'))
      if (data.userId && data.expiresAt) {
        if (Date.now() < data.expiresAt) {
          activeUserId = data.userId
          return
        }
      }
      fs.unlinkSync(sessionPath)
    } catch (err) {
      console.error('Failed to load session:', err)
    }
  }
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    icon: path.join(__dirname, '../renderer/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  const indexPath = isDev
    ? path.join(__dirname, '../renderer/index.html')
    : path.join(__dirname, '../renderer/index.html')

  await mainWindow.loadFile(indexPath)
}

app.whenReady().then(async () => {
  await initializePrisma()
  loadPersistedSession()
  loadSettings()
  setupGemini()
  createWindow()

  // Run auto-update check in production
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('Failed to check for updates:', err)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/* ==========================================================================
   AUTHENTICATION HANDLERS
   ========================================================================== */

ipcMain.handle('auth:signup', async (_event, payload: { email: string; password: string; rememberMe?: boolean }) => {
  try {
    const email = payload.email.trim().toLowerCase()
    if (!email || !payload.password) {
      throw new Error('Email and password are required.')
    }
    if (payload.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.')
    }
    
    const existing = await prisma.user.findUnique({ where: { id: email } })
    if (existing) {
      throw new Error('Email already registered. Please sign in.')
    }

    const salt = generateSalt()
    const passwordHash = hashPassword(payload.password, salt)

    const user = await prisma.user.create({
      data: {
        id: email,
        password: passwordHash,
        salt: salt
      }
    })

    activeUserId = user.id
    setCustomGeminiKey(user.geminiApiKey ? decryptText(user.geminiApiKey) : '')

    saveSession(user.id, !!payload.rememberMe)

    return { success: true, user: { id: user.id, email: user.id } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('auth:signin', async (_event, payload: { email: string; password: string; rememberMe?: boolean }) => {
  try {
    const email = payload.email.trim().toLowerCase()
    if (!email || !payload.password) {
      throw new Error('Email and password are required.')
    }

    const user = await prisma.user.findUnique({ where: { id: email } })
    if (!user) {
      throw new Error('Email has not been registered. Try creating an account.')
    }

    const passwordHash = hashPassword(payload.password, user.salt)
    if (passwordHash !== user.password) {
      throw new Error('incorrect password. Please try again.')
    }

    activeUserId = user.id
    setCustomGeminiKey(user.geminiApiKey ? decryptText(user.geminiApiKey) : '')

    saveSession(user.id, !!payload.rememberMe)

    return { success: true, user: { id: user.id, email: user.id } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('auth:signout', async () => {
  activeUserId = null
  setCustomGeminiKey('')
  const sessionPath = getSessionPath()
  if (fs.existsSync(sessionPath)) {
    try {
      fs.unlinkSync(sessionPath)
    } catch (err) {
      // ignore
    }
  }
  return { success: true }
})

ipcMain.handle('auth:currentUser', async () => {
  try {
    if (!activeUserId) {
      loadPersistedSession()
    }
    if (!activeUserId) {
      return { success: true, user: null }
    }
    const user = await prisma.user.findUnique({ where: { id: activeUserId } })
    if (!user) {
      activeUserId = null
      const sessionPath = getSessionPath()
      if (fs.existsSync(sessionPath)) {
        try { fs.unlinkSync(sessionPath) } catch {}
      }
      return { success: true, user: null }
    }
    
    // Propagate key on session load
    setCustomGeminiKey(user.geminiApiKey ? decryptText(user.geminiApiKey) : '')

    return { success: true, user: { id: user.id, email: user.id } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/* ==========================================================================
   SETTINGS HANDLERS (SCOPED TO ACTIVE USER)
   ========================================================================== */

ipcMain.handle('settings:get', async () => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized: No active user session.')
    }
    const user = await prisma.user.findUnique({ where: { id: activeUserId } })
    return { success: true, settings: { geminiApiKey: user?.geminiApiKey ? decryptText(user.geminiApiKey) : '' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('settings:save', async (_event, apiKey: string) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized: No active user session.')
    }
    const trimmedKey = apiKey.trim()
    const encryptedKey = encryptText(trimmedKey)
    await prisma.user.update({
      where: { id: activeUserId },
      data: { geminiApiKey: encryptedKey }
    })
    
    // Propagate key
    setCustomGeminiKey(trimmedKey)
    
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('settings:verifyKey', async (_event, apiKey: string) => {
  try {
    const isValid = await verifyGeminiKey(apiKey)
    return { success: isValid }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/* ==========================================================================
   QUESTION HANDLERS (SCOPED TO ACTIVE USER)
   ========================================================================== */

ipcMain.handle('question:create', async (_event, payload: QuestionCreateRequest) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized: No active user session.')
    }
    const imagePaths = [] as string[]
    for (const file of payload.imageFiles) {
      const buffer = Buffer.from(file.imageBuffer)
      const saved = await saveQuestionImage(buffer, file.fileName, activeUserId)
      imagePaths.push(saved)
    }
    const question = await prisma.question.create({
      data: {
        section: payload.section,
        solution: null,
        userId: activeUserId,
        images: {
          createMany: {
            data: imagePaths.map((imagePath) => ({ path: imagePath }))
          }
        }
      },
      include: { images: true }
    })
    return {
      success: true,
      question: {
        ...question,
        imagePaths: question.images.map((image) => image.path)
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('question:addImages', async (_event, payload: QuestionAddImagesRequest) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized: No active user session.')
    }
    const question = await prisma.question.findUnique({
      where: { id: payload.questionId },
      include: { images: true }
    })
    if (!question || question.userId !== activeUserId) {
      throw new Error('Question not found or unauthorized.')
    }

    const limits = { VARC: 6, LRDI: 6, QUANTS: 1 } as Record<string, number>
    const maxFiles = limits[question.section] || 1
    const currentCount = question.images.length
    const newCount = currentCount + payload.imageFiles.length
    if (newCount > maxFiles) {
      throw new Error(`Adding these images would exceed the limit of ${maxFiles} images for ${question.section}.`)
    }

    const imagePaths = [] as string[]
    for (const file of payload.imageFiles) {
      const buffer = Buffer.from(file.imageBuffer)
      const saved = await saveQuestionImage(buffer, file.fileName, activeUserId)
      imagePaths.push(saved)
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: payload.questionId },
      data: {
        images: {
          createMany: {
            data: imagePaths.map((imagePath) => ({ path: imagePath }))
          }
        }
      },
      include: { images: true }
    })

    return {
      success: true,
      question: {
        ...updatedQuestion,
        imagePaths: updatedQuestion.images.map((image) => image.path)
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('question:list', async (_event, section: string) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized: No active user session.')
    }
    const questions = await prisma.question.findMany({
      where: { section, userId: activeUserId },
      orderBy: { createdAt: 'asc' },
      include: { images: true }
    })
    return {
      success: true,
      questions: questions.map((question) => ({
        ...question,
        imagePaths: question.images.map((image) => image.path)
      }))
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('question:generateSolution', async (_event, questionId: number, regenerate?: boolean) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized: No active user session.')
    }
    const question = await prisma.question.findFirst({
      where: { id: questionId, userId: activeUserId },
      include: { images: true }
    })
    if (!question) {
      throw new Error('Question not found')
    }

    const currentCount = question.generationCount || 0
    if (currentCount >= 2) {
      throw new Error('You can only generate a solution 2 times in total for a single question.')
    }

    if (!regenerate && question.solution) {
      return {
        success: true,
        solution: question.solution,
        predictedSection: undefined,
        question: {
          ...question,
          imagePaths: question.images.map((image) => image.path)
        }
      }
    }

    const imagePaths = question.images.map((image) => image.path)
    const isRegenerate = !!regenerate
    const { solution, predictedSection, subtopic, topic } = await setupGemini().requestSolution(question.section, imagePaths, isRegenerate)
    const formattedSolution = solution ? solution.replace(/(?<!\n)\n(?!\n)/g, '\n\n') : solution

    const updateData: any = {
      solution: formattedSolution,
      generationCount: currentCount + 1
    }
    if (subtopic) updateData.subtopic = subtopic
    if (topic) updateData.topic = topic

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
      include: { images: true }
    })
    return {
      success: true,
      solution: updated.solution,
      predictedSection,
      question: {
        ...updated,
        imagePaths: updated.images.map((image) => image.path)
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('question:bookmark', async (_event, questionId: number, bookmarked: boolean) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const exists = await prisma.question.findFirst({
      where: { id: questionId, userId: activeUserId }
    })
    if (!exists) {
      throw new Error('Question not found or unauthorized')
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: { bookmarked },
      include: { images: true }
    })
    return {
      success: true,
      question: {
        ...updated,
        imagePaths: updated.images.map((image) => image.path)
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('question:moveSection', async (_event, questionId: number, section: string) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const exists = await prisma.question.findFirst({
      where: { id: questionId, userId: activeUserId }
    })
    if (!exists) {
      throw new Error('Question not found or unauthorized')
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: { section },
      include: { images: true }
    })
    return {
      success: true,
      question: {
        ...updated,
        imagePaths: updated.images.map((image) => image.path)
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('question:updateNotes', async (_event, questionId: number, notes: string, flairs: string) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const exists = await prisma.question.findFirst({
      where: { id: questionId, userId: activeUserId }
    })
    if (!exists) {
      throw new Error('Question not found or unauthorized')
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: { notes, flairs },
      include: { images: true }
    })
    return {
      success: true,
      question: {
        ...updated,
        imagePaths: updated.images.map((image) => image.path)
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('question:updateTopic', async (_event, questionId: number, subtopic: string, topic: string) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const exists = await prisma.question.findFirst({
      where: { id: questionId, userId: activeUserId }
    })
    if (!exists) {
      throw new Error('Question not found or unauthorized')
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: { subtopic, topic },
      include: { images: true }
    })
    return {
      success: true,
      question: {
        ...updated,
        imagePaths: updated.images.map((image) => image.path)
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('question:delete', async (_event, questionId: number) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const question = await prisma.question.findFirst({
      where: { id: questionId, userId: activeUserId },
      include: { images: true }
    })
    if (!question) {
      throw new Error('Question not found')
    }
    for (const image of question.images) {
      if (fs.existsSync(image.path)) {
        try {
          fs.unlinkSync(image.path)
        } catch {
          // ignore failure to remove image file, but still delete record
        }
      }
    }
    await prisma.question.delete({ where: { id: questionId } })
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/* ==========================================================================
   STUDY LOG HANDLERS (SCOPED TO ACTIVE USER)
   ========================================================================== */

ipcMain.handle('study:save', async (_event, payload: StudyLogRequest) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    if (payload.hours < 0 || payload.minutes < 0 || payload.minutes > 59) {
      throw new Error('Invalid hours or minutes. Minutes must be between 0 and 59.')
    }
    if (payload.hours > 24 || (payload.hours === 24 && payload.minutes > 0)) {
      throw new Error('Study time cannot exceed 24 hours for a single day.')
    }
    if (!payload.section || !['VARC', 'DILR', 'QUANTS', 'ALL'].includes(payload.section)) {
      throw new Error('Please select a valid study section.')
    }
    if (!payload.tag || !payload.tag.trim()) {
      throw new Error('Please select a topic tag.')
    }
    const dateObj = new Date(payload.date)
    const created = await prisma.studyLog.create({
      data: {
        date: dateObj,
        hours: payload.hours,
        minutes: payload.minutes,
        section: payload.section,
        tag: payload.tag.trim(),
        note: payload.note || '',
        userId: activeUserId
      }
    })
    return { success: true, studyLog: created }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('study:delete', async (_event, id: number) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const exists = await prisma.studyLog.findFirst({
      where: { id, userId: activeUserId }
    })
    if (!exists) {
      throw new Error('Study record not found or unauthorized')
    }

    await prisma.studyLog.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('study:list', async () => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const records = await prisma.studyLog.findMany({
      where: { userId: activeUserId },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    })
    return { success: true, records }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/* ==========================================================================
   ANALYTICS & UTILITIES (SCOPED TO ACTIVE USER)
   ========================================================================== */

ipcMain.handle('app:getAnalytics', async () => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const allQuestions = await prisma.question.findMany({
      where: { userId: activeUserId },
      select: {
        section: true,
        subtopic: true,
        topic: true,
        flairs: true
      }
    })

    let totalQuestions = allQuestions.length
    let varcQuestions = 0
    let lrdiQuestions = 0
    let quantsQuestions = 0

    const flairCounts: Record<string, number> = {}
    const distribution: Record<string, Record<string, Record<string, number>>> = {
      VARC: {},
      LRDI: {},
      QUANTS: {}
    }

    for (const q of allQuestions) {
      const sec = q.section
      if (sec === 'VARC') varcQuestions++
      else if (sec === 'LRDI') lrdiQuestions++
      else if (sec === 'QUANTS') quantsQuestions++

      // Flairs aggregation
      if (q.flairs) {
        const split = q.flairs.split(',').filter(Boolean)
        for (const f of split) {
          flairCounts[f] = (flairCounts[f] || 0) + 1
        }
      }

      // Distribution aggregation
      if (distribution[sec] !== undefined) {
        const sub = q.subtopic || 'Unassigned'
        if (!distribution[sec][sub]) {
          distribution[sec][sub] = {}
        }
        const top = q.topic || 'Unassigned'
        distribution[sec][sub][top] = (distribution[sec][sub][top] || 0) + 1
      }
    }

    const sortedFlairs = Object.entries(flairCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const studyLogs = await prisma.studyLog.findMany({
      where: { userId: activeUserId }
    })
    let hoursAll = 0
    let hoursVarc = 0
    let hoursLrdi = 0
    let hoursQuants = 0

    for (const log of studyLogs) {
      const duration = log.hours + log.minutes / 60
      if (log.section === 'ALL') {
        hoursAll += duration
      } else if (log.section === 'VARC') {
        hoursVarc += duration
      } else if (log.section === 'DILR' || log.section === 'LRDI') {
        hoursLrdi += duration
      } else if (log.section === 'QUANTS') {
        hoursQuants += duration
      }
    }

    return {
      success: true,
      data: {
        questions: {
          total: totalQuestions,
          varc: varcQuestions,
          lrdi: lrdiQuestions,
          quants: quantsQuestions,
          distribution
        },
        topFlairs: sortedFlairs,
        studyHours: {
          all: Number(hoursAll.toFixed(1)),
          varc: Number(hoursVarc.toFixed(1)),
          lrdi: Number(hoursLrdi.toFixed(1)),
          quants: Number(hoursQuants.toFixed(1))
        }
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('app:getImagesPath', () => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    return { success: true, path: getImagesDirectory(activeUserId) }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('app:getTheme', () => {
  return { success: true, theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light' }
})

ipcMain.handle('app:selectImages', async () => {
  try {
    let defaultPath = ''
    if (process.platform === 'darwin') {
      try {
        const result = execSync('defaults read com.apple.screencapture location', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim()
        if (result) {
          defaultPath = result.replace(/^~/, os.homedir())
        }
      } catch {
        // ignored
      }
      if (!defaultPath || !fs.existsSync(defaultPath)) {
        defaultPath = path.join(os.homedir(), 'Desktop')
      }
    } else if (process.platform === 'win32') {
      defaultPath = path.join(os.homedir(), 'Pictures', 'Screenshots')
      if (!fs.existsSync(defaultPath)) {
        defaultPath = path.join(os.homedir(), 'Pictures')
      }
    } else {
      defaultPath = path.join(os.homedir(), 'Pictures')
    }

    if (!fs.existsSync(defaultPath)) {
      defaultPath = os.homedir()
    }

    const result = await dialog.showOpenDialog({
      title: 'Select Question Images',
      defaultPath,
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
      ]
    })

    if (result.canceled) {
      return { success: false, cancelled: true }
    }

    const files = await Promise.all(
      result.filePaths.map(async (filePath) => {
        const buffer = await fs.promises.readFile(filePath)
        const name = path.basename(filePath)
        let mimeType = 'image/png'
        const ext = path.extname(filePath).toLowerCase()
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg'
        else if (ext === '.webp') mimeType = 'image/webp'
        
        return {
          name,
          buffer: new Uint8Array(buffer),
          mimeType
        }
      })
    )

    return { success: true, files }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/* ==========================================================================
   REPORT CARD HANDLERS (SCOPED TO ACTIVE USER)
   ========================================================================== */

ipcMain.handle('report:list', async () => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const reports = await prisma.reportCard.findMany({
      where: { userId: activeUserId },
      orderBy: { createdAt: 'asc' }
    })
    return {
      success: true,
      reports: reports.map(r => ({
        id: r.id,
        name: r.name,
        paperType: r.paperType,
        sectionalType: r.sectionalType,
        varcTotalQs: r.varcTotalQs,
        dilrTotalQs: r.dilrTotalQs,
        qaTotalQs: r.qaTotalQs,
        varcRows: JSON.parse(r.varcRows),
        dilrRows: JSON.parse(r.dilrRows),
        qaRows: JSON.parse(r.qaRows),
        totalAttempted: r.totalAttempted,
        totalCorrect: r.totalCorrect,
        totalIncorrect: r.totalIncorrect,
        marks: r.marks
      }))
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('report:save', async (_event, payload: any) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const report = await prisma.reportCard.upsert({
      where: { id: payload.id },
      update: {
        name: payload.name,
        paperType: payload.paperType,
        sectionalType: payload.sectionalType,
        varcTotalQs: payload.varcTotalQs,
        dilrTotalQs: payload.dilrTotalQs,
        qaTotalQs: payload.qaTotalQs,
        varcRows: JSON.stringify(payload.varcRows),
        dilrRows: JSON.stringify(payload.dilrRows),
        qaRows: JSON.stringify(payload.qaRows),
        totalAttempted: payload.totalAttempted || 0,
        totalCorrect: payload.totalCorrect || 0,
        totalIncorrect: payload.totalIncorrect || 0,
        marks: payload.marks || 0
      },
      create: {
        id: payload.id,
        name: payload.name,
        paperType: payload.paperType,
        sectionalType: payload.sectionalType,
        varcTotalQs: payload.varcTotalQs,
        dilrTotalQs: payload.dilrTotalQs,
        qaTotalQs: payload.qaTotalQs,
        varcRows: JSON.stringify(payload.varcRows),
        dilrRows: JSON.stringify(payload.dilrRows),
        qaRows: JSON.stringify(payload.qaRows),
        totalAttempted: payload.totalAttempted || 0,
        totalCorrect: payload.totalCorrect || 0,
        totalIncorrect: payload.totalIncorrect || 0,
        marks: payload.marks || 0,
        userId: activeUserId
      }
    })
    return { success: true, report }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('report:delete', async (_event, id: string) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const exists = await prisma.reportCard.findFirst({
      where: { id, userId: activeUserId }
    })
    if (!exists) {
      throw new Error('Report card not found or unauthorized')
    }

    await prisma.reportCard.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/* ==========================================================================
   SUGGESTION HANDLERS
   ========================================================================== */

ipcMain.handle('suggestion:send', async (_event, payload: { text: string }) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const text = payload.text ? payload.text.trim() : ''
    if (!text) {
      throw new Error('Suggestion text is required.')
    }
    if (text.length > 500) {
      throw new Error('Suggestion cannot exceed 500 characters.')
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentSuggestion = await prisma.suggestion.findFirst({
      where: {
        userId: activeUserId,
        createdAt: {
          gte: oneHourAgo
        }
      }
    })

    if (recentSuggestion) {
      return { 
        success: false, 
        rateLimited: true, 
        error: 'You have already sent a suggestion. You can send more suggestions after 1 hour.' 
      }
    }

    await prisma.suggestion.create({
      data: {
        text,
        userId: activeUserId
      }
    })

    // Background submit to Google Forms if configured
    const formUrl = process.env.SUGGESTION_FORM_URL
    const textEntryId = process.env.SUGGESTION_FORM_ENTRY_TEXT
    const emailEntryId = process.env.SUGGESTION_FORM_ENTRY_EMAIL

    if (formUrl && textEntryId) {
      try {
        const bodyParams = new URLSearchParams()
        bodyParams.append(textEntryId, text)
        if (emailEntryId) {
          bodyParams.append(emailEntryId, activeUserId)
        }

        // We run this asynchronously without holding up the UI response
        fetch(formUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: bodyParams.toString()
        }).catch((err) => {
          console.error('Failed to submit suggestion to Google Form:', err)
        })
      } catch (netErr) {
        console.error('Failed to prepare Google Form payload:', netErr)
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

/* ==========================================================================
   NOTE HANDLERS (SCOPED TO ACTIVE USER)
   ========================================================================== */

ipcMain.handle('note:list', async () => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const notes = await prisma.note.findMany({
      where: { userId: activeUserId },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    })
    return { success: true, notes }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('note:save', async (_event, payload: any) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const { id, title, content, section, subtopic, topic, isPinned } = payload

    let note
    if (id) {
      // Update
      note = await prisma.note.update({
        where: { id: Number(id), userId: activeUserId },
        data: {
          title,
          content,
          section,
          subtopic: subtopic || '',
          topic: topic || '',
          isPinned: !!isPinned
        }
      })
    } else {
      // Create
      note = await prisma.note.create({
        data: {
          title,
          content,
          section,
          subtopic: subtopic || '',
          topic: topic || '',
          isPinned: !!isPinned,
          userId: activeUserId
        }
      })
    }

    return { success: true, note }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('note:delete', async (_event, id: number) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    await prisma.note.delete({
      where: { id: Number(id), userId: activeUserId }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('note:uploadImage', async (_event, payload: { imageBuffer: Uint8Array; fileName: string }) => {
  try {
    if (!activeUserId) {
      throw new Error('Unauthorized')
    }
    const buffer = Buffer.from(payload.imageBuffer)
    const absolutePath = await saveNoteImage(buffer, payload.fileName, activeUserId)
    
    // Normalize and return file:// url
    const normalized = absolutePath.replace(/\\/g, '/')
    const fileUrl = normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
    
    return { success: true, url: fileUrl }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})


