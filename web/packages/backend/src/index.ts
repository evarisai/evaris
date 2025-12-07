import { serve } from "@hono/node-server"
import { app } from "./app"

const port = parseInt(process.env.PORT || "4000", 10)

console.log(`Starting Evaris Backend API on port ${port}...`)

serve({
	fetch: app.fetch,
	port,
})

console.log(`Server running at http://localhost:${port}`)
