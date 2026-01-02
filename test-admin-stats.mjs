/**
 * Test script to check /admin/stats endpoint
 */

const API_URL = 'http://localhost:4000/api'

async function testAdminStats() {
  try {
    console.log('Testing /admin/stats endpoint...')
    
    const response = await fetch(`${API_URL}/admin/stats`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    console.log('Status:', response.status)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testAdminStats()
