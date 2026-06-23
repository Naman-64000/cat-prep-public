import fs from 'fs'
import path from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'

let customGeminiKey = ''

export function setCustomGeminiKey(key: string) {
  customGeminiKey = key.trim()
}

export function getEffectiveGeminiKey() {
  return customGeminiKey || ''
}

export async function verifyGeminiKey(key: string): Promise<boolean> {
  if (!key.trim()) {
    throw new Error('API key is empty')
  }
  const genAI = new GoogleGenerativeAI(key.trim())
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  const result = await model.generateContent('Respond with "ok".')
  const text = result.response.text()
  return text.toLowerCase().includes('ok') || text.length > 0
}

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
const MODEL_FALLBACK_LIST = [
  DEFAULT_GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.5-pro',
  'gemini-pro-latest',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash'
]

function getPromptForSection(section: string) {
  const validationRule = `CRITICAL VALIDATION RULE: First, examine the uploaded image(s). If the image is completely non-academic or irrelevant to the CAT exam (for example, if it is a photo of a person, a painting, a landscape, a cartoon, or random objects), you MUST immediately halt and return exactly this sentence: "Please upload an image related to ${section}." and nothing else. Do not output any markdown formatting, explanation, or other text.
However, if the image contains an academic question or study material that belongs to a different section of the CAT exam (for example, a Quantitative Aptitude math problem or an LRDI logical puzzle uploaded in the VARC section), do NOT halt. Instead, solve it completely using the rules of its actual section, and classify it correctly at the end.`

  const base = `You are an expert CAT exam mentor analyzing a question.`
  const formattingRule = `FORMATTING RULE: Ensure there is a blank line (double newline) between every step, concept block, or list item in your output to ensure proper spacing.`

  switch (section) {
    case 'VARC':
      return `${validationRule}\n\n${base} This is a VARC (Verbal Ability and Reading Comprehension) question. Note that the provided image(s) may contain multiple questions related to the same passage or content. You MUST answer ALL the questions present in the image(s), maintaining their original order.\nAnalyze the provided question image(s) carefully.\nFor each question present, provide in order:\n1. Question Understanding\n2. Passage Analysis (if applicable)\n3. Option-wise Evaluation\n4. Elimination Strategy\n5. Correct Answer\n6. Detailed Explanation\nUse CAT-level reasoning. Explain why each incorrect option is wrong. Return markdown.\n\n${formattingRule}`
    case 'LRDI':
      return `${validationRule}\n\n${base} This is an LRDI (Logical Reasoning and Data Interpretation) question.\nSolve the LRDI set step by step.\nProvide:\n1. Problem Interpretation\n2. Given Data Extraction\n3. Table Creation\n4. Logical Deductions\n5. Intermediate Inferences\n6. Final Solution\nExplain every deduction clearly. Do not skip reasoning steps. Return markdown.\n\n${formattingRule}`
    case 'QUANTS':
      return `${validationRule}\n\n${base} This is a Quantitative Aptitude question.\nSolve the question step-by-step.\nProvide:\n1. Problem Understanding\n2. Relevant Concepts\n3. Formula Identification\n4. Detailed Calculation\n5. Final Answer\nAlso provide:\nAlternative Method (if available)\nShortcuts Used\nCommon Mistakes Students Make\nCAT Exam Strategy Notes\nUse proper mathematical formatting. Return markdown.\n\n${formattingRule}`
    default:
      return `${validationRule}\n\n${base} Provide a clear solution in markdown.\n\n${formattingRule}`
  }
}

export function setupGemini() {
  return {
    async requestSolution(section: string, imagePaths: string[], isRegenerate?: boolean) {
      const activeKey = getEffectiveGeminiKey()
      if (!activeKey) {
        throw new Error('Please enter a valid gemini key in Study Tracker page.')
      }
      if (!imagePaths.length) {
        throw new Error('No images provided for the question.')
      }

      const inputs: Array<string | { inlineData: { data: string; mimeType: string } }> = []
      let sectionPrompt = getPromptForSection(section)
      if (isRegenerate) {
        sectionPrompt += '\n\nI am asking this second time, please do it step by step and make no mistake.'
      }
      let classificationInstructions = `\n\nAt the very end of your response, append a single line in this exact format:\nSECTION_CHECK: VARC or LRDI or QUANTS\nOnly this line should contain the section classification.`

      if (section === 'QUANTS') {
        classificationInstructions += `\n\nAdditionally, identify the single most relevant subtopic and topic from the following taxonomy for this Quantitative Aptitude question:
- Arithmetic: Averages, Ratios & Proportions, Percentages, Mixtures and Alligations, Profit & Loss, Time, Speed & Distance, Time & Work, SI and CI, Not Sure
- Algebra: Linear & Quadratic Equations, Inequalities, Logarithms, Surds & Indices, Functions & Graphs, Polynomials, Not Sure
- Geometry: Lines & Angles, Triangles, Circles, Polygons, Quadrilaterals, Coordinate Geometry, Mensuration (2D & 3D), Not Sure
- Number System: Properties of Numbers, Divisibility, Factors, HCF & LCM, Remainders, Base System Conversions, Not Sure
- Modern Maths: Permutations & Combinations, Probability, Set Theory, Series and Progressions (AP, GP), Venn Diagrams, Not Sure

At the very end of your response, after SECTION_CHECK, append a single line in this exact format:
TOPIC_CHECK: <Subtopic> | <Topic>
Make sure to match the casing and spelling in the list above exactly. If you are not sure or if it doesn't fit any other category perfectly, use "Not Sure" as the Topic.`
      } else if (section === 'LRDI') {
        classificationInstructions += `\n\nAdditionally, identify the single most relevant subtopic and topic from the following taxonomy for this Logical Reasoning and Data Interpretation question:
- LR: Puzzles, Arrangements, Selection, Games & Tournaments, Conditional LRs, Coin Picking, Binary Logic, Truth and Lie, Case-based LRs, 2D and 3D LR, Not Sure
- DI: Tables based DI, Caselets, Quant based DI, Graphs, Charts, Networks and Diagrams, Routes and Networks, Mathematical Puzzle, Venn Diagram, Maxima-Minima, Not Sure

At the very end of your response, after SECTION_CHECK, append a single line in this exact format:
TOPIC_CHECK: <Subtopic> | <Topic>
Make sure to match the casing and spelling in the list above exactly. If you are not sure or if it doesn't fit any other category perfectly, use "Not Sure" as the Topic.`
      } else if (section === 'VARC') {
        classificationInstructions += `\n\nAdditionally, identify the single most relevant subtopic and topic from the following taxonomy for this VARC question:
- RC: Philosophy, Psychology, History, Arts and Museum, Society, Culture, Biology, Science and Technology, Not Sure
- VA: Para Summary, Para Jumbles, Para Completion (Fill in the Blank), Odd One Out (Out of the Context), Not Sure

At the very end of your response, after SECTION_CHECK, append a single line in this exact format:
TOPIC_CHECK: <Subtopic> | <Topic>
Make sure to match the casing and spelling in the list above exactly. If you are not sure or if it doesn't fit any other category perfectly, use "Not Sure" as the Topic.`
      }

      inputs.push(sectionPrompt + classificationInstructions)

      for (const imagePath of imagePaths) {
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Image file not found: ${imagePath}`)
        }

        const imageBuffer = fs.readFileSync(imagePath)
        const base64Image = imageBuffer.toString('base64')
        const ext = path.extname(imagePath).toLowerCase()
        let mediaType = 'image/jpeg'
        if (ext === '.png') mediaType = 'image/png'
        else if (ext === '.gif') mediaType = 'image/gif'
        else if (ext === '.webp') mediaType = 'image/webp'

        inputs.push({
          inlineData: {
            data: base64Image,
            mimeType: mediaType
          }
        })
      }
      const genAI = new GoogleGenerativeAI(activeKey)

      let lastError: Error | null = null
      for (const modelName of MODEL_FALLBACK_LIST) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName })

          const result = await model.generateContent(inputs)

          const fullText = result.response.text()
          if (!fullText) {
            throw new Error('No response text from Gemini API')
          }

          const lines = fullText.split('\n')
          let predictedSection: 'VARC' | 'LRDI' | 'QUANTS' | undefined
          let subtopic: string | undefined
          let topic: string | undefined
          const cleanedLines: string[] = []

          for (const line of lines) {
            const secMatch = line.match(/^\s*(?:\*\*)?SECTION_CHECK:\s*(?:\*\*)?\s*(VARC|LRDI|QUANTS)/i)
            const topMatch = line.match(/^\s*(?:\*\*)?TOPIC_CHECK:\s*(?:\*\*)?\s*([^|\n\r]+)\s*\|\s*([^\n\r]+)/i)
            if (secMatch) {
              predictedSection = secMatch[1].toUpperCase() as 'VARC' | 'LRDI' | 'QUANTS'
            } else if (topMatch) {
              subtopic = topMatch[1].trim()
              topic = topMatch[2].trim()
            } else {
              cleanedLines.push(line)
            }
          }
          const solution = cleanedLines.join('\n').trim()

          return { solution, predictedSection, subtopic, topic }
        } catch (error) {
          lastError = error as Error
          console.warn(`Model ${modelName} failed, trying next...`, (error as Error).message)
          continue
        }
      }

      throw new Error(`Gemini request failed: ${lastError?.message || 'All models failed'}`)
    }
  }
}

export function generateSolutionForQuestion(section: string) {
  return getPromptForSection(section)
}
