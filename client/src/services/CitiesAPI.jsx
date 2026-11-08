import { request } from '../utils/request'

// the cities that have venues, for the city dropdowns
const getCities = () => request('/api/cities')

export default { getCities }
