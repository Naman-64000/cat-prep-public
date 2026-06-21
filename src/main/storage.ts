import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export function getAppDataPath() {
  return app.getPath('userData')
}

export function getImagesDirectory() {
  const dir = path.join(getAppDataPath(), 'images', 'questions')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export async function saveQuestionImage(imageBuffer: Buffer, fileName: string) {
  const safeName = `${Date.now()}-${fileName}`.replace(/\s+/g, '_')
  const directory = getImagesDirectory()
  const fullPath = path.join(directory, safeName)
  await fs.promises.writeFile(fullPath, imageBuffer)
  return fullPath
}
