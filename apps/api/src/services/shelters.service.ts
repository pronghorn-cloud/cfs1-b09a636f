import type { Pool } from 'pg'

export interface FundedShelter {
  id: string
  shelter_name: string
  city: string
  zone_code: string
  zone_name: string
  service_type_code: string
  service_type_name: string
  bed_count: number | null
  unit_count: number | null
  is_active: boolean
}

export interface ShelterFilters {
  search?: string
  zone?: string
}

export async function getFundedShelters(
  pool: Pool,
  filters: ShelterFilters = {}
): Promise<FundedShelter[]> {
  const conditions: string[] = ['fs.is_active = TRUE']
  const params: any[] = []
  let paramIndex = 1

  if (filters.search) {
    conditions.push(`fs.shelter_name ILIKE $${paramIndex}`)
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  if (filters.zone) {
    conditions.push(`fs.zone_code = $${paramIndex}`)
    params.push(filters.zone)
    paramIndex++
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : ''

  // BR-005: funding_amount is intentionally excluded from the SELECT
  const query = `
    SELECT
      fs.id,
      fs.shelter_name,
      fs.city,
      fs.zone_code,
      z.name AS zone_name,
      fs.service_type_code,
      st.name AS service_type_name,
      fs.bed_count,
      fs.unit_count,
      fs.is_active
    FROM app.funded_shelters fs
    JOIN app.zones z ON z.code = fs.zone_code
    JOIN app.service_types st ON st.code = fs.service_type_code
    ${whereClause}
    ORDER BY fs.shelter_name ASC
  `

  const result = await pool.query(query, params)
  return result.rows
}

export async function getZones(pool: Pool): Promise<{ code: string; name: string }[]> {
  const result = await pool.query(
    'SELECT code, name FROM app.zones ORDER BY sort_order ASC'
  )
  return result.rows
}
