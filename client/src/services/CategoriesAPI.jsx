import { request } from '../utils/request'

// the group categories the database allows, for the interest dropdowns
const getCategories = () => request('/api/categories')

export default { getCategories }
