export const sections = ['VARC', 'LRDI', 'QUANTS'] as const
export const sectionLabels: Record<typeof sections[number], string> = {
  VARC: 'VARC',
  LRDI: 'LRDI',
  QUANTS: 'QUANTS'
}

export type SectionFilter = 'ALL' | 'SOLVED' | 'UNSOLVED' | 'BOOKMARKED' | 'FLAIR' | 'TOPIC'

export const SECTION_FLAIRS = {
  VARC: [
    'Inference',
    'Tone',
    'Main Idea',
    'Author Viewpoint',
    'Option Trap',
    'Vocabulary',
    'Overthinking',
    'Revision Needed',
    'Excellent Question',
    'Weak Area'
  ],
  LRDI: [
    'Could Not Start',
    'Wrong Inference',
    'Missed Constraint',
    'Representation Issue',
    'Pattern Missed',
    'Set Selection',
    'Revision Needed',
    'Excellent Question',
    'Weak Area'
  ],
  QUANTS: [
    'Formula Forgotten',
    'Concept Gap',
    'Calculation Error',
    'Question Misread',
    'Shortcut Missed',
    'Wrong Approach',
    'Revision Needed',
    'Excellent Question',
    'Weak Area'
  ]
} as const

export const QUANTS_TOPIC_MAP = {
  Arithmetic: [
    'Averages',
    'Ratios & Proportions',
    'Percentages',
    'Mixtures and Alligations',
    'Profit & Loss',
    'Time, Speed & Distance',
    'Time & Work',
    'SI and CI',
    'Not Sure'
  ],
  Algebra: [
    'Linear & Quadratic Equations',
    'Inequalities',
    'Logarithms',
    'Surds & Indices',
    'Functions & Graphs',
    'Polynomials',
    'Not Sure'
  ],
  Geometry: [
    'Lines & Angles',
    'Triangles',
    'Circles',
    'Polygons',
    'Quadrilaterals',
    'Coordinate Geometry',
    'Mensuration (2D & 3D)',
    'Not Sure'
  ],
  'Number System': [
    'Properties of Numbers',
    'Divisibility',
    'Factors',
    'HCF & LCM',
    'Remainders',
    'Base System Conversions',
    'Not Sure'
  ],
  'Modern Maths': [
    'Permutations & Combinations',
    'Probability',
    'Set Theory',
    'Series and Progressions (AP, GP)',
    'Venn Diagrams',
    'Not Sure'
  ]
} as const

export const LRDI_TOPIC_MAP = {
  LR: [
    'Puzzles',
    'Arrangements',
    'Selection',
    'Games & Tournaments',
    'Conditional LRs',
    'Coin Picking',
    'Binary Logic',
    'Truth and Lie',
    'Case-based LRs',
    '2D and 3D LR',
    'Not Sure'
  ],
  DI: [
    'Tables based DI',
    'Caselets',
    'Quant based DI',
    'Graphs',
    'Charts',
    'Networks and Diagrams',
    'Routes and Networks',
    'Mathematical Puzzle',
    'Venn Diagram',
    'Maxima-Minima',
    'Not Sure'
  ]
} as const

export const VARC_TOPIC_MAP = {
  RC: [
    'Philosophy',
    'Psychology',
    'History',
    'Arts and Museum',
    'Society',
    'Culture',
    'Biology',
    'Science and Technology',
    'Not Sure'
  ],
  VA: [
    'Para Summary',
    'Para Jumbles',
    'Para Completion (Fill in the Blank)',
    'Odd One Out (Out of the Context)',
    'Not Sure'
  ]
} as const

