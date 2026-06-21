import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { app, BrowserWindow, ipcMain, nativeTheme, shell, dialog } from 'electron'
import { initializePrisma, prisma } from './prisma'
import { saveQuestionImage, getImagesDirectory } from './storage'
import { generateSolutionForQuestion, setupGemini, setCustomGeminiKey, verifyGeminiKey } from './gemini'
import { QuestionCreateRequest, StudyLogRequest } from './types'

const isDev = process.env.NODE_ENV !== 'production'

function getSettingsPath() {
  const isAppDev = process.env.NODE_ENV !== 'production' || !app.isPackaged
  if (isAppDev) {
    return path.join(app.getAppPath(), 'prisma', 'settings.json')
  } else {
    return path.join(app.getPath('userData'), 'settings.json')
  }
}

function loadSettings() {
  const settingsPath = getSettingsPath()
  if (fs.existsSync(settingsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      if (data.geminiApiKey) {
        setCustomGeminiKey(data.geminiApiKey)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
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
  loadSettings()
  setupGemini()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

ipcMain.handle('settings:get', async () => {
  try {
    const settingsPath = getSettingsPath()
    let settings = { geminiApiKey: '' }
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    }
    return { success: true, settings }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('settings:save', async (_event, apiKey: string) => {
  try {
    const settingsPath = getSettingsPath()
    const dir = path.dirname(settingsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    let settings = { geminiApiKey: '' }
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      } catch {
        // ignore malformed file
      }
    }
    
    settings.geminiApiKey = apiKey.trim()
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
    
    // Propagate key
    setCustomGeminiKey(apiKey)
    
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('question:create', async (_event, payload: QuestionCreateRequest) => {
  try {
    const imagePaths = [] as string[]
    for (const file of payload.imageFiles) {
      const buffer = Buffer.from(file.imageBuffer)
      const saved = await saveQuestionImage(buffer, file.fileName)
      imagePaths.push(saved)
    }
    const question = await prisma.question.create({
      data: {
        section: payload.section,
        solution: null,
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

ipcMain.handle('question:list', async (_event, section: string) => {
  try {
    const questions = await prisma.question.findMany({
      where: { section },
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

ipcMain.handle('question:generateSolution', async (_event, questionId: number) => {
  try {
    const question = await prisma.question.findUnique({ where: { id: questionId }, include: { images: true } })
    if (!question) {
      throw new Error('Question not found')
    }
    if (question.solution) {
      return { success: true, solution: question.solution, predictedSection: undefined }
    }
    const imagePaths = question.images.map((image) => image.path)
    const { solution, predictedSection, subtopic, topic } = await setupGemini().requestSolution(question.section, imagePaths)
    const formattedSolution = solution ? solution.replace(/(?<!\n)\n(?!\n)/g, '\n\n') : solution

    const updateData: any = { solution: formattedSolution }
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
    const question = await prisma.question.findUnique({ where: { id: questionId }, include: { images: true } })
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
ipcMain.handle('study:save', async (_event, payload: StudyLogRequest) => {
  try {
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
        note: payload.note || ''
      }
    })
    return { success: true, studyLog: created }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})


ipcMain.handle('study:delete', async (_event, id: number) => {
  try {
    await prisma.studyLog.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('study:list', async () => {
  try {
    const records = await prisma.studyLog.findMany({ orderBy: { date: 'desc' } })
    return { success: true, records }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('app:getAnalytics', async () => {
  try {
    const allQuestions = await prisma.question.findMany({
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

    const studyLogs = await prisma.studyLog.findMany()
    let hoursAll = 0
    let hoursVarc = 0
    let hoursLrdi = 0
    let hoursQuants = 0

    for (const log of studyLogs) {
      const duration = log.hours + log.minutes / 60
      hoursAll += duration
      if (log.section === 'VARC') {
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
    return { success: true, path: getImagesDirectory() }
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

ipcMain.handle('report:list', async () => {
  try {
    const reports = await prisma.reportCard.findMany({
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
        qaRows: JSON.parse(r.qaRows)
      }))
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('report:save', async (_event, payload: any) => {
  try {
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
        qaRows: JSON.stringify(payload.qaRows)
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
        qaRows: JSON.stringify(payload.qaRows)
      }
    })
    return { success: true, report }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('report:delete', async (_event, id: string) => {
  try {
    await prisma.reportCard.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})
