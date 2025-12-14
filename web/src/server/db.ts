import { PrismaClient } from "@prisma/client"

declare global {
	var __prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
	return new PrismaClient({
		// Only log errors - verbose logging ("query", "warn") adds overhead
		log: ["error"],
	})
}

export const prisma = globalThis.__prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") {
	globalThis.__prisma = prisma
}
