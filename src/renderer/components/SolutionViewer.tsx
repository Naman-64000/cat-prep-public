import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'

type SolutionViewerProps = {
  solution: string
}

function preprocessLaTeX(text: string): string {
  if (!text) return ''
  // Standardize spacing: convert all single newlines to double newlines for readable step gaps
  let processed = text.replace(/(?<!\n)\n(?!\n)/g, '\n\n')
  // Replace \[ with $$ and \] with $$ safely
  processed = processed.replace(/\\\[/g, () => '$$').replace(/\\\]/g, () => '$$')
  // Replace \( with $ and \) with $ safely
  processed = processed.replace(/\\\(/g, () => '$').replace(/\\\)/g, () => '$')
  return processed
}

function SolutionViewer({ solution }: SolutionViewerProps) {
  const processedSolution = preprocessLaTeX(solution)

  const components = {
    p: ({ children }: any) => (
      <p className="mb-4 text-[16px] leading-relaxed text-appText-secondary font-normal">
        {children}
      </p>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-2xl font-bold mt-6 mb-3 text-appText-primary tracking-tight">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-xl font-bold mt-5 mb-2.5 text-appText-primary tracking-tight">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-lg font-bold mt-4 mb-2 text-appText-primary tracking-tight">
        {children}
      </h3>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc pl-6 mb-4 space-y-2 text-[16px] leading-relaxed text-appText-secondary">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-6 mb-4 space-y-2 text-[16px] leading-relaxed text-appText-secondary">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="pl-1 leading-relaxed">
        {children}
      </li>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-appText-primary">
        {children}
      </strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-appText-primary">
        {children}
      </em>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-sky-500/40 pl-4 py-1.5 my-4 italic text-appText-muted bg-appBg-secondary/65 rounded-r">
        {children}
      </blockquote>
    ),
    code: ({ children }: any) => (
      <code className="px-1.5 py-0.5 rounded bg-appBg-secondary font-mono text-sm text-appText-primary border border-appBorder">
        {children}
      </code>
    )
  }

  return (
    <div className="rounded-xl border border-appBorder bg-cardBg-default p-6 md:p-8 shadow-sm transition-all duration-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm as any, remarkMath as any]}
        rehypePlugins={[rehypeKatex as any]}
        components={components as any}
        className="max-w-none break-words"
      >
        {processedSolution}
      </ReactMarkdown>
    </div>
  )
}

export default SolutionViewer
