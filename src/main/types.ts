export type QuestionCreateRequest = {
  section: 'VARC' | 'LRDI' | 'QUANTS'
  imageFiles: Array<{ fileName: string; imageBuffer: Uint8Array }>
}

export type QuestionAddImagesRequest = {
  questionId: number
  imageFiles: Array<{ fileName: string; imageBuffer: Uint8Array }>
}

export type QuestionResponse = {
  id: number
  section: string
  imagePaths: string[]
  solution: string | null
  generationCount: number
  bookmarked: boolean
  createdAt: string
  updatedAt: string
}

export type SectionFilter = 'ALL' | 'SOLVED' | 'UNSOLVED' | 'BOOKMARKED'

export type StudyLogRequest = {
  date: string
  hours: number
  minutes: number
  section: string
  tag: string
  note: string
}

