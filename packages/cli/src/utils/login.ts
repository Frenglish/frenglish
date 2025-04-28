import open from 'open'
import crypto from 'crypto'
import http from 'http'
import fetch from 'node-fetch'
import fs from 'fs'
import os from 'os'
import path from 'path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import yargs from 'yargs'
import { runGuidedTranslationFlow } from './interactiveFlow.js'
import { FRENGLISH_BACKEND_URL } from '@frenglish/utils'

const AUTH0_DOMAIN = 'dev-xvqfys11p21lwlfg.us.auth0.com'
const CLIENT_ID = 'gmLjaSy45MYeq6upHs54ArjRKB32zFzH'
const REDIRECT_URI = 'http://localhost:8787/callback'
const TOKEN_PATH = path.join(os.homedir(), '.frenglish', 'config.json')

function base64URLEncode(str: Buffer) {
  return str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest()
}

interface TokenData {
  access_token: string;
  id_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

export async function login() {
  const codeVerifier = base64URLEncode(crypto.randomBytes(32))
  const codeChallenge = base64URLEncode(sha256(Buffer.from(codeVerifier)))
  const audience = FRENGLISH_BACKEND_URL.includes('api.frenglish.ai') ? `https://api.frenglish.ai/` : `https://${AUTH0_DOMAIN}/api/v2/`

  // Add audience and scope parameters to the authorization URL
  const authUrl = `https://${AUTH0_DOMAIN}/authorize?` + new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email',
    audience,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  }).toString()

  console.log(chalk.blue('Opening browser for login...'))
  await open(authUrl)

  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith('/callback')) return

    const url = new URL(req.url, REDIRECT_URI)
    const code = url.searchParams.get('code')
    if (!code) {
      res.end('Login failed: missing code')
      return
    }

    try {
      console.log(chalk.blue('Exchanging code for token...'))
      const tokenRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          code_verifier: codeVerifier,
          code,
          redirect_uri: REDIRECT_URI,
          audience
        }),
      })

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text()
        console.error(chalk.red('Token exchange failed:'), {
          status: tokenRes.status,
          statusText: tokenRes.statusText,
          body: errorText
        })
        throw new Error(`Token exchange failed: ${tokenRes.status} ${tokenRes.statusText}`)
      }

      const responseText = await tokenRes.text()
      const tokenData = JSON.parse(responseText) as TokenData

      if (!tokenData.access_token) {
        throw new Error('Missing access token in response')
      }

      // Decode the access token to get the auth0Id
      const [, payloadB64] = tokenData.access_token.split('.')
      if (!payloadB64) {
        throw new Error('Invalid access token format')
      }

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
      const auth0Id = payload.sub.split('|')[1]

      // Extract email and name from ID token instead
      const [, idTokenPayloadB64] = tokenData.id_token.split('.')
      if (!idTokenPayloadB64) {
        throw new Error('Invalid ID token format')
      }
      const idTokenPayload = JSON.parse(Buffer.from(idTokenPayloadB64, 'base64').toString())
      const email = idTokenPayload.email
      const name = idTokenPayload.name

      if (!auth0Id) {
        throw new Error('No auth0Id found in token payload')
      }

      if (!fs.existsSync(path.dirname(TOKEN_PATH))) {
        fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true })
      }

      // Save token, auth0Id, email, and name
      fs.writeFileSync(TOKEN_PATH, JSON.stringify({
        ...tokenData,
        auth0Id,
        email,
        name
      }, null, 2))
      res.end('Login successful! You can close this window.')
      console.log(chalk.green('✅ Logged in successfully. Token saved.'))

      // Close the server before starting the guided flow
      server.close()

      const { guided } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'guided',
          message: 'Would you like to have a guided translation experience?',
          default: true,
        },
      ])

      if (guided) {
        await runGuidedTranslationFlow()
      } else {
        console.log(chalk.yellow('\nYou can explore available commands below:\n'))
        yargs.showHelp()
      }
    } catch (err) {
      console.error('Failed to exchange code for token:', err)
      res.end('Login failed')
    } finally {
      // Only close the server if it hasn't been closed yet
      if (server.listening) {
        server.close()
      }
    }
  })

  server.listen(8787)
}
