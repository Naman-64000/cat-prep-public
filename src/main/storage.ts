import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export function getAppDataPath() {
  return app.getPath('userData')
}

export function getImagesDirectory(userId: string) {
  const cleanUserId = userId.replace(/[^a-zA-Z0-9@._-]/g, '_')
  const dir = path.join(getAppDataPath(), 'images', cleanUserId, 'questions')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export async function saveQuestionImage(imageBuffer: Buffer, fileName: string, userId: string) {
  const safeName = `${Date.now()}-${fileName}`.replace(/\s+/g, '_')
  const directory = getImagesDirectory(userId)
  const fullPath = path.join(directory, safeName)
  await fs.promises.writeFile(fullPath, imageBuffer)
  return fullPath
}
