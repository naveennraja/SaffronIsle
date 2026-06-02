const fs = require('fs')
const path = require('path')

const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID')
const serverAppPath = path.join(process.cwd(), '.next', 'server', 'app')

if (!fs.existsSync(buildIdPath)) {
  console.error(`
Cannot start — no production build found.

  npm run build    # create .next first
  npm start        # then start production server

For local development, use:

  npm run dev
`)
  process.exit(1)
}

if (!fs.existsSync(serverAppPath)) {
  console.error(`
Cannot start — .next folder looks incomplete or was built for dev only.

  npm run clean
  npm run build
  npm start
`)
  process.exit(1)
}
