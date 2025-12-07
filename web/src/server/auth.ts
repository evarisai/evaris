import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { Resend } from "resend"
import { prisma } from "./db"

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Email configuration
const EMAIL_FROM = process.env.EMAIL_FROM || "Evaris <roshan@evarisai.com>"

// Beautiful email template for verification
function getVerificationEmailHtml(userName: string, verificationUrl: string): string {
	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Logo placeholder -->
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                      <span style="color: white; font-weight: bold; font-size: 20px;">E</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b; line-height: 1.3;">
                Verify your email
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; color: #71717a; line-height: 1.6;">
                Hi ${userName || "there"},<br><br>
                Thanks for signing up for Evaris! Please click the button below to verify your email address.
              </p>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <a href="${verificationUrl}"
                       style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                This link will expire in 24 hours. If you didn't create an account with Evaris, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #f4f4f5;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #6366f1; word-break: break-all;">
                ${verificationUrl}
              </p>
            </td>
          </tr>

          <!-- Brand footer -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <p style="margin: 0; font-size: 12px; color: #d4d4d8; text-align: center;">
                Evaris - AI Evaluation Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// Password reset email template
function getPasswordResetEmailHtml(userName: string, resetUrl: string): string {
	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Logo placeholder -->
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                      <span style="color: white; font-weight: bold; font-size: 20px;">E</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b; line-height: 1.3;">
                Reset your password
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; color: #71717a; line-height: 1.6;">
                Hi ${userName || "there"},<br><br>
                We received a request to reset your password. Click the button below to create a new password.
              </p>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #f4f4f5;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #6366f1; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Brand footer -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <p style="margin: 0; font-size: 12px; color: #d4d4d8; text-align: center;">
                Evaris - AI Evaluation Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// Send email via Resend
async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
	if (!resend) {
		console.warn("[Email] Resend not configured. Set RESEND_API_KEY in .env")
		console.log("[Email] Would send to:", params.to)
		console.log("[Email] Subject:", params.subject)
		return
	}

	try {
		const result = await resend.emails.send({
			from: EMAIL_FROM,
			to: params.to,
			subject: params.subject,
			html: params.html,
		})

		if (result.error) {
			console.error("[Email] Failed to send:", result.error)
			throw new Error(result.error.message)
		}

		console.log("[Email] Sent successfully to:", params.to, "ID:", result.data?.id)
	} catch (error) {
		console.error("[Email] Error sending email:", error)
		throw error
	}
}

// Helper to generate a URL-safe slug from a name
function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.substring(0, 50)
}

// Helper to sleep for exponential backoff
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

// Helper to generate a unique slug suffix using random characters
function generateRandomSuffix(): string {
	return Math.random().toString(36).substring(2, 8)
}

// Helper to create organization with unique slug using transaction
// This handles race conditions by using database-level unique constraints
// Uses exponential backoff for retries to handle transient failures
async function createOrganizationWithUniqueSlug(
	userId: string,
	orgName: string,
	baseSlug: string,
	isPersonal = false,
	maxRetries = 5
): Promise<{
	organization: { id: string; name: string; slug: string; isPersonal: boolean }
	membership: { id: string }
}> {
	let lastError: Error | null = null

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		// Use random suffix instead of Date.now() to avoid millisecond collisions
		const slug = attempt === 0 ? baseSlug : `${baseSlug}-${generateRandomSuffix()}`

		// Exponential backoff: 0ms, 100ms, 400ms, 900ms, 1600ms
		if (attempt > 0) {
			await sleep(attempt * attempt * 100)
		}

		try {
			// Use transaction to ensure atomicity
			const result = await prisma.$transaction(async (tx) => {
				// Create organization
				const organization = await tx.organization.create({
					data: {
						name: orgName,
						slug,
						isPersonal,
					},
				})

				// Create membership in same transaction
				const membership = await tx.membership.create({
					data: {
						userId,
						organizationId: organization.id,
						role: "OWNER",
					},
				})

				return { organization, membership }
			})

			return result
		} catch (error: unknown) {
			lastError = error instanceof Error ? error : new Error(String(error))
			// Check if it's a unique constraint violation on slug
			const prismaError = error as { code?: string; meta?: { target?: string[] } }
			if (prismaError?.code === "P2002" && prismaError?.meta?.target?.includes("slug")) {
				// Retry with a different slug
				continue
			}
			// For other errors, throw immediately
			throw error
		}
	}

	throw lastError || new Error("Failed to create organization after max retries")
}

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
		autoSignIn: false, // Require email verification
		requireEmailVerification: true,
		// Password reset configuration
		sendResetPassword: async ({ user, url }) => {
			console.log(`[Password Reset] Sending to: ${user.email}`)

			const emailHtml = getPasswordResetEmailHtml(user.name, url)

			// Send email (non-blocking to prevent timing attacks)
			void sendEmail({
				to: user.email,
				subject: "Reset your password - Evaris",
				html: emailHtml,
			}).catch((err) => {
				console.error("[Password Reset] Failed to send:", err)
			})
		},
		// Token expiry for password reset (1 hour)
		resetPasswordTokenExpiresIn: 60 * 60,
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			console.log(`[Email Verification] Sending to: ${user.email}`)

			const emailHtml = getVerificationEmailHtml(user.name, url)

			// Send email (non-blocking to prevent timing attacks)
			void sendEmail({
				to: user.email,
				subject: "Verify your email - Evaris",
				html: emailHtml,
			}).catch((err) => {
				console.error("[Email Verification] Failed to send:", err)
			})
		},
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
		github: {
			clientId: process.env.GITHUB_CLIENT_ID as string,
			clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day - update session every day
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5, // 5 minutes
		},
	},
	trustedOrigins: [
		process.env.BETTER_AUTH_URL || "http://localhost:5173",
		"http://localhost:3000", // TanStack Start dev server
	],
	// Database hooks for user lifecycle events
	databaseHooks: {
		user: {
			create: {
				// Called after a new user is created (signup)
				after: async (user: { id: string; name: string; email: string }) => {
					// Generate organization details
					const baseSlug = generateSlug(user.name || user.email.split("@")[0])
					const orgName = `${user.name || "My"}'s Workspace`

					try {
						// Create organization and membership atomically with retry for slug conflicts
						// Mark as personal workspace so we can identify it later
						const { organization } = await createOrganizationWithUniqueSlug(
							user.id,
							orgName,
							baseSlug,
							true // isPersonal = true for signup-created workspaces
						)

						// Link the personal organization to the user record
						// This creates a direct reference for easy lookup and cascade delete
						await prisma.user.update({
							where: { id: user.id },
							data: { personalOrganizationId: organization.id },
						})

						console.log(
							`Created personal organization for user ${user.id}: ${organization.name} (${organization.slug})`
						)
					} catch (error) {
						// Log the error - this is critical but better-auth doesn't support
						// rolling back the user creation at this point
						console.error(
							"CRITICAL: Failed to create personal organization for user:",
							user.id,
							error
						)

						// The user will need to complete organization setup on first login
						// The context.ts handles this case by checking for missing organization
						// and the frontend can redirect to an onboarding flow
					}
				},
			},
		},
	},
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
