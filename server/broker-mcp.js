import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { filterHostels, loadAllHostels } from './hostels.js'

const server = new Server(
  { name: 'khammam-ai-room-broker', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_all_hostels',
      description: 'Search hostel and PG listings in Khammam by location, sharing, AC status, budget, or available beds.',
      inputSchema: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location text to match, such as Khammam Bus Stand' },
          sharing: { type: 'string', description: 'Sharing type to match, such as single, double, or triple' },
          ac_non_ac: { type: 'string', description: 'AC status to match, such as AC or Non-AC' },
          max_price: { type: 'number', description: 'Maximum monthly price in rupees' },
          min_available_beds: { type: 'number', description: 'Minimum number of available beds' },
        },
        additionalProperties: false,
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'search_all_hostels') {
    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
    }
  }

  try {
    const filters = request.params.arguments ?? {}
    const results = filterHostels(loadAllHostels(), filters)
    return {
      content: [{
        type: 'text',
        text: results.length
          ? JSON.stringify(results, null, 2)
          : 'No hostels match the provided filters.',
      }],
    }
  } catch (error) {
    console.error('Hostel MCP search failed:', error)
    return {
      isError: true,
      content: [{ type: 'text', text: 'Unable to read the hostel listings.' }],
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
