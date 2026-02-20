import type { Pool } from 'pg'

export interface Faq {
  id: string
  question: string
  answer: string
  category: string
  sort_order: number
}

export async function getActiveFaqs(pool: Pool): Promise<Faq[]> {
  const query = `
    SELECT
      id,
      question,
      answer,
      category,
      sort_order
    FROM app.faqs
    WHERE is_active = true
    ORDER BY sort_order ASC
  `

  const result = await pool.query(query)
  return result.rows
}
